# ============================================================
#  Smart-Agri-Suite — Start ALL Backend Services
#  • GEE / XGBoost API  →  Python / FastAPI   on port 8000
#  • Pricing and Logistics API  →  Node.js       on port 5000
# ============================================================

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Smart-Agri-Suite Backend Launcher" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# ── 1. GEE / XGBoost Backend (Python FastAPI) ───────────────
Write-Host "[1/2] Starting GEE + XGBoost API (FastAPI) on port 8000..." -ForegroundColor Green

$geeBackendPath = Join-Path $PSScriptRoot "backend"

Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-Command",
  "cd '$geeBackendPath'; Write-Host 'Activating Python venv...' -ForegroundColor Yellow; & .venv\Scripts\Activate.ps1; Write-Host 'Starting FastAPI on http://localhost:8000' -ForegroundColor Green; python -m uvicorn idle_land_api:app --reload --host 0.0.0.0 --port 8000"
) -WindowStyle Normal

Write-Host "  ✓ GEE/XGBoost backend launched in new window." -ForegroundColor Green
Write-Host ""

# ── 2. Pricing and Logistics Backend (Node.js) ────────────────
Write-Host "[2/2] Starting Pricing and Logistics API (Node.js) on port 5000..." -ForegroundColor Blue

# His backend lives in backend/pricing/
$pricingBackendPath = Join-Path $PSScriptRoot "backend\pricing"

Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-Command",
  "cd '$pricingBackendPath'; Write-Host 'Installing Node dependencies...' -ForegroundColor Yellow; npm install; Write-Host 'Starting Node.js server on http://localhost:5000' -ForegroundColor Blue; node server.js"
) -WindowStyle Normal

Write-Host "  ✓ Pricing and Logistics backend launched in new window." -ForegroundColor Blue
Write-Host ""

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Both backends are running:" -ForegroundColor Cyan
Write-Host "   • FastAPI (GEE/XGBoost)      →  http://localhost:8000" -ForegroundColor Green
Write-Host "   • Node.js (Pricing/Logistics) →  http://localhost:5000" -ForegroundColor Blue
Write-Host "  Close individual terminal windows to stop each server." -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
