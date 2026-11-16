"""
GovPulse — MongoDB Database Configuration, Connection Manager, and Index Engine
Supports both PyMongo synchronous (MongoClient) and native asynchronous (AsyncMongoClient) operations.
Fully compatible with MongoDB Community Server (local) and MongoDB Atlas (cloud).
"""

import os
import logging
import urllib.parse
from typing import Dict, Any, List, Optional, Tuple
from pathlib import Path

import pymongo
from pymongo import MongoClient
from pymongo.database import Database
from pymongo.errors import PyMongoError, ServerSelectionTimeoutError

# Attempt dotenv load
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).resolve().parent.parent.parent / ".env"
    if env_path.exists():
        load_dotenv(dotenv_path=env_path)
except Exception:
    pass

logger = logging.getLogger("govpulse.mongodb")

DEFAULT_MONGO_URI = "mongodb://127.0.0.1:27017"
DEFAULT_DB_NAME = "govpulse_db"


def get_mongo_uri() -> str:
    """Retrieve MONGODB_URI from environment, defaulting to local Community Server."""
    return os.environ.get("MONGODB_URI", DEFAULT_MONGO_URI).strip()


def get_mongo_db_name() -> str:
    """Retrieve MONGODB_DB_NAME from environment, defaulting to 'govpulse_db'."""
    return os.environ.get("MONGODB_DB_NAME", DEFAULT_DB_NAME).strip()


def get_server_selection_timeout_ms() -> int:
    """Retrieve serverSelectionTimeoutMS from environment, defaulting to 3000ms."""
    try:
        return int(os.environ.get("MONGODB_SERVER_SELECTION_TIMEOUT_MS", "3000"))
    except ValueError:
        return 3000


def get_connect_timeout_ms() -> int:
    """Retrieve connectTimeoutMS from environment, defaulting to 5000ms."""
    try:
        return int(os.environ.get("MONGODB_CONNECT_TIMEOUT_MS", "5000"))
    except ValueError:
        return 5000


def get_safe_uri_info(uri: Optional[str] = None) -> Dict[str, Any]:
    """
    Parse a MongoDB URI and return non-sensitive connection details.
    Guarantees that usernames, passwords, auth tokens, or private cluster credentials
    are never returned or printed.
    """
    target_uri = uri or get_mongo_uri()
    try:
        parsed = urllib.parse.urlsplit(target_uri)
        has_auth = bool(parsed.username or parsed.password)
        db_from_path = parsed.path.lstrip("/").split("?")[0] if parsed.path else None
        return {
            "scheme": parsed.scheme or "mongodb",
            "host": parsed.hostname or "unknown",
            "port": parsed.port if parsed.port else (27017 if parsed.scheme == "mongodb" else None),
            "database": db_from_path or get_mongo_db_name(),
            "auth_configured": has_auth,
        }
    except Exception as e:
        return {
            "scheme": "unknown",
            "host": "unknown",
            "port": None,
            "database": get_mongo_db_name(),
            "auth_configured": False,
            "parse_error": str(e),
        }


# ---------------------------------------------------------------------------
# Approved Index Specifications
# ---------------------------------------------------------------------------
REQUIRED_COLLECTIONS = ["dataset_catalog", "raw_records", "audit_logs"]

