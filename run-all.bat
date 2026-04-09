@echo off
echo ==========================================
echo    SMART AGRI SUITE - SYSTEM LAUNCHER
echo ==========================================
echo.
echo [1/3] Starting Express Backend (Port 5000)...
start "Backend: Node" cmd /k "cd backend && npm run start"

echo.
echo [2/3] Starting Python ML Service (Port 8000)...
start "Backend: Python" cmd /k "cd backend && venv\Scripts\activate && uvicorn main:app --host 0.0.0.0 --port 8000"

echo.
echo [3/3] Starting Expo Frontend...
start "Frontend: Expo" cmd /k "cd frontend && npx expo start -c"

echo.
echo All services are launching in separate windows.
echo ------------------------------------------
echo PLEASE ENSURE MONGODB IS RUNNING LOCALLY!
echo ------------------------------------------
pause
