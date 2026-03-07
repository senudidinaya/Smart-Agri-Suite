# Run backend with unbuffered output and real-time logging
$env:PYTHONUNBUFFERED=1
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
