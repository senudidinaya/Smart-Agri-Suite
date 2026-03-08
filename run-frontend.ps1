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

Write-Host "Detecting local IP address..." -ForegroundColor Yellow
$localIp = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.PrefixOrigin -eq 'Dhcp' } | Select-Object -First 1).IPAddress
if (-not $localIp) { $localIp = "172.20.10.14" } 

$env:EXPO_PACKAGER_HOSTNAME = $localIp
$env:REACT_NATIVE_PACKAGER_HOSTNAME = $localIp
Write-Host "→ Expo will use IP: $localIp" -ForegroundColor Magenta
Write-Host ""

Write-Host "Starting Expo Go dev server in LAN mode (cache cleared)..." -ForegroundColor Green
npx expo start -c --go --lan
