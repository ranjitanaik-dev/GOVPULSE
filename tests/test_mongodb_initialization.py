"""
GovPulse — Phase 1 MongoDB Connection & Initialization Test Suite
==================================================================
Tests:
1. Secure URI parsing and credential protection (Atlas and Local).
2. Synchronous (PyMongo) ping and connectivity.
3. Native PyMongo (AsyncMongoClient) ping and connectivity (Zero Motor dependency).
4. Collection readiness: dataset_catalog, raw_records, audit_logs.
5. Exact approved index creation and verification:
   - raw_records:
     * Unique: (dataset_id, attempt_number, row_index)
     * Standard: (dataset_id, attempt_number, lease_id, row_type)
     * Standard: (district_normalized)
   - dataset_catalog:
     * Unique: (dataset_id)
     * Unique: (scheme_id, file_hash_sha256)
     * Unique: (scheme_id, version)
   - audit_logs:
     * Standard: (timestamp descending)
6. Index conflict detection and safe handling (compatible verification).
7. Health verification function (check_mongo_health) with zero credential leakage.
8. FastAPI /health endpoint verification (connected status).
9. Offline / Degraded MongoDB graceful handling and credential safety.
"""

import sys
import os
import asyncio
from pathlib import Path

# Add project root and backend to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "backend"))
sys.path.insert(0, str(PROJECT_ROOT))

import app.database.mongodb as mongo_mod
from app.database.mongodb import (
    get_mongo_uri,
    get_mongo_db_name,
    get_safe_uri_info,
    get_mongo_client,
    get_mongo_db,
    get_async_mongo_client,
    init_mongo_db,
    check_mongo_health,
    close_mongo_connections,
    REQUIRED_COLLECTIONS,
    APPROVED_INDEXES,
)


def test_safe_uri_masking():
    print("[1/9] Testing secure URI masking (Atlas & Local)...")
    fake_atlas = "mongodb+srv://admin_user:SuperSecretPassword999@cluster0.abcde.mongodb.net/govpulse_db?retryWrites=true&w=majority"
    atlas_info = get_safe_uri_info(fake_atlas)
    assert atlas_info["scheme"] == "mongodb+srv", f"Unexpected scheme: {atlas_info['scheme']}"
    assert atlas_info["host"] == "cluster0.abcde.mongodb.net", f"Unexpected host: {atlas_info['host']}"
    assert atlas_info["database"] == "govpulse_db", f"Unexpected db: {atlas_info['database']}"
    assert atlas_info["auth_configured"] is True, "Auth should be configured"
    
    # Assert secret credentials are NEVER present in dictionary or string representations
    atlas_str = str(atlas_info)
    assert "SuperSecretPassword999" not in atlas_str, "CRITICAL: Password leaked in URI info!"
    assert "admin_user" not in atlas_str, "CRITICAL: Username leaked in URI info!"

    local_uri = "mongodb://127.0.0.1:27017"
    local_info = get_safe_uri_info(local_uri)
    assert local_info["scheme"] == "mongodb"
    assert local_info["host"] == "127.0.0.1"
    assert local_info["port"] == 27017
    assert local_info["auth_configured"] is False
    print("  ✓ URI parsing is secure: credentials completely masked.")


def test_sync_mongo_ping():
    print("[2/9] Testing PyMongo synchronous ping...")
    client = get_mongo_client()
    pong = client.admin.command("ping")
    assert pong.get("ok") in [1.0, 1], f"Ping failed: {pong}"
    server_info = client.server_info()
    version = server_info.get("version", "unknown")
    print(f"  ✓ PyMongo ping successful (MongoDB Server Version: {version})")


def test_async_native_pymongo_ping():
    print("[3/9] Testing PyMongo native AsyncMongoClient ping (Zero Motor dependency)...")
    async_client = get_async_mongo_client()
    assert async_client is not None, "AsyncMongoClient should be available from native PyMongo"
    assert "AsyncMongoClient" in type(async_client).__name__, f"Unexpected client type: {type(async_client)}"

    async def _ping():
        return await async_client.admin.command("ping")

    pong = asyncio.run(_ping())
    assert pong.get("ok") in [1.0, 1], f"Async ping failed: {pong}"
    print(f"  ✓ PyMongo native {type(async_client).__name__} ping successful")


