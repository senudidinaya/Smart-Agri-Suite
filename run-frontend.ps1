# ============================================================
#  Smart-Agri-Suite — Start Frontend (Expo)
#  Single unified frontend serving both components
# ============================================================

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Smart-Agri-Suite Frontend Launcher" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Make sure BOTH backends are running first:" -ForegroundColor Yellow
Write-Host "   • GEE/XGBoost API  →  http://localhost:8000  (run-backend.ps1)" -ForegroundColor Green
Write-Host "   • Pricing API      →  http://localhost:5000  (run-backend.ps1)" -ForegroundColor Blue
Write-Host ""

$frontendPath = Join-Path $PSScriptRoot "frontend"

Set-Location $frontendPath

Write-Host "Installing dependencies (if needed)..." -ForegroundColor Yellow
npm install

Write-Host ""
Write-Host "Starting Expo dev server (cache cleared)..." -ForegroundColor Green
npx expo start -c
