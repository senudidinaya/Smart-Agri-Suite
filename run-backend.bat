@echo off
echo Starting Backend API Server...
echo.
cd backend
.venv\Scripts\activate && python main.py
pause