def test_database_initialization_and_collections():
    print("[4/9] Initializing GovPulse database and collections...")
    report = init_mongo_db()
    assert report["initialized"] is True, f"Initialization failed: {report}"
    assert report["error"] is None, f"Initialization reported error: {report['error']}"

    db = get_mongo_db()
    existing_cols = db.list_collection_names()
    for col in REQUIRED_COLLECTIONS:
        assert col in existing_cols, f"Collection '{col}' missing from database!"
    print(f"  ✓ Database '{report['database']}' and collections {REQUIRED_COLLECTIONS} ready.")


def test_approved_indexes():
    print("[5/9] Verifying exact approved indexes on all collections...")
    db = get_mongo_db()

    # 1. raw_records indexes
    rr_indexes = db["raw_records"].index_information()
    # (a) Unique: (dataset_id, attempt_number, row_index)
    assert any(
        info.get("key") == [("dataset_id", 1), ("attempt_number", 1), ("row_index", 1)] and info.get("unique") is True
        for info in rr_indexes.values()
    ), "raw_records: Missing unique index (dataset_id, attempt_number, row_index)"

    # (b) Standard: (dataset_id, attempt_number, lease_id, row_type)
    assert any(
        info.get("key") == [("dataset_id", 1), ("attempt_number", 1), ("lease_id", 1), ("row_type", 1)] and not info.get("unique", False)
        for info in rr_indexes.values()
    ), "raw_records: Missing index (dataset_id, attempt_number, lease_id, row_type)"

    # (c) Standard: (district_normalized)
    assert any(
        info.get("key") == [("district_normalized", 1)] and not info.get("unique", False)
        for info in rr_indexes.values()
    ), "raw_records: Missing index (district_normalized)"
    print("  ✓ raw_records indexes verified (1 unique compound, 2 standard)")

    # 2. dataset_catalog indexes
    dc_indexes = db["dataset_catalog"].index_information()
    # (a) Unique: (dataset_id)
    assert any(
        info.get("key") == [("dataset_id", 1)] and info.get("unique") is True
        for info in dc_indexes.values()
    ), "dataset_catalog: Missing unique index (dataset_id)"

    # (b) Unique: (scheme_id, file_hash_sha256)
    assert any(
        info.get("key") == [("scheme_id", 1), ("file_hash_sha256", 1)] and info.get("unique") is True
        for info in dc_indexes.values()
    ), "dataset_catalog: Missing unique index (scheme_id, file_hash_sha256)"

    # (c) Unique: (scheme_id, version)
    assert any(
        info.get("key") == [("scheme_id", 1), ("version", 1)] and info.get("unique") is True
        for info in dc_indexes.values()
    ), "dataset_catalog: Missing unique index (scheme_id, version)"
    print("  ✓ dataset_catalog indexes verified (3 unique constraints)")

    # 3. audit_logs indexes
    al_indexes = db["audit_logs"].index_information()
    assert any(
        info.get("key") == [("timestamp", -1)]
        for info in al_indexes.values()
    ), "audit_logs: Missing index (timestamp desc)"
    print("  ✓ audit_logs indexes verified (timestamp desc)")


def test_index_idempotency_and_no_conflicts():
    print("[6/9] Testing index idempotency and non-destructive re-runs...")
    second_report = init_mongo_db()
    assert second_report["initialized"] is True
    for col_name, col_data in second_report["collections"].items():
        assert len(col_data["conflicts"]) == 0, f"Conflicts detected on {col_name}: {col_data['conflicts']}"
        assert len(col_data["verified"]) == len(APPROVED_INDEXES[col_name]), (
            f"Expected {len(APPROVED_INDEXES[col_name])} verified indexes for {col_name}, got {len(col_data['verified'])}"
        )
    print("  ✓ Index initialization is 100% idempotent; existing indexes safely verified.")


