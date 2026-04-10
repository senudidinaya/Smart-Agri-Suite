# ============================================================
#  Smart-Agri-Suite -- Setup & Start Frontend (Expo Dev Client)
#  Run from the Smart-Agri-Suite root after cloning.
#  Installs dependencies, detects LAN IP, clears cache, and
#  starts the Expo dev-client server on port 8080.
# ============================================================

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Smart-Agri-Suite Frontend Launcher" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Make sure ALL backends are running first (.\run-backend.ps1):" -ForegroundColor Yellow
Write-Host "   - FastAPI (GEE/XGBoost)          http://localhost:8000" -ForegroundColor Green
Write-Host "   - Node.js (Pricing/Logistics)     http://localhost:5000" -ForegroundColor Blue
Write-Host "   - FastAPI (Stock Prediction)      http://localhost:8001" -ForegroundColor Magenta
Write-Host "   - FastAPI (Cultivator Screening)  http://localhost:8002" -ForegroundColor Yellow
Write-Host ""

# -- Navigate to frontend folder ------------------------------
$frontendPath = Join-Path $PSScriptRoot "frontend"
if (-not (Test-Path $frontendPath)) {
  Write-Host "ERROR: frontend/ folder not found at $frontendPath" -ForegroundColor Red
  Write-Host "Make sure you run this script from the Smart-Agri-Suite root." -ForegroundColor Red
  exit 1
}
Set-Location $frontendPath

# -- Check Node.js is available --------------------------------
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "ERROR: Node.js is not installed or not in PATH." -ForegroundColor Red
  Write-Host "Install Node.js from https://nodejs.org and try again." -ForegroundColor Red
  exit 1
}
Write-Host "[1/3] Node.js $(node --version) detected." -ForegroundColor Green

# -- Install dependencies --------------------------------------
Write-Host "[2/3] Installing npm dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
  Write-Host "ERROR: npm install failed. Check the output above." -ForegroundColor Red
  exit 1
}
Write-Host "  Dependencies installed." -ForegroundColor Green
Write-Host ""

# -- Detect local LAN IP --------------------------------------
Write-Host "[3/3] Detecting local IP address..." -ForegroundColor Yellow
# Prefer physical Wi-Fi / Ethernet adapters; skip virtual switches (Hyper-V, VPN, WSL)
$localIp = (Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.PrefixOrigin -eq 'Dhcp' -or $_.PrefixOrigin -eq 'Manual' } |
  Where-Object { $_.IPAddress -notlike '127.*' } |
  Where-Object { $_.InterfaceAlias -notmatch 'vEthernet|Loopback|VPN|WSL|Docker|VMware|VirtualBox' } |
  Select-Object -First 1).IPAddress

if (-not $localIp) {
  # Fallback: try any non-loopback address
  $localIp = (Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object { $_.PrefixOrigin -eq 'Dhcp' -or $_.PrefixOrigin -eq 'Manual' } |
    Where-Object { $_.IPAddress -notlike '127.*' } |
    Select-Object -First 1).IPAddress
}

if (-not $localIp) {
  $localIp = "localhost"
  Write-Host "  Could not detect LAN IP -- falling back to localhost." -ForegroundColor Yellow
} else {
  Write-Host "  LAN IP: $localIp" -ForegroundColor Magenta
}

$env:EXPO_PACKAGER_HOSTNAME = $localIp
$env:REACT_NATIVE_PACKAGER_HOSTNAME = $localIp
Write-Host ""

# -- Start Expo dev-client server ------------------------------
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Starting Expo dev-client on port 8080 (cache cleared)..." -ForegroundColor Green
Write-Host "  Press  a  for Android  |  i  for iOS  |  w  for Web" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
npx expo start --dev-client -c --port 8080
