# Cultivator Gate-2 Recovery Candidates

## Dataset Candidates

| Exact Path | What It Appears To Be | Usable? | Confidence | Next Action |
| --- | --- | --- | --- | --- |
| `c:\Projects\Senudi\Individual-Project\Smart-Agri-Suite\backend\data` | Real backend data root, but only deception/audio CSV evidence was found | No | High | Do not treat as Gate-2 dataset; keep searching or recover externally |
| `c:\Projects\Senudi\Individual-Project\Smart-Agri-Suite\backend\data\deception` | Deception training data directory | No | High | Ignore for Gate-2 emotion recovery |
| `c:\Projects\Senudi\Individual-Project\Smart-Agri-Suite\backend\data\gate2\dataset` | Intended dataset location inferred from code; not present | No | High | External recovery required |
| Any reachable local `angry/fear/happy/neutral/sad/surprise` image tree under `c:\Projects` | No valid candidate found | No | High | External recovery required |
| Any reachable local archive named `gate2_expression_dataset.zip` | No candidate found | No | High | External recovery required |

## Model Artifact Candidates

| Exact Path | What It Appears To Be | Usable? | Confidence | Next Action |
| --- | --- | --- | --- | --- |
| `c:\Projects\Senudi\Individual-Project\Smart-Agri-Suite\backend\models\gate2\gate2_class_names.json` | Surviving class-label file for emotion model | Partial only | High | Preserve as evidence; not sufficient for runtime recovery |
| `c:\Projects\Senudi\Individual-Project\Smart-Agri-Suite\backend\models\gate2\gate2_model_metadata.json` | Surviving metadata snapshot for emotion model | Partial only | High | Preserve as evidence; use to validate regeneration contract |
| `c:\Projects\Senudi\Merged-Project\Smart-Agri-Suite\backend\models\video_analysis\gate2_class_names.json` | Merged runtime class-label copy | Partial only | High | Preserve as evidence |
| `c:\Projects\Senudi\Merged-Project\Smart-Agri-Suite\backend\models\video_analysis\gate2_model_metadata.json` | Merged runtime metadata copy | Partial only | High | Preserve as evidence |
| `c:\Projects\Senudi\Merged-Project\Smart-Agri-Suite\backend\models\intent_prediction\gate2\gate2_class_names.json` | Duplicate runtime class-label copy | Partial only | High | Preserve as evidence |
| `c:\Projects\Senudi\Merged-Project\Smart-Agri-Suite\backend\models\intent_prediction\gate2\gate2_model_metadata.json` | Duplicate runtime metadata copy | Partial only | High | Preserve as evidence |
| `c:\Projects\Senudi\Individual-Project\Smart-Agri-Suite\backend\models\gate2\gate2_expression_model.pkl` | Required emotion model artifact; file absent | No | High | External dataset recovery then retrain |
| `c:\Projects\Senudi\Individual-Project\Smart-Agri-Suite\backend\models\gate2\gate2_scaler.pkl` | Required scaler artifact; file absent | No | High | External dataset recovery then retrain |
| `c:\Projects\Senudi\Merged-Project\Smart-Agri-Suite\backend\models\video_analysis\gate2_expression_model.pkl` | Required merged runtime artifact; file absent | No | High | Do not fabricate; regenerate only from real dataset |
| `c:\Projects\Senudi\Merged-Project\Smart-Agri-Suite\backend\models\video_analysis\gate2_scaler.pkl` | Required merged runtime artifact; file absent | No | High | Do not fabricate; regenerate only from real dataset |
| `c:\Projects\Senudi\Merged-Project\Smart-Agri-Suite\backend\models\intent_prediction\gate2\gate2_expression_model.pkl` | Alternate merged runtime artifact; file absent | No | High | Do not fabricate; regenerate only from real dataset |
| `c:\Projects\Senudi\Merged-Project\Smart-Agri-Suite\backend\models\intent_prediction\gate2\gate2_scaler.pkl` | Alternate merged runtime scaler; file absent | No | High | Do not fabricate; regenerate only from real dataset |

## Supporting Evidence Candidates

| Exact Path | What It Appears To Be | Usable? | Confidence | Next Action |
| --- | --- | --- | --- | --- |
| `c:\Projects\Senudi\Individual-Project\Smart-Agri-Suite\backend\scripts\train_gate2_expression_model.py` | Canonical surviving trainer for emotion branch | Yes | High | Use for exact regeneration after dataset recovery |
| `c:\Projects\Senudi\Individual-Project\Smart-Agri-Suite\backend\scripts\smoke_test_gate2_model.py` | Canonical smoke test for generated artifacts | Yes | High | Use after regeneration |
| `c:\Projects\Senudi\Individual-Project\Smart-Agri-Suite\backend\scripts\cloud_data_utils.py` | ZIP download/extract helper for `--data_url` path | Yes | High | Use only if a verified external dataset ZIP URL is obtained |
| `c:\Projects\Senudi\Merged-Project\Smart-Agri-Suite\backend\cultivator\services\gate2_inference.py` | Runtime contract and file-resolution logic | Yes | High | Use to validate final target filenames and placement |
| `c:\Projects\Senudi_research_docs\code_walkthrough_for_evaluators.md` | Documentation reference showing the missing emotion model once existed conceptually | Partial only | Medium | Treat as weak supporting evidence, not asset recovery |