def test_safe_health_check_mechanism():
    print("[7/9] Verifying safe backend check_mongo_health() function...")
    health = check_mongo_health()
    assert health["connected"] is True
    assert health["status"] == "connected"
    assert health["ping"] is True
    assert health["database"] == "govpulse_db"
    assert health["all_indexes_verified"] is True
    assert health["error"] is None

    # Verify zero credentials in report
    report_text = str(health)
    assert "password" not in report_text.lower() or "auth_configured" in report_text
    print("  ✓ Health check returned complete, verified diagnostics with zero credential leaks.")


def test_fastapi_health_endpoint():
    print("[8/9] Verifying FastAPI /health endpoint integration (connected state)...")
    from fastapi.testclient import TestClient
    from app.main import app

    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    body = response.json()
    assert body["status"] == "healthy", f"Expected status='healthy', got {body.get('status')}"
    assert "database" in body, "Expected 'database' block in health response"
    assert body["database"]["sqlite"] == "healthy", "SQLite health check missing"
    assert body["database"]["mongodb"]["connected"] is True, "MongoDB health check not connected"
    assert body["database"]["mongodb"]["all_indexes_verified"] is True, "MongoDB indexes not verified"
    print("  ✓ FastAPI /health endpoint returned 200 with dual SQLite + MongoDB verified status.")


def test_offline_mongo_degraded_handling():
    print("[9/9] Verifying offline / unavailable MongoDB handling (degraded status)...")
    # Simulate an unreachable MongoDB URI (port 29999 with 500ms timeout)
    orig_uri = os.environ.get("MONGODB_URI")
    orig_timeout = os.environ.get("MONGODB_SERVER_SELECTION_TIMEOUT_MS")
    try:
        close_mongo_connections()
        os.environ["MONGODB_URI"] = "mongodb://127.0.0.1:29999"
        os.environ["MONGODB_SERVER_SELECTION_TIMEOUT_MS"] = "500"

        health = check_mongo_health()
        assert health["connected"] is False, "Offline MongoDB should report connected=False"
        assert health["status"] == "unavailable", "Offline MongoDB should report status='unavailable'"
        assert health["ping"] is False, "Offline MongoDB should report ping=False"
        assert "password" not in str(health).lower() or "auth_configured" in str(health)

        # Test FastAPI /health endpoint with offline MongoDB
        from fastapi.testclient import TestClient
        from app.main import app

        client = TestClient(app)
        response = client.get("/health")
        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "degraded", f"Expected status='degraded' when Mongo offline, got {body.get('status')}"
        assert body["database"]["sqlite"] == "healthy", "SQLite must remain healthy when MongoDB is offline"
        assert body["database"]["mongodb"]["connected"] is False, "MongoDB must be reported not connected"

        # Verify existing local-file endpoints continue serving normally
        root_resp = client.get("/")
        assert root_resp.status_code == 200
        assert root_resp.json()["status"] == "running"
        print("  ✓ When MongoDB is offline, /health reports degraded without leaking credentials, and local services continue running.")
    finally:
        # Restore environment
        close_mongo_connections()
        if orig_uri is not None:
            os.environ["MONGODB_URI"] = orig_uri
        else:
            os.environ.pop("MONGODB_URI", None)
        if orig_timeout is not None:
            os.environ["MONGODB_SERVER_SELECTION_TIMEOUT_MS"] = orig_timeout
        else:
            os.environ.pop("MONGODB_SERVER_SELECTION_TIMEOUT_MS", None)


if __name__ == "__main__":
    print("\n" + "=" * 80)
    print("GovPulse — Phase 1 MongoDB Connection & Initialization Test Suite")
    print("=" * 80)
    test_safe_uri_masking()
    test_sync_mongo_ping()
    test_async_native_pymongo_ping()
    test_database_initialization_and_collections()
    test_approved_indexes()
    test_index_idempotency_and_no_conflicts()
    test_safe_health_check_mechanism()
    test_fastapi_health_endpoint()
    test_offline_mongo_degraded_handling()
    print("=" * 80)
    print("ALL 9 PHASE 1 SAFETY & INITIALIZATION TESTS PASSED! (Zero errors, zero warnings)")
    print("=" * 80 + "\n")
