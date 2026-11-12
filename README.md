# GovPulse

**A Spark SQL-Based Performance Monitoring System for Government and Public Policy**

> **Important Disclaimer**: This application uses configurable project-defined thresholds for performance classification. These are NOT official government classifications. All data shown comes from user-uploaded datasets processed through Apache Spark SQL.

---

## Overview

GovPulse is a decision-support and data analytics platform that integrates government scheme datasets, processes large volumes of structured data using **Apache Spark** and **Spark SQL**, analyses scheme performance and presents meaningful insights through an interactive web dashboard.

### Supported Government Schemes

| Scheme | Full Name | Focus Area |
|--------|-----------|------------|
| MGNREGA | Mahatma Gandhi National Rural Employment Guarantee Act | Rural employment monitoring |
| PMAY-G | Pradhan Mantri Awaas Yojana – Gramin | Rural housing performance |
| PM-JAY | Pradhan Mantri Jan Arogya Yojana | Healthcare beneficiary monitoring |
| UDISE+ | Unified District Information System for Education Plus | School education performance |

The architecture is extensible — additional schemes can be integrated by adding a new analysis module and scheme configuration without modifying the core application.

---

## Technology Stack

| Layer | Technologies |
|-------|-------------|
| **Big Data Processing** | Python, Apache Spark, PySpark, Spark SQL, Parquet |
| **Backend** | FastAPI, Uvicorn, SQLAlchemy, SQLite, Pydantic |
| **Frontend** | React 18, Vite, Tailwind CSS, Recharts, Lucide React, Axios |

---

## Architecture

```
Government Datasets (CSV / Excel)
        │
        ▼
React Dataset Upload Interface
        │
        ▼
FastAPI Backend (port 8000)
        │
        ▼
Raw Dataset Storage (data/raw/)
        │
        ▼
PySpark Data Ingestion & Cleaning
        │
        ▼
Spark SQL Analytics
        │
        ▼
Processed Parquet Storage (data/processed/)
        │
        ▼
FastAPI Analytics Endpoints
        │
        ▼
React Dashboard (port 5173)
        │
        ▼
Charts, Rankings, Performance Insights
```

### Key Design Decisions

- **Spark runs as a separate processing job** — not inside API requests
- **Processed results are stored as Parquet** — FastAPI reads them for dashboard queries
- **SQLite tracks metadata** — dataset records, processing jobs, and data quality results
- **No fake statistics** — empty states are shown when no data has been uploaded

---

## Project Structure

```
GovPulse/
├── backend/                     # FastAPI backend
│   ├── app/
│   │   ├── main.py              # FastAPI application
│   │   ├── database/
│   │   │   └── db.py            # SQLAlchemy + SQLite setup
│   │   ├── models/
│   │   │   └── models.py        # ORM models
│   │   ├── schemas/
│   │   │   └── schemas.py       # Pydantic schemas
│   │   ├── services/
│   │   │   ├── scheme_config.py # Scheme seed data & indicators
│   │   │   ├── spark_runner.py  # Background Spark job launcher
│   │   │   └── file_handler.py  # File upload handler
│   │   └── routes/
│   │       ├── datasets.py      # Upload & list endpoints
│   │       ├── jobs.py          # Processing job status
│   │       ├── dashboard.py     # Dashboard summary
│   │       ├── analytics.py     # Scheme/state/district analytics
│   │       ├── schemes.py       # Scheme metadata
│   │       └── reports.py       # CSV export
│   └── start_backend.bat
│
├── spark_jobs/                  # PySpark processing engine
│   ├── spark_session.py         # Spark session management
│   ├── ingestion.py             # CSV/Excel ingestion + column mapping
│   ├── preprocessing.py         # Cleaning, casting, deduplication
│   ├── data_validation.py       # Validation & quality reports
│   ├── run_pipeline.py          # CLI entry point for Spark pipeline
│   ├── performance_queries.sql  # Spark SQL analytical queries
│   └── analytics/
│       ├── common_analytics.py  # Shared analytics helpers
│       ├── mgnrega_analysis.py  # MGNREGA-specific analytics
│       ├── pmay_analysis.py     # PMAY-G analytics
│       ├── pmjay_analysis.py    # PM-JAY analytics
│       └── udise_analysis.py    # UDISE+ analytics
│
├── frontend/                    # React + Vite frontend
│   ├── src/
│   │   ├── App.jsx              # Router & routes
│   │   ├── main.jsx             # Entry point
│   │   ├── index.css            # Global styles & CSS variables
│   │   ├── layouts/
│   │   │   └── MainLayout.jsx   # Sidebar + TopBar shell
│   │   ├── components/
│   │   │   ├── Sidebar.jsx      # Navigation sidebar
│   │   │   ├── TopBar.jsx       # Fixed top bar
│   │   │   ├── StatCard.jsx     # Dashboard stat card
│   │   │   ├── LoadingSpinner.jsx
│   │   │   ├── EmptyState.jsx
│   │   │   └── AlertBadge.jsx
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── DatasetManagement.jsx
│   │   │   ├── SchemeExplorer.jsx
│   │   │   ├── PerformanceAnalytics.jsx
│   │   │   ├── AlertsPage.jsx
│   │   │   └── ReportsPage.jsx
│   │   └── services/
│   │       └── api.js           # Axios API client
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── start_frontend.bat
│
├── data/                        # Data directory (git-ignored)
│   ├── raw/                     # Uploaded raw datasets
│   ├── processed/               # Parquet output from Spark
│   └── quarantine/              # Invalid records
│
├── tests/
│   ├── fixtures/
│   │   ├── sample_mgnrega.csv   # Synthetic test fixture (NOT real data)
│   │   └── sample_pmayg.csv     # Synthetic test fixture (NOT real data)
│   ├── test_spark.py            # Spark pipeline unit tests
│   └── test_api.py              # FastAPI integration tests
│
├── requirements.txt             # Python dependencies
├── .gitignore
├── start_all.bat                # Start both servers
└── README.md
```