APPROVED_INDEXES: Dict[str, List[Dict[str, Any]]] = {
    "raw_records": [
        {
            "name": "idx_dataset_attempt_row_unique",
            "keys": [("dataset_id", pymongo.ASCENDING), ("attempt_number", pymongo.ASCENDING), ("row_index", pymongo.ASCENDING)],
            "unique": True,
            "description": "Unique compound index per attempt row to enforce idempotency",
        },
        {
            "name": "idx_dataset_attempt_lease_rowtype",
            "keys": [
                ("dataset_id", pymongo.ASCENDING),
                ("attempt_number", pymongo.ASCENDING),
                ("lease_id", pymongo.ASCENDING),
                ("row_type", pymongo.ASCENDING),
            ],
            "unique": False,
            "description": "Standard index to accelerate PySpark attempt-isolated queries",
        },
        {
            "name": "idx_district_normalized",
            "keys": [("district_normalized", pymongo.ASCENDING)],
            "unique": False,
            "description": "Standard index for district-level query acceleration",
        },
    ],
    "dataset_catalog": [
        {
            "name": "idx_dataset_id_unique",
            "keys": [("dataset_id", pymongo.ASCENDING)],
            "unique": True,
            "description": "Unique index on canonical SQLite dataset_id",
        },
        {
            "name": "idx_scheme_filehash_unique",
            "keys": [("scheme_id", pymongo.ASCENDING), ("file_hash_sha256", pymongo.ASCENDING)],
            "unique": True,
            "description": "Unique compound index for scheme-aware duplicate detection",
        },
        {
            "name": "idx_scheme_version_unique",
            "keys": [("scheme_id", pymongo.ASCENDING), ("version", pymongo.ASCENDING)],
            "unique": True,
            "description": "Unique compound index for monotonic version allocation",
        },
    ],
    "audit_logs": [
        {
            "name": "idx_timestamp_desc",
            "keys": [("timestamp", pymongo.DESCENDING)],
            "unique": False,
            "description": "Standard index for chronological audit queries",
        },
    ],
}


# ---------------------------------------------------------------------------
# Connection Singletons
# ---------------------------------------------------------------------------
_sync_client: Optional[MongoClient] = None
_async_client: Optional[Any] = None


def get_mongo_client() -> MongoClient:
    """Return a cached synchronous PyMongo client instance."""
    global _sync_client
    if _sync_client is None:
        uri = get_mongo_uri()
        sel_timeout = get_server_selection_timeout_ms()
        conn_timeout = get_connect_timeout_ms()
        safe_info = get_safe_uri_info(uri)
        logger.info(
            "Initializing PyMongo client [scheme=%s, host=%s, port=%s, auth=%s]",
            safe_info["scheme"],
            safe_info["host"],
            safe_info["port"],
            safe_info["auth_configured"],
        )
        _sync_client = MongoClient(
            uri,
            serverSelectionTimeoutMS=sel_timeout,
            connectTimeoutMS=conn_timeout,
            appname="GovPulse",
        )
    return _sync_client


def get_mongo_db(db_name: Optional[str] = None) -> Database:
    """Return the GovPulse database using the synchronous PyMongo client."""
    client = get_mongo_client()
    target_db = db_name or get_mongo_db_name()
    return client[target_db]


def get_async_mongo_client():
    """
    Return a cached asynchronous PyMongo AsyncMongoClient instance.
    Uses native PyMongo 4.9+ AsyncMongoClient.
    """
    global _async_client
    if _async_client is None:
        try:
            from pymongo import AsyncMongoClient
            uri = get_mongo_uri()
            sel_timeout = get_server_selection_timeout_ms()
            conn_timeout = get_connect_timeout_ms()
            safe_info = get_safe_uri_info(uri)
            logger.info(
                "Initializing native PyMongo AsyncMongoClient [scheme=%s, host=%s, port=%s, auth=%s]",
                safe_info["scheme"],
                safe_info["host"],
                safe_info["port"],
                safe_info["auth_configured"],
            )
            _async_client = AsyncMongoClient(
                uri,
                serverSelectionTimeoutMS=sel_timeout,
                connectTimeoutMS=conn_timeout,
                appname="GovPulse",
            )
        except (ImportError, AttributeError):
            logger.warning("Native PyMongo AsyncMongoClient not available.")
            return None
    return _async_client


def get_async_mongo_db(db_name: Optional[str] = None):
    """Return the GovPulse database using the native asynchronous client."""
    client = get_async_mongo_client()
    if client is None:
        return None
    target_db = db_name or get_mongo_db_name()
    return client[target_db]


