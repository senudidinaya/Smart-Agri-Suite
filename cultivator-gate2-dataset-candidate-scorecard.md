# Cultivator Gate-2 Dataset Candidate Scorecard

| Exact Path | Label Compatibility Verdict | Quality Verdict | Training Readiness Verdict | Rank | Confidence | Next Action |
| --- | --- | --- | --- | --- | --- | --- |
| `c:\Projects\Senudi\Merged-Project\Smart-Agri-Suite\backend\media\photos` | Incompatible: numeric folders, no six-class emotion labels, no honest mapping | Low trust for this task: mixed content, includes non-face images and screenshots, tiny per-folder counts | Cannot be used by current trainer without unsafe relabeling | D | High | Reject for Gate-2 emotion training |
| `c:\Projects\Senudi\Individual-Project\Smart-Agri-Suite\backend\data\deception` | Incompatible: deception task, not six emotion classes | Wrong modality/task for emotion training | Current emotion trainer cannot use it meaningfully | D | High | Reject; do not reuse directly |
| `c:\Projects\Senudi\Merged-Project\Smart-Agri-Suite\frontend\assets\images` | Incompatible: app/media assets, no class labels | Not a face dataset | Not a training candidate | D | High | Reject |
| No local six-class dataset root found in searched workspace/project area | No compatible candidate present | No dataset to assess further | No training candidate available | D | High | Wait for a real staged replacement dataset |

