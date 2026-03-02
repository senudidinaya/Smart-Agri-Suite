Write-Host "Starting Backend API Server..." -ForegroundColor Green
Write-Host "==============================" -ForegroundColor Green
Set-Location backend
& .venv\Scripts\Activate.ps1
python main.py
