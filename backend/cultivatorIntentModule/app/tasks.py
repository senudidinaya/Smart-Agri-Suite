import os, json
import numpy as np
import librosa

SR = 16000

def prosody_features(path):
    y, sr = librosa.load(path, sr=SR, mono=True)
    dur = len(y) / sr

    rms = librosa.feature.rms(y=y)[0]
    f0 = librosa.yin(y, fmin=50, fmax=400, sr=sr)
    f0 = f0[np.isfinite(f0)]

    zcr = librosa.feature.zero_crossing_rate(y)[0]
    centroid = librosa.feature.spectral_centroid(y=y, sr=sr)[0]

    return {
        "duration_s": float(dur),
        "rms_mean": float(np.mean(rms)),
        "rms_std": float(np.std(rms)),
        "f0_mean": float(np.mean(f0)) if len(f0) else 0.0,
        "f0_std": float(np.std(f0)) if len(f0) else 0.0,
        "zcr_mean": float(np.mean(zcr)),
        "centroid_mean": float(np.mean(centroid)),
    }

def analyze_call(audio_path: str):
    # For now: only prosody. (Later we add ASR + red-flag cues + score)
    pros = prosody_features(audio_path)

    # save result next to file
    out_path = audio_path + ".json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump({"audio_path": audio_path, "prosody": pros}, f, indent=2)

    return {"audio_path": audio_path, "prosody": pros, "saved": out_path}
