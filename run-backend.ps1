Write-Host "Starting Node.js API Server..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; node server.js" -WindowStyle Normal

Write-Host "Starting Python AI Model Server..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; .\venv\Scripts\activate; uvicorn main:app --host 0.0.0.0 --port 8000" -WindowStyle Normal

Write-Host "Both backend services launched in separate windows!" -ForegroundColor Yellow
