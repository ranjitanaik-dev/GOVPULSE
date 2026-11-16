"""
GovPulse — Phase 3.2 Legacy Migration Integration & Concurrency Test Suite
--------------------------------------------------------------------------
Comprehensive, isolated tests validating:
1. Anti-resurrection heartbeat and resume guards
2. Staged exclusive SQLite reservation gate
3. Real concurrent thread contention with independent SQLAlchemy sessions & Barrier
4. Generation-safe reconciliation (delayed attempt 2 cannot downgrade attempt 3)
5. Atomic SQLite finalization rollback on lock failure
6. Spark committed-attempt filtering and type validation
All tests run against isolated test databases and synthetic dataset IDs (9001, 9002).
"""

import datetime
from concurrent.futures import ThreadPoolExecutor
import os
import threading
import uuid
import pytest
from pyspark.sql import functions as F
from sqlalchemy import create_engine, select, update, delete
from sqlalchemy.orm import sessionmaker

from app.database.mongodb import get_mongo_db
from app.models.models import Base, Dataset, MigrationReservation, Scheme
from app.services.legacy_migration_service import (
    FencedWorkerError,
    stage_sqlite_reservation,
    cancel_sqlite_reservation,
    atomic_finalize_sqlite_ownership,
    heartbeat_migration_worker,
    resume_unexpired_migration,
    execute_mongodb_reclamation_cas,
    bootstrap_legacy_migration,
    reclaim_expired_migration,
    reconcile_interrupted_migration,
    utc_now,
)
from spark_jobs.ingestion import (
    load_committed_raw_dataset,
    _load_committed_raw_dataset_impl,
)
from spark_jobs.spark_session import get_spark_session

TEST_DATASET_ID = 9001
TEST_DATASET_ID_2 = 9002
TEST_DB_NAME = "govpulse_test_migration_db"
TEST_SQLITE_PATH = "data/test_migration.db"
TEST_SQLITE_URL = f"sqlite:///{TEST_SQLITE_PATH}"


