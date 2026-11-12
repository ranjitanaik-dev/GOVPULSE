@echo off
echo Starting GovPulse FastAPI Backend...
echo.
cd /d "%~dp0"
set PYTHONPATH=%~dp0
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
pause
