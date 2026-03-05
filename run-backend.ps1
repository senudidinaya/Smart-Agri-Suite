Write-Host "Starting Backend API Server..." -ForegroundColor Green
Write-Host "==============================" -ForegroundColor Green
Set-Location backend
& .venv\Scripts\Activate.ps1
python -m uvicorn idle_land_api:app --reload --host 0.0.0.0 --port 8000
