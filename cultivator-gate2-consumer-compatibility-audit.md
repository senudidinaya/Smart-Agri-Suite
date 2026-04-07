# Gate-2 Consumer Compatibility Audit

## Executive Summary

This audit validates current consumers of top-level Gate-2 `decision` / `confidence` after the combined-assessment contract change.

Verdict: top-level `decision` and `confidence` now represent the conservative combined Gate-2 result, not raw emotion-only output. Most consumers were structurally compatible, but several labels and explanation paths were semantically ambiguous because they still sounded emotion-only or generic. Tiny fixes were applied to make those paths truthful without changing ML behavior, runtime aggregation, or UI flow.

## Source-of-Truth Semantics Table

| Field | Current meaning | Evidence |
| --- | --- | --- |
| `decision` in analyze response | `combinedAssessment.finalDecision` | `backend/cultivator/api/v1/endpoints/interviews.py` assigns `decision = combined_assessment["finalDecision"]` after aggregation. |
| `confidence` in analyze response | `combinedAssessment.overallConfidence` | `backend/cultivator/api/v1/endpoints/interviews.py` assigns `confidence = combined_assessment["overallConfidence"]` after aggregation. |
| `analysisDecision` persisted / retrieved | Combined Gate-2 final decision | `interviews.py` persists `"analysisDecision": decision` after combined aggregation. |
| Persisted `confidence` | Combined Gate-2 overall confidence | `interviews.py` persists `"confidence": confidence` after combined aggregation. |
| `rawEmotion.confidence` | Raw emotion branch confidence | `backend/cultivator/schemas/interview.py` defines `Gate2RawEmotion.confidence`; `gate2_combined_assessment.py` builds it from the emotion result. |
| `rawDeception.confidence` | Raw visual-deception branch confidence | `backend/cultivator/schemas/interview.py` defines `Gate2RawDeception.confidence`; `gate2_combined_assessment.py` builds it from the deception result. |
| `combinedAssessment.overallConfidence` | Conservative combined Gate-2 confidence | `backend/cultivator/schemas/interview.py` and `gate2_combined_assessment.py` define the combined result. |
| Legacy emotion fields | Raw emotion evidence retained for compatibility | `interviews.py` persists `gate2_emotion_distribution`, `gate2_dominant_emotion`, `gate2_top_signals`, `gate2_stats`, and `gate2_model_version`. |

## Consumer Inventory

| Consumer | Fields read | Pre-fix semantic behavior | Classification after fixes |
| --- | --- | --- | --- |
| `backend/cultivator/api/v1/endpoints/interviews.py` analyze endpoint | `combinedAssessment.finalDecision`, `combinedAssessment.overallConfidence` | Correctly assigns top-level fields from combined assessment. | A. SAFE |
| `backend/cultivator/api/v1/endpoints/interviews.py` `_serialize_interview` | `analysisDecision`, `confidence`, `rawEmotion`, `rawDeception`, `combinedAssessment` | Correctly returns combined top-level fields and explicit raw/combined branches. | A. SAFE |
| `backend/cultivator/api/v1/endpoints/jobs.py` `get_job_interview_analyses` | `analysisDecision`, `confidence`, legacy raw emotion fields | Dropped `rawEmotion`, `rawDeception`, and `combinedAssessment`; used older raw emotion key names only. | A. SAFE after additive mapper fix |
| `frontend/src/features/cultivator/services/api.ts` response interfaces | `decision`, `confidence`, `analysisDecision`, raw/combined fields | Types include combined and raw contracts. | A. SAFE |
| `frontend/src/features/cultivator/services/api.ts` `getGate2Insight` | `decision`, `confidence`, emotion evidence | Transport method is generic; backend schema/prompt needed clarification. | A. SAFE after backend explanation wording fix |
| `backend/cultivator/api/v1/endpoints/explain.py` Gate-2 insight endpoint | `Gate2InsightRequest.decision`, `Gate2InsightRequest.confidence` | Endpoint documentation described video interview analysis generically. | A. SAFE after documentation wording fix |
| `frontend/src/features/cultivator/screens/AdminApplicationsScreen.tsx` status card | `analysisDecision` | Displays `Interview Result`; acceptable as final Gate-2 result. | A. SAFE |
| `frontend/src/features/cultivator/screens/AdminApplicationsScreen.tsx` analysis modal | `analysisDecision`, `confidence`, raw emotion fields | Section title and confidence label were ambiguous beside raw emotion details. | A. SAFE after label/note fix |
| `frontend/src/features/cultivator/screens/InPersonInterviewScreen.tsx` result screen | `decision`, `confidence`, raw emotion fields | Label said only `Confidence` while using combined confidence. | A. SAFE after label fix |
| `frontend/src/features/cultivator/screens/ViewAnalysisScreen.tsx` job analysis list | `analysisDecision`, `confidence`, raw emotion fields | Section title said `Video Emotion Analyses` and confidence label was generic while using combined fields. | A. SAFE after label/title fix |
| `frontend/src/features/cultivator/screens/AdminCallScreen.tsx` | Gate-1 call `confidence` | Uses Gate-1 call result, not Gate-2. | Out of scope / safe |
| `frontend/src/features/cultivator/screens/ClientCallScreen.tsx` | Gate-1 call result | Uses Gate-1 upload/call flow, not Gate-2. | Out of scope / safe |
| `backend/cultivator/services/decision_engine.py` | Internal old Gate-2 decision helper | Not referenced by active Gate-2 interview flow in the search results. | Not an active consumer |

## Consumer Classification Table

| Classification | Consumers |
| --- | --- |
| A. SAFE | `interviews.py` analyze/serialize paths, `api.ts` interfaces, AdminApplications status card |
| A. SAFE after tiny fix | `jobs.py` job interview mapper, `deepseek_service.py` Gate-2 insight wording, `explain.py` Gate-2 insight endpoint/schema descriptions, AdminApplications modal, InPersonInterview result confidence label, ViewAnalysis Gate-2 section |
| B. SAFE BUT EXPLICIT RAW | Raw emotion/deception branch displays such as emotion distribution and deception confidence sections |
| C. RISKY / AMBIGUOUS | None remaining after fixes |
| D. BROKEN | None remaining after fixes |

## Exact Compatibility Verdict

Top-level `decision` and `confidence` are compatible only when treated as combined Gate-2 final semantics. After the tiny fixes, active consumers either label them as combined/overall Gate-2 fields or use raw branch fields explicitly for raw evidence.

No ML behavior, aggregation thresholds, or Gate-1 behavior were changed.

## Gap List

The pre-fix gaps were:

| Gap | Severity | Fixed? |
| --- | --- | --- |
| Gate-2 explanation schema/prompt described generic prediction confidence while callers pass combined confidence. | Medium | Yes |
| Job interview analysis mapper discarded `rawEmotion`, `rawDeception`, and `combinedAssessment`. | Medium | Yes |
| Admin application modal showed combined confidence as generic confidence next to raw emotion evidence. | Medium | Yes |
| In-person interview result screen showed combined confidence as generic confidence. | Medium | Yes |
| View Analysis screen labeled combined Gate-2 results as video emotion analyses. | Medium | Yes |

## Recommended Next Actions

Keep the current additive contract. In a future UI pass, consider rendering `combinedAssessment.reasoning`, `degradedBranches`, and `rawDeception` more visibly for admin review, but that should be a dedicated UI task rather than part of this compatibility audit.
