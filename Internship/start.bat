@echo off
:: Force the working directory to be the directory of this batch file
cd /d "%~dp0"

echo ==========================================
echo   AI TRAFFIC VISION AUTOMATIC LAUNCHER
echo ==========================================
echo.
echo Starting FastAPI Backend Server on port 8000...
start "AI Traffic Vision Backend" cmd /k "python backend/main.py"

echo.
echo Starting Vite React Frontend on port 5173...
start "AI Traffic Vision Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ==========================================
echo Launcher finished. Keep the terminal windows open!
echo Open http://127.0.0.1:5173 in your browser once ready.
echo ==========================================
pause
