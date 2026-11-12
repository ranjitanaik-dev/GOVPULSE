"""
GovPulse — File Handler Service
"""

import os
import shutil
import datetime
import logging

logger = logging.getLogger("govpulse.file_handler")

PROJECT_ROOT = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..")
)
RAW_DIR = os.path.join(PROJECT_ROOT, "data", "raw")
ALLOWED_EXTENSIONS = {".csv", ".xls", ".xlsx"}
MAX_FILE_SIZE_MB = 500


def save_uploaded_file(file_content: bytes, original_filename: str, scheme_id: str) -> dict:
    """
    Save an uploaded file to data/raw/<scheme_id>/<timestamp>_<filename>.
    Returns metadata dict.
    """
    ext = os.path.splitext(original_filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(f"File type '{ext}' is not supported. Upload CSV or Excel files.")

    size_mb = len(file_content) / (1024 * 1024)
    if size_mb > MAX_FILE_SIZE_MB:
        raise ValueError(f"File size {size_mb:.1f} MB exceeds limit of {MAX_FILE_SIZE_MB} MB.")

    scheme_dir = os.path.join(RAW_DIR, scheme_id)
    os.makedirs(scheme_dir, exist_ok=True)

    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_name = f"{timestamp}_{original_filename.replace(' ', '_')}"
    dest_path = os.path.join(scheme_dir, safe_name)

    with open(dest_path, "wb") as f:
        f.write(file_content)

    logger.info(f"Saved file: {dest_path} ({size_mb:.2f} MB)")

    return {
        "file_path": dest_path,
        "file_name": safe_name,
        "original_name": original_filename,
        "file_size_bytes": len(file_content),
        "file_format": "excel" if ext in (".xls", ".xlsx") else "csv",
    }
