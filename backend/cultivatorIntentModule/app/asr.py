import os
from threading import Lock

# Make Windows CPU behavior more predictable
os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("MKL_NUM_THREADS", "1")

from faster_whisper import WhisperModel

_model = None
_lock = Lock()

def get_model() -> WhisperModel:
    global _model
    with _lock:
        if _model is None:
            print("🔧 Creating WhisperModel (CPU, float32, 1 thread)...")
            _model = WhisperModel(
                "tiny",              # <-- start with tiny (most stable). Upgrade later.
                device="cpu",
                compute_type="float32",
                cpu_threads=1,
                num_workers=1,
            )
            print("🔧 WhisperModel created.")
        return _model

def transcribe(path: str) -> str:
    model = get_model()
    segments, info = model.transcribe(path, beam_size=1)
    return " ".join(s.text.strip() for s in segments).strip()
