@echo off
echo ====================================
echo    GovPulse - Full Stack Startup
echo ====================================
echo.

:: Start backend in a new window
echo [1/2] Starting FastAPI Backend (port 8000)...
start "GovPulse Backend" cmd /k "cd /d %~dp0backend && set PYTHONPATH=%~dp0 && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

:: Wait a moment for backend to initialize
timeout /t 3 /nobreak >nul

:: Start frontend in a new window
echo [2/2] Starting React Frontend (port 5173)...
start "GovPulse Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo Both services are starting...
echo   Backend:  http://localhost:8000
echo   API Docs: http://localhost:8000/docs
echo   Frontend: http://localhost:5173
echo.
echo Close the terminal windows to stop the servers.
pause
