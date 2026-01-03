from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import os, uuid, subprocess, json
from faster_whisper import WhisperModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    # allow_origins=["*"],
    # allow_credentials=True,
    allow_origins=[
        "http://localhost:8081",
        "http://127.0.0.1:8081",
    ],
    allow_credentials=False,  # set True only if you really use cookies
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_SIZE = os.getenv("WHISPER_MODEL", "small")
DEVICE = os.getenv("WHISPER_DEVICE", "cpu")  # "cuda" if you have GPU
COMPUTE_TYPE = os.getenv("WHISPER_COMPUTE_TYPE", "int8")

model = WhisperModel(MODEL_SIZE, device=DEVICE, compute_type=COMPUTE_TYPE)

UPLOAD_DIR = os.path.join(os.getcwd(), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.get("/health")
def health():
    return {"ok": True}

def ffmpeg_to_wav(in_path: str, out_path: str):
    # 16kHz mono wav for whisper + prosody
    cmd = [
        "ffmpeg", "-y",
        "-i", in_path,
        "-ac", "1",
        "-ar", "16000",
        out_path
    ]
    subprocess.check_call(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def simple_risk(transcript: str):
    t = transcript.lower()

    flags = []
    score = 0.10

    urgent = ["urgent", "immediately", "asap", "help me now", "emergency"]
    nic_refusal = ["no nic", "can't give nic", "won't give nic", "don't have nic"]

    if any(k in t for k in urgent):
        flags.append("Urgency language detected")
        score += 0.35

    if any(k in t for k in nic_refusal):
        flags.append("NIC refusal detected")
        score += 0.35

    score = max(0.0, min(1.0, score))

    if score >= 0.7:
        risk = "HIGH"
    elif score >= 0.4:
        risk = "MEDIUM"
    else:
        risk = "LOW"

    return risk, score, flags

@app.post("/calls/analyze")
async def analyze_call(file: UploadFile = File(...)):
    ext = os.path.splitext(file.filename or "")[1] or ".bin"
    raw_name = f"{uuid.uuid4().hex}{ext}"
    raw_path = os.path.join(UPLOAD_DIR, raw_name)

    with open(raw_path, "wb") as f:
        f.write(await file.read())

    wav_name = f"{uuid.uuid4().hex}.wav"
    wav_path = os.path.join(UPLOAD_DIR, wav_name)

    ffmpeg_to_wav(raw_path, wav_path)

    # Real transcription
    segments, info = model.transcribe(wav_path, language="en")
    transcript = " ".join([seg.text.strip() for seg in segments]).strip()

    risk, score, flags = simple_risk(transcript)

    return {
        "saved_as": os.path.basename(raw_path),
        "language": info.language,
        "risk": risk,
        "score": round(score, 2),
        "transcript": transcript,
        "reasons": flags
    }