---

## Prerequisites

- **Python 3.10+**
- **Java 8 or 11** (required by Apache Spark)
- **Node.js 18+** and npm
- **Windows 10/11** (the project is configured for local Spark mode on Windows)

### Java Setup

Apache Spark requires Java. Download and install Java 8 or 11 (OpenJDK recommended):

1. Download from [Adoptium](https://adoptium.net/)
2. Install and set `JAVA_HOME` environment variable
3. Verify: `java -version`

---

## Quick Start

### 1. Install Python Dependencies

```bash
cd GovPulse
pip install -r requirements.txt
```

### 2. Install Frontend Dependencies

```bash
cd frontend
npm install
```

### 3. Start Both Servers

**Option A — One-click:**
```bash
# From the GovPulse root:
start_all.bat
```

**Option B — Manual:**

Terminal 1 (Backend):
```bash
cd backend
set PYTHONPATH=..
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Terminal 2 (Frontend):
```bash
cd frontend
npm run dev
```

### 4. Open the Application

- **Dashboard**: http://localhost:5173
- **API Docs**: http://localhost:8000/docs
- **API Health**: http://localhost:8000/health

---

## Usage Workflow

1. **Upload a dataset** — Go to the Datasets page, select a scheme, upload a CSV/Excel file
2. **Trigger Spark processing** — Click "Process" on the uploaded dataset
3. **View analytics** — Dashboard, Scheme Explorer, and Performance Analytics pages populate with Spark SQL results
4. **Check alerts** — The Alerts page shows data quality issues and underperforming districts
5. **Export reports** — Download analytics results as CSV from the Reports page

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Application status |
| `GET` | `/health` | Health check |
| `POST` | `/api/datasets/upload` | Upload dataset |
| `GET` | `/api/datasets` | List datasets |
| `GET` | `/api/datasets/{id}` | Get dataset details |
| `POST` | `/api/datasets/{id}/process` | Trigger Spark processing |
| `GET` | `/api/jobs` | List processing jobs |
| `GET` | `/api/jobs/{id}` | Get job status |
| `GET` | `/api/dashboard/summary` | Dashboard summary |
| `GET` | `/api/schemes` | List supported schemes |
| `GET` | `/api/schemes/{id}` | Get scheme details |
| `GET` | `/api/analytics/scheme/{id}` | Scheme analytics |
| `GET` | `/api/analytics/states` | State-wise analytics |
| `GET` | `/api/analytics/districts` | District-wise analytics |
| `GET` | `/api/analytics/trends` | Year-over-year trends |
| `GET` | `/api/analytics/rankings` | Top/bottom district rankings |
| `GET` | `/api/analytics/alerts` | Performance alerts |
| `GET` | `/api/reports/export` | Export analytics as CSV |

Full interactive documentation is available at http://localhost:8000/docs (Swagger UI).

---

## Running Tests

### Spark Pipeline Tests
```bash
pytest tests/test_spark.py -v
```

### API Integration Tests (requires backend running)
```bash
# First start the backend, then:
pytest tests/test_api.py -v
```

---

## Performance Thresholds

The following thresholds are **project-defined** and fully configurable. They are **NOT** official government classifications:

| Band | Range | Meaning |
|------|-------|---------|
| 🟢 On Track | ≥ 80% | Target achievement is on track |
| 🟡 Needs Attention | 50–79% | May require additional monitoring |
| 🔴 Low Achievement | < 50% | Significant underperformance |

---

## Adding a New Scheme

1. Add scheme configuration in `backend/app/services/scheme_config.py`
2. Create analysis module in `spark_jobs/analytics/<scheme>_analysis.py`
3. Add the scheme ID to the frontend `SCHEMES` arrays in the pages
4. No changes needed to the core pipeline, API framework, or database schema

---

## Spark Processing Details

- **Mode**: `local[*]` (uses all available CPU cores)
- **Output**: Parquet files in `data/processed/<scheme>/`
- **Logging**: Spark execution logs with record counts and processing duration
- **Query Plans**: `explain()` execution plans are logged for demonstration

---

## License

This project is created for educational and demonstration purposes.
