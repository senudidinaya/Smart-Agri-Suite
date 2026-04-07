# Cultivator Gate-2 Recovery Blockers

## Blocking Items

| Blocker | Blocks Direct Recovery? | Blocks Regeneration? | Requires External Follow-up? | Notes |
| --- | --- | --- | --- | --- |
| No local `data/gate2/dataset` recovered | Yes | Yes | Yes | No real folder-per-class emotion dataset was found |
| No local `gate2_expression_model.pkl` recovered | Yes | No | No | Missing artifact prevents direct restoration |
| No local `gate2_scaler.pkl` recovered | Yes | No | No | Missing artifact prevents direct restoration |
| No local archive such as `gate2_expression_dataset.zip` recovered | Yes | Yes | Yes | No dataset ZIP exists in reachable local project space |
| No Git history for missing emotion artifacts | Yes | No | No | Tracked history does not preserve a prior copy |
| External dataset URL is not preserved locally | No | Yes | Yes | Dataset clue exists, but exact download URL must be recovered externally |
| Historical metadata quality is uncertain | No | No | No | Preserved metrics look unusually perfect and should not be trusted as proof of model quality |

## Net Effect

- Direct local artifact recovery is blocked.
- Truthful local regeneration is blocked until the real dataset is externally recovered.
- Once the real dataset is recovered, regeneration is straightforward using the surviving trainer and smoke test.

