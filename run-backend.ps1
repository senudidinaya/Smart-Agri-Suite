Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Smart-Agri-Suite Backend Launcher" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# 1. GEE / XGBoost Backend (Python FastAPI)
Write-Host "[1/4] Starting GEE + XGBoost API (FastAPI) on port 8000..." -ForegroundColor Green
$geeBackendPath = Join-Path $PSScriptRoot "backend"
Start-Process powershell -ArgumentList @(
  "-NoExit", "-Command",
  "cd '$geeBackendPath'; Write-Host 'Activating Python venv...' -ForegroundColor Yellow; & .venv\Scripts\Activate.ps1; Write-Host 'Starting FastAPI on http://localhost:8000' -ForegroundColor Green; python -m uvicorn idle_land_api:app --reload --host 0.0.0.0 --port 8000"
) -WindowStyle Normal
Write-Host "  GEE/XGBoost backend launched." -ForegroundColor Green
Write-Host ""

# 2. Pricing and Logistics Backend (Node.js)
Write-Host "[2/4] Starting Pricing and Logistics API (Node.js) on port 5000..." -ForegroundColor Blue
$pricingBackendPath = Join-Path $PSScriptRoot "backend\pricing"
Start-Process powershell -ArgumentList @(
  "-NoExit", "-Command",
  "cd '$pricingBackendPath'; Write-Host 'Installing Node dependencies...' -ForegroundColor Yellow; npm install; Write-Host 'Starting Node.js server on http://localhost:5000' -ForegroundColor Blue; node server.js"
) -WindowStyle Normal
Write-Host "  Pricing backend launched." -ForegroundColor Blue
Write-Host ""

# 3. Stock Prediction Backend (Python FastAPI)
Write-Host "[3/4] Starting Stock Prediction API (FastAPI) on port 8001..." -ForegroundColor Magenta
$stockBackendPath = Join-Path $PSScriptRoot "backend\stock"
Start-Process powershell -ArgumentList @(
  "-NoExit", "-Command",
  "cd '$stockBackendPath'; Write-Host 'Activating Python venv...' -ForegroundColor Yellow; & ..\.venv\Scripts\Activate.ps1; Write-Host 'Starting Stock API on http://localhost:8001' -ForegroundColor Magenta; python -m uvicorn stock_prediction_api:app --reload --host 0.0.0.0 --port 8001"
) -WindowStyle Normal
Write-Host "  Stock Prediction backend launched." -ForegroundColor Magenta
Write-Host ""

# 4. Cultivator Screening Backend (Python FastAPI)
Write-Host "[4/4] Starting Cultivator Screening API (FastAPI) on port 8002..." -ForegroundColor Yellow
$backendPath = Join-Path $PSScriptRoot "backend"
Start-Process powershell -ArgumentList @(
  "-NoExit", "-Command",
  "cd '$backendPath'; Write-Host 'Activating Python venv...' -ForegroundColor Yellow; & .venv\Scripts\Activate.ps1; Write-Host 'Starting Cultivator API on http://localhost:8002' -ForegroundColor Yellow; python -m uvicorn cultivator.main:app --reload --host 0.0.0.0 --port 8002"
) -WindowStyle Normal
Write-Host "  Cultivator Screening backend launched." -ForegroundColor Yellow
Write-Host ""

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  All backends are running:" -ForegroundColor Cyan
Write-Host "   FastAPI (GEE/XGBoost)         port 8000" -ForegroundColor Green
Write-Host "   Node.js (Pricing/Logistics)   port 5000" -ForegroundColor Blue
Write-Host "   FastAPI (Stock Prediction)    port 8001" -ForegroundColor Magenta
Write-Host "   FastAPI (Cultivator Screening) port 8002" -ForegroundColor Yellow
Write-Host "  Close individual terminal windows to stop each server." -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
