# Cultivator Gate-1 Feature Mismatch Diff Report

## Files Changed

- `backend/cultivator/services/inference.py`

## Exact Code-Path Impact

Changed scope:

- `Gate1DeceptionDetector.__init__`
- `Gate1DeceptionDetector.load_model`
- `Gate1DeceptionDetector.predict`

Impact:

- Gate-1 deception artifacts are now validated against the active runtime feature contract
- stale artifact bundles no longer crash post-call analysis
- rules-based deception fallback is used when artifact/runtime mismatch is detected

## Temporary Logs Added

- loaded Gate-1 deception model path
- loaded Gate-1 deception scaler path
- metadata version
- runtime feature count
- expected artifact feature count
- runtime feature names
- mismatch/fallback reason
- entry into scaler/model path

## Anything Intentionally Not Changed

- `calls.py`
- `combined_analysis.py`
- frontend code
- database schema
- model artifacts
- training/export scripts

## Notes

This patch does not claim to restore the ML deception model itself. It prevents the stale artifact mismatch from breaking call analysis and makes the root cause explicit in logs.
