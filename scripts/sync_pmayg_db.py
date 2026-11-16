import sqlite3
import json
import datetime

with open("data/reports/result_job_pmayg.json", "r", encoding="utf-8") as f:
    job = json.load(f)

analytics = job["analytics"]
conn = sqlite3.connect("data/govpulse.db")
cur = conn.cursor()

now = datetime.datetime.now().isoformat()
file_path = "data/raw/pmayg/PhysicalProgresReport_SPPMAYG_NNState_PMAYG_15_ALLPMAYG_Cumulative (1).xls"
file_size = 18359

# Insert or update dataset 4
cur.execute("SELECT id FROM datasets WHERE id = 4")
if cur.fetchone():
    cur.execute("""
        UPDATE datasets
        SET scheme_id = 'pmayg',
            file_name = 'PhysicalProgresReport_SPPMAYG_NNState_PMAYG_15_ALLPMAYG_Cumulative (1).xls',
            file_path = ?,
            file_size_bytes = ?,
            file_format = 'xls',
            reporting_year = 'Cumulative',
            source = 'Official PMAY-G AwaasSoft Portal Report A.2',
            total_records = 31,
            valid_records = 31,
            invalid_records = 0,
            status = 'processed',
            processed_at = ?
        WHERE id = 4
    """, (file_path, file_size, now))
else:
    cur.execute("""
        INSERT INTO datasets (id, scheme_id, file_name, file_path, file_size_bytes, file_format, reporting_year, source, total_records, valid_records, invalid_records, status, uploaded_at, processed_at)
        VALUES (4, 'pmayg', 'PhysicalProgresReport_SPPMAYG_NNState_PMAYG_15_ALLPMAYG_Cumulative (1).xls', ?, ?, 'xls', 'Cumulative', 'Official PMAY-G AwaasSoft Portal Report A.2', 31, 31, 0, 'processed', ?, ?)
    """, (file_path, file_size, now, now))

# Delete old analytics_results for pmayg
cur.execute("DELETE FROM analytics_results WHERE scheme_id = 'pmayg'")

# Insert analytics_results
for r_type, r_data in analytics.items():
    cur.execute("""
        INSERT INTO analytics_results (dataset_id, job_id, scheme_id, reporting_year, result_type, result_data, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        4,
        4,
        "pmayg",
        "Cumulative",
        r_type,
        json.dumps(r_data, default=str),
        now,
    ))

conn.commit()
print("Database synchronized for PMAY-G! Stored result types:", list(analytics.keys()))
conn.close()
