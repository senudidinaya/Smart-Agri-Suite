Write-Host "Starting Expo Frontend (Smart Agri-Suite)..." -ForegroundColor Magenta
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; npx expo start -c" -WindowStyle Normal

Write-Host "Frontend launched! Scan the QR code in the new window with Expo Go." -ForegroundColor Yellow
