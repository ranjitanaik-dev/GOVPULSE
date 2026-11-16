import json
import sqlite3
import datetime

# Load result_job_3.json
with open("data/reports/result_job_3.json", "r", encoding="utf-8") as f:
    result = json.load(f)

analytics = result.get("analytics", {})
summary = analytics.get("summary", {})

print("Pipeline Status:", result.get("status"))
print("Districts covered:", summary.get("districts_covered"))
print("Target person-days:", summary.get("total_person_days_target"))
print("Central liability person-days:", summary.get("total_central_liability_persondays"))
print("Achievement %:", summary.get("achievement_pct"))
print("Expenditure Lakh:", summary.get("total_expenditure_lakh"))

conn = sqlite3.connect("data/govpulse.db")
cursor = conn.cursor()

# Update processing_jobs
cursor.execute("""
    UPDATE processing_jobs
    SET status = 'completed',
        raw_records = ?,
        valid_records = ?,
        invalid_records = ?,
        duplicates_removed = ?,
        processing_time_seconds = ?
    WHERE dataset_id = 3
""", (
    result.get("raw_records"),
    result.get("valid_records"),
    result.get("invalid_records"),
    result.get("duplicates_removed"),
    result.get("processing_time_seconds"),
))

# Update datasets
cursor.execute("""
    UPDATE datasets
    SET status = 'processed',
        total_records = ?,
        valid_records = ?,
        invalid_records = ?,
        processed_at = ?
    WHERE id = 3
""", (
    result.get("raw_records"),
    result.get("valid_records"),
    result.get("invalid_records"),
    datetime.datetime.now().isoformat(),
))

# Delete old analytics_results for dataset 3
cursor.execute("DELETE FROM analytics_results WHERE dataset_id = 3")

# Insert updated analytics_results
now = datetime.datetime.now().isoformat()
for r_type, r_data in analytics.items():
    cursor.execute("""
        INSERT INTO analytics_results (dataset_id, job_id, scheme_id, reporting_year, result_type, result_data, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        3,
        3,
        "mgnrega",
        "2025-2026",
        r_type,
        json.dumps(r_data, default=str),
        now,
    ))

conn.commit()
conn.close()
print("Database successfully synchronized with updated analytics results.")
