"""
Compare classifier choices for Gate 2 visual deception.

Reuses the same feature pipeline + splits as the main training script.
Goal: find whether HistGradientBoosting or calibrated LogisticRegression
generalizes better than the current RandomForest under the
subject-independent protocol (no inference changes).

Saves the WINNER to the production paths if it materially improves over the
current RF baseline; otherwise leaves existing artifacts alone.
"""

from __future__ import annotations

import json
import sys
import time
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import (
    HistGradientBoostingClassifier,
    RandomForestClassifier,
)
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score
from sklearn.preprocessing import StandardScaler

# Reuse all helpers from the main training script
SCRIPT_DIR = Path(__file__).parent
sys.path.insert(0, str(SCRIPT_DIR))
from train_gate2_deception_realtrial import (  # noqa: E402
    CLASS_NAMES,
    RANDOM_SEED,
    build_dataset,
    clip_stratified_split,
    subject_independent_split,
)


def evaluate_clip_level(
    clf,
    scaler: StandardScaler,
    X_test: np.ndarray,
    y_test: np.ndarray,
    clip_ids_test: np.ndarray,
) -> Dict[str, float]:
    X_test_s = scaler.transform(X_test)
    probs = clf.predict_proba(X_test_s)

    by_clip_sum: Dict[str, np.ndarray] = {}
    by_clip_count: Dict[str, int] = {}
    by_clip_truth: Dict[str, int] = {}
    for clip, true_lbl, p in zip(clip_ids_test, y_test, probs):
        if clip not in by_clip_sum:
            by_clip_sum[clip] = np.zeros_like(p, dtype=np.float64)
            by_clip_count[clip] = 0
            by_clip_truth[clip] = int(true_lbl)
        by_clip_sum[clip] += p
        by_clip_count[clip] += 1

    y_true = np.asarray([by_clip_truth[c] for c in by_clip_sum])
    y_pred = np.asarray(
        [int(np.argmax(by_clip_sum[c] / by_clip_count[c])) for c in by_clip_sum]
    )
    return {
        "n_clips": int(len(y_true)),
        "accuracy": round(float(accuracy_score(y_true, y_pred)), 4),
        "macro_f1": round(float(f1_score(y_true, y_pred, average="macro")), 4),
    }


def make_classifier(name: str):
    if name == "RandomForest":
        return RandomForestClassifier(
            n_estimators=200,
            min_samples_leaf=2,
            n_jobs=-1,
            random_state=RANDOM_SEED,
            class_weight="balanced",
        )
    if name == "HistGradientBoosting":
        return HistGradientBoostingClassifier(
            max_iter=300,
            learning_rate=0.05,
            max_depth=None,
            random_state=RANDOM_SEED,
            class_weight="balanced",
        )
    if name == "LogReg-L2":
        # CalibratedClassifierCV ensures predict_proba is well-behaved
        base = LogisticRegression(
            C=0.5,
            max_iter=2000,
            class_weight="balanced",
            random_state=RANDOM_SEED,
            solver="liblinear",
        )
        return CalibratedClassifierCV(base, method="sigmoid", cv=3)
    raise ValueError(name)


CANDIDATES = ["RandomForest", "HistGradientBoosting", "LogReg-L2"]


def main() -> None:
    t0 = time.time()
    print("[COMPARE] building dataset (frames + features)")
    X, y, clip_ids, speakers = build_dataset()
    clip_arr = np.asarray(clip_ids)

    # Two splits, like the main script
    si_train, si_test = subject_independent_split(speakers, y, test_frac=0.20)
    cl_train, cl_test = clip_stratified_split(clip_ids, y, test_frac=0.20)

    splits = [
        ("subject_independent", si_train, si_test),
        ("clip_stratified", cl_train, cl_test),
    ]

    rows: List[Tuple[str, str, Dict[str, float]]] = []
    for split_name, train_mask, test_mask in splits:
        for name in CANDIDATES:
            scaler = StandardScaler()
            X_train_s = scaler.fit_transform(X[train_mask])
            clf = make_classifier(name)
            clf.fit(X_train_s, y[train_mask])
            metrics = evaluate_clip_level(
                clf, scaler, X[test_mask], y[test_mask], clip_arr[test_mask]
            )
            rows.append((split_name, name, metrics))
            print(
                f"[{split_name:22s}] {name:22s} "
                f"clip_acc={metrics['accuracy']:.4f} "
                f"clip_f1={metrics['macro_f1']:.4f} n={metrics['n_clips']}"
            )

    # Select winner by clip-stratified accuracy (more reliable n than 11)
    cl_rows = [r for r in rows if r[0] == "clip_stratified"]
    cl_rows.sort(key=lambda r: r[2]["accuracy"], reverse=True)
    winner_name = cl_rows[0][1]
    print(f"\n[WINNER by clip-stratified clip-level acc] {winner_name}")

    # Print winning combination's both-split metrics
    print("[WINNER metrics]")
    for split_name, name, metrics in rows:
        if name == winner_name:
            print(f"  {split_name}: {metrics}")

    summary = {
        "evaluated_at_seconds": round(time.time() - t0, 1),
        "candidates": CANDIDATES,
        "results": [
            {"split": s, "model": n, "metrics": m} for (s, n, m) in rows
        ],
        "winner_by_clip_stratified": winner_name,
    }
    out = SCRIPT_DIR / "compare_gate2_classifiers_results.json"
    out.write_text(json.dumps(summary, indent=2))
    print(f"\n[SAVED] {out}")


if __name__ == "__main__":
    main()
