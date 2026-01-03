from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import JSONResponse
import os, uuid, traceback
from pathlib import Path

from app.asr import transcribe, get_model  # <-- ensure asr.py has get_model()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

@app.on_event("startup")
def _startup():
    # IMPORTANT: load model ON STARTUP so you see crash immediately (not mid-request)
    print("✅ FastAPI startup: about to load Whisper model...")
    try:
        get_model()
        print("✅ Whisper model loaded OK.")
    except Exception as e:
        print("❌ Whisper model failed to load (Python exception):", repr(e))
        traceback.print_exc()
        # Note: if it's an access violation, Python will exit before reaching here.

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/calls/analyze")
async def analyze(file: UploadFile = File(...)):
    print("➡️  /calls/analyze hit from client")
    try:
        ext = Path(file.filename).suffix or ".bin"
        out_path = UPLOAD_DIR / f"{uuid.uuid4().hex}{ext}"

        data = await file.read()
        with out_path.open("wb") as f:
            f.write(data)

        size_bytes = os.path.getsize(out_path)
        print(f"✅ Saved upload: {out_path} ({size_bytes} bytes). Starting ASR...")

        transcript = await run_in_threadpool(transcribe, str(out_path))

        print("✅ ASR finished. Returning response.")
        return {
            "transcript": transcript,
            "risk": "LOW",
            "score": 0.10,
            "reasons": ["ASR OK", f"File {size_bytes} bytes"],
            "saved_as": str(out_path),
        }

    except Exception as e:
        # This catches normal Python exceptions (NOT native crashes)
        print("❌ /calls/analyze failed:", repr(e))
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"error": str(e), "type": type(e).__name__},
        )
