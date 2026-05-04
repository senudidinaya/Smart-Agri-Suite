"""
Compare classifier choices for Gate 1 audio deception.

Mirrors compare_gate2_classifiers.py. Goal: produce a defensible artefact
that justifies the model type used for Gate 1 (currently GradientBoosting).

Protocol:
- Load the 16-feature tabular dataset (deception_audio_features.csv)
- Stratified 5-fold cross-validation
- Report accuracy, macro F1, ROC AUC (mean +/- std across folds)
- Candidates: GradientBoosting (current), HistGradientBoosting,
  RandomForest, calibrated LogisticRegression-L2

Saves results to compare_gate1_classifiers_results.json next to this script.
"""

from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Dict, List

import numpy as np
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import (
    GradientBoostingClassifier,
    HistGradientBoostingClassifier,
    RandomForestClassifier,
)
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score, roc_auc_score
from sklearn.model_selection import StratifiedKFold
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

SCRIPT_DIR = Path(__file__).parent
SUITE_ROOT = SCRIPT_DIR.parents[1]  # Smart-Agri-Suite/
DATA_CSV = SUITE_ROOT / "data" / "deception" / "gate1_audio" / "deception_audio_features.csv"
OUT_JSON = SCRIPT_DIR / "compare_gate1_classifiers_results.json"

RANDOM_SEED = 42
N_SPLITS = 5

FEATURES = [
    "duration_seconds",
    "rms_mean",
    "rms_std",
    "f0_mean",
    "f0_std",
    "zcr_mean",
    "spectral_centroid_mean",
    "tempo_proxy",
    "transcript_char_len",
    "transcript_word_count",
    "urgency_count",
    "money_count",
    "secrecy_count",
    "pressure_count",
    "id_avoidance_count",
    "otp_pin_count",
]


def make_classifier(name: str):
    if name == "GradientBoosting":
        # Current production model
        clf = GradientBoostingClassifier(
            n_estimators=200,
            learning_rate=0.05,
            max_depth=3,
            random_state=RANDOM_SEED,
        )
        return Pipeline([("scaler", StandardScaler()), ("clf", clf)])
    if name == "HistGradientBoosting":
        clf = HistGradientBoostingClassifier(
            max_iter=300,
            learning_rate=0.05,
            max_depth=None,
            random_state=RANDOM_SEED,
            class_weight="balanced",
        )
        return Pipeline([("scaler", StandardScaler()), ("clf", clf)])
    if name == "RandomForest":
        clf = RandomForestClassifier(
            n_estimators=200,
            min_samples_leaf=2,
            n_jobs=-1,
            random_state=RANDOM_SEED,
            class_weight="balanced",
        )
        return Pipeline([("scaler", StandardScaler()), ("clf", clf)])
    if name == "LogReg-L2":
        base = LogisticRegression(
            C=0.5,
            max_iter=2000,
            class_weight="balanced",
            random_state=RANDOM_SEED,
            solver="liblinear",
        )
        clf = CalibratedClassifierCV(base, method="sigmoid", cv=3)
        return Pipeline([("scaler", StandardScaler()), ("clf", clf)])
    raise ValueError(name)


CANDIDATES = ["GradientBoosting", "HistGradientBoosting", "RandomForest", "LogReg-L2"]


def cv_evaluate(name: str, X: np.ndarray, y: np.ndarray) -> Dict:
    skf = StratifiedKFold(n_splits=N_SPLITS, shuffle=True, random_state=RANDOM_SEED)
    accs: List[float] = []
    f1s: List[float] = []
    aucs: List[float] = []
    for fold, (tr, te) in enumerate(skf.split(X, y), start=1):
        model = make_classifier(name)
        model.fit(X[tr], y[tr])
        y_pred = model.predict(X[te])
        y_prob = model.predict_proba(X[te])[:, 1]
        accs.append(accuracy_score(y[te], y_pred))
        f1s.append(f1_score(y[te], y_pred, average="macro"))
        aucs.append(roc_auc_score(y[te], y_prob))
    return {
        "n_folds": N_SPLITS,
        "accuracy_mean": round(float(np.mean(accs)), 4),
        "accuracy_std": round(float(np.std(accs)), 4),
        "macro_f1_mean": round(float(np.mean(f1s)), 4),
        "macro_f1_std": round(float(np.std(f1s)), 4),
        "roc_auc_mean": round(float(np.mean(aucs)), 4),
        "roc_auc_std": round(float(np.std(aucs)), 4),
        "per_fold_accuracy": [round(float(a), 4) for a in accs],
    }


def main() -> None:
    t0 = time.time()
    print(f"[COMPARE-GATE1] loading {DATA_CSV}")
    df = pd.read_csv(DATA_CSV)
    print(f"[COMPARE-GATE1] rows={len(df)}  cols={len(df.columns)}")

    missing = [c for c in FEATURES + ["label"] if c not in df.columns]
    if missing:
        raise SystemExit(f"missing columns in CSV: {missing}")

    X = df[FEATURES].to_numpy(dtype=np.float64)
    y = df["label"].astype(int).to_numpy()
    pos = int(y.sum())
    neg = int(len(y) - pos)
    print(f"[COMPARE-GATE1] class balance: 0={neg}  1={pos}")

    rows = []
    for name in CANDIDATES:
        print(f"[COMPARE-GATE1] evaluating {name} with {N_SPLITS}-fold CV ...")
        metrics = cv_evaluate(name, X, y)
        rows.append({"model": name, "metrics": metrics})
        print(
            f"  acc={metrics['accuracy_mean']:.4f}+/-{metrics['accuracy_std']:.4f}  "
            f"f1={metrics['macro_f1_mean']:.4f}+/-{metrics['macro_f1_std']:.4f}  "
            f"auc={metrics['roc_auc_mean']:.4f}+/-{metrics['roc_auc_std']:.4f}"
        )

    rows_sorted = sorted(rows, key=lambda r: r["metrics"]["roc_auc_mean"], reverse=True)
    winner_auc = rows_sorted[0]["model"]
    rows_sorted_acc = sorted(rows, key=lambda r: r["metrics"]["accuracy_mean"], reverse=True)
    winner_acc = rows_sorted_acc[0]["model"]

    summary = {
        "evaluated_at_seconds": round(time.time() - t0, 1),
        "protocol": f"StratifiedKFold(n_splits={N_SPLITS}, shuffle=True, random_state={RANDOM_SEED})",
        "n_samples": int(len(y)),
        "n_features": len(FEATURES),
        "features": FEATURES,
        "class_balance": {"0": neg, "1": pos},
        "candidates": CANDIDATES,
        "results": rows,
        "winner_by_roc_auc": winner_auc,
        "winner_by_accuracy": winner_acc,
    }
    OUT_JSON.write_text(json.dumps(summary, indent=2))
    print(f"\n[SAVED] {OUT_JSON}")
    print(f"[WINNER by mean ROC-AUC] {winner_auc}")
    print(f"[WINNER by mean accuracy] {winner_acc}")


if __name__ == "__main__":
    main()