def close_mongo_connections():
    """Close cached synchronous and asynchronous MongoDB client connections."""
    global _sync_client, _async_client
    if _sync_client is not None:
        try:
            _sync_client.close()
            logger.info("Synchronous PyMongo client connection closed.")
        except Exception as e:
            logger.warning("Error closing PyMongo client: %s", e)
        finally:
            _sync_client = None

    if _async_client is not None:
        try:
            import asyncio
            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    loop.create_task(_async_client.close())
                else:
                    loop.run_until_complete(_async_client.close())
            except Exception:
                pass
            logger.info("Asynchronous PyMongo AsyncMongoClient connection closed.")
        except Exception as e:
            logger.warning("Error closing AsyncMongoClient: %s", e)
        finally:
            _async_client = None


# ---------------------------------------------------------------------------
# Index Management & Initialization
# ---------------------------------------------------------------------------
def _normalize_key_spec(keys: List[Tuple[str, Any]]) -> List[Tuple[str, int]]:
    """Normalize key list to standard [(field_name, direction_int), ...]."""
    normalized = []
    for k, d in keys:
        direction = 1 if d in [1, pymongo.ASCENDING, "asc", "1"] else -1
        normalized.append((str(k), direction))
    return normalized


def ensure_collection_indexes(
    db: Database,
    collection_name: str,
    index_specs: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Check existing indexes before creating them.
    Handles existing indexes safely and reports incompatible indexes
    instead of silently deleting or replacing them.
    """
    collection = db[collection_name]
    existing_indexes = collection.index_information()
    results = {
        "collection": collection_name,
        "verified": [],
        "created": [],
        "conflicts": [],
    }

    for spec in index_specs:
        target_name = spec["name"]
        target_keys = _normalize_key_spec(spec["keys"])
        target_unique = spec.get("unique", False)

        # Check if an index with identical keys already exists
        matching_key_index = None
        for name, info in existing_indexes.items():
            if name == "_id_":
                continue
            existing_keys = _normalize_key_spec(info.get("key", []))
            if existing_keys == target_keys:
                matching_key_index = (name, info)
                break

        if matching_key_index:
            existing_name, existing_info = matching_key_index
            existing_unique = existing_info.get("unique", False)
            if existing_unique == target_unique:
                results["verified"].append({
                    "name": existing_name,
                    "target_name": target_name,
                    "keys": target_keys,
                    "unique": target_unique,
                    "status": "compatible_existing",
                })
            else:
                # Conflict: Keys match but unique constraint differs!
                conflict_msg = (
                    f"Index key match on '{existing_name}' but unique constraint mismatch: "
                    f"existing unique={existing_unique}, target unique={target_unique}. "
                    "Existing index will not be modified or replaced automatically."
                )
                logger.error("Index conflict on %s: %s", collection_name, conflict_msg)
                results["conflicts"].append({
                    "name": existing_name,
                    "target_name": target_name,
                    "keys": target_keys,
                    "error": conflict_msg,
                })
            continue

        # Check if name is taken by a different key spec
        if target_name in existing_indexes:
            existing_keys = _normalize_key_spec(existing_indexes[target_name].get("key", []))
            conflict_msg = (
                f"Index name '{target_name}' is already used by different keys: {existing_keys}. "
                "Index will not be silently replaced."
            )
            logger.error("Index name collision on %s: %s", collection_name, conflict_msg)
            results["conflicts"].append({
                "name": target_name,
                "target_keys": target_keys,
                "existing_keys": existing_keys,
                "error": conflict_msg,
            })
            continue

        # Index does not exist: create it safely
        try:
            logger.info("Creating index '%s' on collection '%s'...", target_name, collection_name)
            created_name = collection.create_index(
                target_keys,
                name=target_name,
                unique=target_unique,
                background=True,
            )
            results["created"].append({
                "name": created_name,
                "keys": target_keys,
                "unique": target_unique,
                "status": "created",
            })
            logger.info("Successfully created index '%s' on '%s'.", created_name, collection_name)
        except PyMongoError as e:
            error_msg = f"Failed to create index '{target_name}' on '{collection_name}': {e}"
            logger.error(error_msg)
            results["conflicts"].append({
                "name": target_name,
                "keys": target_keys,
                "error": str(e),
            })

    return results


def init_mongo_db() -> Dict[str, Any]:
    """
    Initialize required GovPulse collections and approved indexes.
    Returns a structured status dictionary.
    """
    db_name = get_mongo_db_name()
    safe_info = get_safe_uri_info()
    report = {
        "database": db_name,
        "connection": safe_info,
        "collections": {},
        "initialized": False,
        "error": None,
    }

    try:
        db = get_mongo_db()
        # Verify connectivity using ping
        client = get_mongo_client()
        client.admin.command("ping")

        # Initialize collections and indexes
        for col_name, specs in APPROVED_INDEXES.items():
            col_result = ensure_collection_indexes(db, col_name, specs)
            report["collections"][col_name] = col_result

        has_conflicts = any(
            len(res.get("conflicts", [])) > 0 for res in report["collections"].values()
        )
        report["initialized"] = not has_conflicts
        logger.info(
            "MongoDB initialization complete for '%s' (all collections ready, conflicts: %s).",
            db_name,
            has_conflicts,
        )
        return report

    except ServerSelectionTimeoutError as e:
        safe_err = f"MongoDB server selection timeout: {e}"
        logger.warning("MongoDB unavailable during init_mongo_db: %s", safe_err)
        report["error"] = safe_err
        return report
    except Exception as e:
        safe_err = f"Error during MongoDB initialization: {e}"
        logger.warning(safe_err)
        report["error"] = safe_err
        return report


# ---------------------------------------------------------------------------
# Health Verification
# ---------------------------------------------------------------------------
def check_mongo_health() -> Dict[str, Any]:
    """
    Safe backend health-check mechanism:
    - Verifies MongoDB connection using ping.
    - Verifies database access.
    - Verifies required collections and indexes.
    - Provides clear error handling when MongoDB is unavailable.
    - Never exposes credentials.
    """
    safe_info = get_safe_uri_info()
    db_name = get_mongo_db_name()
    health_report = {
        "status": "unavailable",
        "connected": False,
        "database": db_name,
        "connection": {
            "scheme": safe_info.get("scheme"),
            "host": safe_info.get("host"),
            "port": safe_info.get("port"),
            "auth_configured": safe_info.get("auth_configured"),
        },
        "ping": False,
        "collections": {},
        "all_indexes_verified": False,
        "error": None,
    }

    try:
        client = get_mongo_client()
        # 1. Ping test
        client.admin.command("ping")
        health_report["ping"] = True
        health_report["connected"] = True
        health_report["status"] = "connected"

        # 2. Database access
        db = client[db_name]
        existing_collections = db.list_collection_names()

        # 3. Verify collections and indexes
        all_ok = True
        for col_name in REQUIRED_COLLECTIONS:
            exists = col_name in existing_collections
            col_health = {
                "exists": exists,
                "indexes_verified": False,
                "missing_indexes": [],
                "conflicts": [],
            }
            if exists:
                idx_info = db[col_name].index_information()
                required_specs = APPROVED_INDEXES.get(col_name, [])
                missing = []
                for spec in required_specs:
                    target_keys = _normalize_key_spec(spec["keys"])
                    found = False
                    for name, info in idx_info.items():
                        if name == "_id_":
                            continue
                        if _normalize_key_spec(info.get("key", [])) == target_keys:
                            found = True
                            break
                    if not found:
                        missing.append(spec["name"])
                col_health["missing_indexes"] = missing
                col_health["indexes_verified"] = len(missing) == 0
                if len(missing) > 0:
                    all_ok = False
            else:
                all_ok = False
            health_report["collections"][col_name] = col_health

        health_report["all_indexes_verified"] = all_ok
        return health_report

    except ServerSelectionTimeoutError:
        health_report["connected"] = False
        health_report["error"] = "MongoDB server selection timeout (server unreachable)"
        return health_report
    except PyMongoError as e:
        health_report["connected"] = False
        health_report["error"] = f"PyMongo error: {e}"
        return health_report
    except Exception as e:
        health_report["connected"] = False
        health_report["error"] = f"Unexpected error during MongoDB health check: {e}"
        return health_report
