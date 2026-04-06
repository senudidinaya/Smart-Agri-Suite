# Cultivator Combined Analysis Fix Report

## Summary

This follow-up fixes the specific contract mismatch between the call-analysis upload path and the combined-decision helper.

Before the fix, `backend/cultivator/api/v1/endpoints/calls.py` passed an intent payload shaped like:

- `intentLabel`
- `confidence`
- `scores`

But `backend/cultivator/services/combined_analysis.py` expects:

- `predicted_intent`
- `confidence`
- `all_scores`

Because of that mismatch, the helper fell back to its `"UNKNOWN"` intent path and could produce the wrong combined decision even when raw intent classification succeeded.

## Verified Mismatch

### Caller in `calls.py`

`upload_recording(...)` was building:

```python
intent_analysis = {
    "intentLabel": prediction_result.predicted_intent,
    "confidence": prediction_result.confidence,
    "scores": {score.label: score.score for score in prediction_result.all_scores},
}
```

and then calling:

```python
combined_decision = combine_intent_and_deception(
    intent_analysis,
    deception_result,
)
```

### Helper contract in `combined_analysis.py`

`combine_intent_and_deception(...)` reads:

```python
intent_label = intent_result.get("predicted_intent", "UNKNOWN")
...
"scores": intent_result.get("all_scores", [])
```

So the active call site was passing the wrong keys for both the intent label and score payload.

## Fix Strategy Chosen

Chosen strategy: **normalize the caller payload in `calls.py` to the helper's existing contract**.

Reason:

- It is the smallest correct change.
- It preserves the existing public/helper contract in `combined_analysis.py`.
- It avoids changing shared helper semantics when there is only one live caller.
- It keeps the raw persisted `analysis.intentLabel` / `analysis.scores` shape intact.

## Files Changed

- `backend/cultivator/api/v1/endpoints/calls.py`

## Exact Fields Normalized / Corrected

Added a helper input object for the combined-decision step:

```python
combined_intent_input = {
    "predicted_intent": prediction_result.predicted_intent,
    "confidence": prediction_result.confidence,
    "all_scores": intent_analysis["scores"],
}
```

and changed the helper call to:

```python
combined_decision = combine_intent_and_deception(
    combined_intent_input,
    deception_result,
)
```

## Persisted Output Impact

The corrected combined decision now flows into these persisted fields in `db.calls.analysis`:

- `finalDecision`
- `finalRecommendation`
- `trustScore`
- `reasoning`
- `riskLevel`

The same corrected decision then flows into `db.call_assessments`:

- `decision`
- `recommendation`
- `trustScore`
- `riskLevel`
- `reasoning`

Raw intent fields remain unchanged:

- `analysis.intentLabel`
- `analysis.confidence`
- `analysis.scores`

## Verification Table

| file/function | before | after | impact |
| --- | --- | --- | --- |
| `calls.py -> upload_recording` | passed `intentLabel` / `scores` into combined helper | passes `predicted_intent` / `all_scores` into combined helper | combined decision logic now receives the intent shape it expects |
| `calls.py -> analysis persistence` | persisted `finalDecision` and related fields could be derived from `"UNKNOWN"` intent fallback | persisted combined fields derive from actual predicted intent | `db.calls.analysis` summary fields become correct |
| `calls.py -> call_assessments upsert` | `decision` and related summary fields could be wrong downstream | summary fields now reflect the corrected combined decision | `db.call_assessments` decisioning becomes correct |

## Whether the Original Audit Bug Is Fully Closed

Yes, within the stated scope.

There is only one live caller of `combine_intent_and_deception(...)` in the backend, and it now passes the correct contract.