@pytest.fixture(scope="module")
def isolated_test_env():
    """Sets up an isolated SQLite database and MongoDB test database."""
    # SQLite setup
    if os.path.exists(TEST_SQLITE_PATH):
        try:
            os.remove(TEST_SQLITE_PATH)
        except OSError:
            pass

    engine = create_engine(TEST_SQLITE_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    SessionTesting = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    # Seed test schemes and synthetic datasets
    with SessionTesting() as session:
        scheme = Scheme(id="test_scheme", name="Test Scheme")
        session.merge(scheme)

        # Stage synthetic raw CSV file for parser
        os.makedirs("data/test_raw", exist_ok=True)
        raw_csv_path = "data/test_raw/test_mgnrega.csv"
        with open(raw_csv_path, "w", encoding="utf-8-sig") as f:
            f.write("fin_year,month,state_code,state_name,district_code,district_name\n")
            for i in range(1, 26):
                f.write(f"2025-2026,04,29,KARNATAKA,500,DISTRICT_{i}\n")

        ds1 = Dataset(
            id=TEST_DATASET_ID,
            scheme_id="mgnrega",
            file_name="test_mgnrega.csv",
            file_path=raw_csv_path,
            file_size_bytes=os.path.getsize(raw_csv_path),
            file_format="csv",
            reporting_year="2025-2026",
            status="processed",
            version=1,
            attempt_number=1,
            lease_id=None,
        )
        ds2 = Dataset(
            id=TEST_DATASET_ID_2,
            scheme_id="mgnrega",
            file_name="test_mgnrega.csv",
            file_path=raw_csv_path,
            file_size_bytes=os.path.getsize(raw_csv_path),
            file_format="csv",
            reporting_year="2025-2026",
            status="processed",
            version=2,
            attempt_number=1,
            lease_id=None,
        )
        session.merge(ds1)
        session.merge(ds2)
        session.commit()

    # MongoDB test DB setup
    prod_mongo = get_mongo_db()
    test_mongo = prod_mongo.client[TEST_DB_NAME]
    test_mongo.dataset_catalog.delete_many({"dataset_id": {"$in": [TEST_DATASET_ID, TEST_DATASET_ID_2]}})
    test_mongo.raw_records.delete_many({"dataset_id": {"$in": [TEST_DATASET_ID, TEST_DATASET_ID_2]}})

    yield {
        "engine": engine,
        "Session": SessionTesting,
        "mongo_db": test_mongo,
    }

    # Cleanup test artifacts
    test_mongo.dataset_catalog.delete_many({"dataset_id": {"$in": [TEST_DATASET_ID, TEST_DATASET_ID_2]}})
    test_mongo.raw_records.delete_many({"dataset_id": {"$in": [TEST_DATASET_ID, TEST_DATASET_ID_2]}})


@pytest.fixture(autouse=True)
def clean_test_reservations(isolated_test_env):
    Session = isolated_test_env["Session"]
    with Session() as session:
        session.execute(delete(MigrationReservation).where(MigrationReservation.dataset_id.in_([TEST_DATASET_ID, TEST_DATASET_ID_2])))
        session.commit()
    yield
    with Session() as session:
        session.execute(delete(MigrationReservation).where(MigrationReservation.dataset_id.in_([TEST_DATASET_ID, TEST_DATASET_ID_2])))
        session.commit()


# ---------------------------------------------------------------------------
# Test 1: Anti-Resurrection Heartbeat & Resume Guards
# ---------------------------------------------------------------------------

def test_expired_worker_heartbeat_rejected(isolated_test_env):
    """Verifies that an expired worker's heartbeat is rejected by heartbeat_migration_worker."""
    Session = isolated_test_env["Session"]
    mongo_db = isolated_test_env["mongo_db"]

    # Stage catalog document with expired heartbeat (130s ago)
    stale_time = utc_now() - datetime.timedelta(seconds=130)
    mongo_db.dataset_catalog.update_one(
        {"dataset_id": TEST_DATASET_ID},
        {"$set": {
            "attempt_number": 1,
            "committed_lease_id": "tok-expired",
            "status": "INGESTING",
            "lease": {"last_heartbeat_at": stale_time},
        }},
        upsert=True,
    )

    with Session() as session:
        with pytest.raises(FencedWorkerError, match="lease expired or superseded"):
            heartbeat_migration_worker(
                db=session,
                mongo_db=mongo_db,
                dataset_id=TEST_DATASET_ID,
                attempt_number=1,
                worker_lease_token="tok-expired",
            )


def test_expired_worker_cannot_resume_with_old_token(isolated_test_env):
    """Verifies that resume_unexpired_migration raises FencedWorkerError on expired token."""
    Session = isolated_test_env["Session"]
    mongo_db = isolated_test_env["mongo_db"]

    with Session() as session:
        with pytest.raises(FencedWorkerError, match="has expired"):
            resume_unexpired_migration(
                db=session,
                mongo_db=mongo_db,
                dataset_id=TEST_DATASET_ID,
                attempt_number=1,
                worker_lease_token="tok-expired",
            )


# ---------------------------------------------------------------------------
# Test 2: Active Worker Cannot Be Reclaimed
# ---------------------------------------------------------------------------

def test_active_worker_cannot_be_reclaimed(isolated_test_env):
    """Verifies that execute_mongodb_reclamation_cas returns None when heartbeat is active (<120s)."""
    mongo_db = isolated_test_env["mongo_db"]

    # Active heartbeat (20s ago)
    active_time = utc_now() - datetime.timedelta(seconds=20)
    mongo_db.dataset_catalog.update_one(
        {"dataset_id": TEST_DATASET_ID},
        {"$set": {
            "attempt_number": 1,
            "committed_lease_id": "tok-active",
            "status": "INGESTING",
            "lease": {"last_heartbeat_at": active_time},
        }},
        upsert=True,
    )

    cas_res = execute_mongodb_reclamation_cas(
        mongo_db=mongo_db,
        dataset_id=TEST_DATASET_ID,
        obs_attempt=1,
        obs_lease="tok-active",
        candidate_attempt=2,
        candidate_token="tok-intruder",
        reservation_id="res-intruder",
        worker_id="intruder-1",
    )
    assert cas_res is None  # CAS blocked by unexpired heartbeat!


# ---------------------------------------------------------------------------
# Test 3: Concurrent SQLite Reservation Gate Contention (Barrier)
# ---------------------------------------------------------------------------

def test_concurrent_reservation_gate_contention(isolated_test_env):
    """
    Two workers contend at the SQLite reservation gate using independent sessions and a Barrier.
    Verifies exactly one worker acquires the reservation; the other is rejected immediately.
    """
    Session = isolated_test_env["Session"]
    barrier = threading.Barrier(2)

    def worker_flow(worker_id):
        with Session() as session:
            barrier.wait(timeout=5)  # Synchronize threads at the gate
            try:
                res = stage_sqlite_reservation(
                    session, TEST_DATASET_ID, candidate_attempt=2, candidate_token=f"tok-{worker_id}", worker_id=worker_id, ttl_seconds=30
                )
                return {"status": "SUCCESS", "res_id": res["reservation_id"]}
            except FencedWorkerError:
                return {"status": "REJECTED"}

    with ThreadPoolExecutor(max_workers=2) as executor:
        f1 = executor.submit(worker_flow, "worker-1")
        f2 = executor.submit(worker_flow, "worker-2")
        r1, r2 = f1.result(timeout=10), f2.result(timeout=10)

    statuses = sorted([r1["status"], r2["status"]])
    assert statuses == ["REJECTED", "SUCCESS"]


# ---------------------------------------------------------------------------
# Test 4: Generation-Safe Delayed Reconciliation
# ---------------------------------------------------------------------------

def test_delayed_reconciliation_cannot_downgrade_attempt_3(isolated_test_env):
    """
    Test delayed reconciliation using production service functions:
    1. Worker A acquires reservation res-A for attempt 2.
    2. Worker A updates MongoDB catalog to attempt 2 (res-A), then dies before SQLite finalization.
    3. Worker B reclaims dataset, advances MongoDB to attempt 3 (res-B), finalizes SQLite to attempt 3.
    4. Delayed reconciliation for Worker A runs with res-A.
    5. Asserts:
       a) reconcile_interrupted_migration returns STALE_RESERVATION_DISCARDED.
       b) SQLite Dataset attempt_number remains 3 with Worker B's token.
       c) Stale reservation res-A is deleted without altering Dataset attempt 3.
    """
    Session = isolated_test_env["Session"]
    mongo_db = isolated_test_env["mongo_db"]

    with Session() as session:
        # Worker A creates reservation res-A in SQLite
        res_A = stage_sqlite_reservation(
            session, TEST_DATASET_ID, candidate_attempt=2, candidate_token="tok-A", worker_id="worker-A", ttl_seconds=30
        )
        res_A_id = res_A["reservation_id"]

    # Worker A updates MongoDB catalog to attempt 2
    mongo_db.dataset_catalog.update_one(
        {"dataset_id": TEST_DATASET_ID},
        {"$set": {
            "attempt_number": 2,
            "committed_lease_id": "tok-A",
            "migration_reservation_id": res_A_id,
            "status": "INGESTING",
            "lease": {"last_heartbeat_at": utc_now() - datetime.timedelta(seconds=130)},
        }},
        upsert=True,
    )

    # Worker B reclaims and advances MongoDB to attempt 3 with res-B
    res_B_id = str(uuid.uuid4())
    mongo_db.dataset_catalog.update_one(
        {"dataset_id": TEST_DATASET_ID},
        {"$set": {
            "attempt_number": 3,
            "committed_lease_id": "tok-B",
            "migration_reservation_id": res_B_id,
            "status": "INGESTING",
            "lease": {"last_heartbeat_at": utc_now()},
        }},
    )
    with Session() as session:
        # Worker B finalized SQLite to attempt 3
        session.execute(
            update(Dataset).where(Dataset.id == TEST_DATASET_ID).values(
                attempt_number=3, lease_id="tok-B", lease_expires_at=utc_now() + datetime.timedelta(seconds=120)
            )
        )
        session.commit()

    # Delayed reconciliation runs for Worker A (res_A_id)
    with Session() as session:
        rec_res = reconcile_interrupted_migration(session, mongo_db, TEST_DATASET_ID, target_res_id=res_A_id)
        assert rec_res["status"] == "STALE_RESERVATION_DISCARDED"

        # Verify SQLite Dataset attempt_number remains 3
        ds = session.get(Dataset, TEST_DATASET_ID)
        assert ds.attempt_number == 3
        assert ds.lease_id == "tok-B"

        # Verify res-A is cleaned up
        res_check = session.execute(
            select(MigrationReservation).where(MigrationReservation.dataset_id == TEST_DATASET_ID)
        ).scalar_one_or_none()
        assert res_check is None or res_check.reservation_id != res_A_id


# ---------------------------------------------------------------------------
# Test 5: Atomic SQLite Finalization Rollback on Lock Failure
# ---------------------------------------------------------------------------

def test_atomic_sqlite_finalization_rollback(isolated_test_env):
    """
    Verifies that if reservation release fails (e.g. lock_owner_token mismatch),
    the entire transaction is rolled back and the Dataset update is NOT committed.
    """
    Session = isolated_test_env["Session"]

    with Session() as session:
        # Create a valid reservation
        res_info = stage_sqlite_reservation(
            session, TEST_DATASET_ID_2, candidate_attempt=5, candidate_token="tok-test5", worker_id="worker-w5"
        )
        res_id = res_info["reservation_id"]
        valid_token = res_info["lock_owner_token"]

        # Attempt finalization with an INVALID lock_owner_token
        with pytest.raises(FencedWorkerError, match="Lock release affected 0 rows"):
            atomic_finalize_sqlite_ownership(
                db=session,
                dataset_id=TEST_DATASET_ID_2,
                reservation_id=res_id,
                lock_owner_token="lck-invalid-token",  # WRONG LOCK TOKEN!
                candidate_attempt=5,
                candidate_token="tok-test5",
                worker_id="worker-w5",
                source_columns=["col1", "col2"],
            )

        # Verify that Dataset was NOT updated (rolled back)
        ds = session.get(Dataset, TEST_DATASET_ID_2)
        assert ds.attempt_number != 5
        assert ds.lease_id != "tok-test5"


# ---------------------------------------------------------------------------
# Test 6: Spark Committed-Attempt Reader Filtering & Type Validation
# ---------------------------------------------------------------------------

def test_spark_reads_only_committed_attempt(isolated_test_env):
    """Verifies that _load_committed_raw_dataset_impl returns strictly committed attempt records."""
    mongo_db = isolated_test_env["mongo_db"]
    spark = get_spark_session("test_spark_committed_filtering")

    # Stage Attempt 1: 10 records (abandoned)
    for i in range(10):
        mongo_db.raw_records.update_one(
            {"dataset_id": TEST_DATASET_ID, "attempt_number": 1, "row_index": i},
            {"$set": {"lease_id": "tok-att1", "raw_data": {"val": f"att1_{i}"}, "row_type": "DATA"}},
            upsert=True,
        )

    # Stage Attempt 2: 25 records (committed)
    for i in range(25):
        mongo_db.raw_records.update_one(
            {"dataset_id": TEST_DATASET_ID, "attempt_number": 2, "row_index": i},
            {"$set": {"lease_id": "tok-att2", "raw_data": {"val": f"att2_{i}"}, "row_type": "DATA"}},
            upsert=True,
        )

    # Catalog points strictly to attempt 2
    mongo_db.dataset_catalog.update_one(
        {"dataset_id": TEST_DATASET_ID},
        {"$set": {
            "status": "INGESTED",
            "attempt_number": 2,
            "committed_lease_id": "tok-att2",
            "raw_ingestion": {"status": "VERIFIED_COMPLETE"},
        }},
        upsert=True,
    )

    df = _load_committed_raw_dataset_impl(
        spark=spark,
        dataset_id=TEST_DATASET_ID,
        mongo_uri="mongodb://127.0.0.1:27017",
        database=TEST_DB_NAME,
    )

    assert df.count() == 25
    assert df.filter(F.col("attempt_number") == 1).count() == 0


def test_spark_entrypoint_validations(isolated_test_env):
    """Verifies status and type validations in _load_committed_raw_dataset_impl."""
    mongo_db = isolated_test_env["mongo_db"]
    spark = get_spark_session("test_spark_validations")

    # 1. Rejects status == 'INGESTING'
    mongo_db.dataset_catalog.update_one(
        {"dataset_id": TEST_DATASET_ID},
        {"$set": {"status": "INGESTING"}},
    )
    with pytest.raises(ValueError, match="currently INGESTING"):
        _load_committed_raw_dataset_impl(spark, TEST_DATASET_ID, "mongodb://127.0.0.1:27017", TEST_DB_NAME)

    # 2. Rejects boolean attempt_number (e.g. True)
    mongo_db.dataset_catalog.update_one(
        {"dataset_id": TEST_DATASET_ID},
        {"$set": {
            "status": "INGESTED",
            "attempt_number": True,  # INVALID BOOL!
            "committed_lease_id": "tok-att2",
            "raw_ingestion": {"status": "VERIFIED_COMPLETE"},
        }},
    )
    with pytest.raises(ValueError, match="invalid committed attempt_number.*bool"):
        _load_committed_raw_dataset_impl(spark, TEST_DATASET_ID, "mongodb://127.0.0.1:27017", TEST_DB_NAME)

    # 3. Rejects missing committed_lease_id
    mongo_db.dataset_catalog.update_one(
        {"dataset_id": TEST_DATASET_ID},
        {"$set": {
            "status": "INGESTED",
            "attempt_number": 2,
            "committed_lease_id": None,  # MISSING LEASE!
            "raw_ingestion": {"status": "VERIFIED_COMPLETE"},
        }},
    )
    with pytest.raises(ValueError, match="missing or invalid committed_lease_id"):
        _load_committed_raw_dataset_impl(spark, TEST_DATASET_ID, "mongodb://127.0.0.1:27017", TEST_DB_NAME)
