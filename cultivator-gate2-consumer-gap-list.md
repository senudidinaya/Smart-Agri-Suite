# Gate-2 Consumer Gap List

## Summary

All high-confidence truthfulness gaps found in this audit were fixed with tiny additive or label-only changes. No current consumer remains classified as broken after the fixes.

## Risky or Broken Consumers

| Consumer | Severity | Current pre-fix assumption | Why risky or wrong | Safest fix applied |
| --- | --- | --- | --- | --- |
| `backend/cultivator/schemas/explain.py` `Gate2InsightRequest` | Medium | `decision` / `confidence` described as generic prediction result. | The request now receives combined Gate-2 decision/confidence plus raw emotion evidence. Generic wording could imply raw emotion confidence. | Updated descriptions to say combined Gate-2 final decision/overall confidence and raw emotion branch evidence. |
| `backend/cultivator/api/v1/endpoints/explain.py` `explain_gate2` | Low | Endpoint summary/description described video interview analysis generically. | API docs could imply the endpoint explains raw video emotion output rather than the combined assessment. | Updated summary, description, and function docstring to combined Gate-2 assessment wording. |
| `backend/cultivator/services/deepseek_service.py` `generate_gate2_insight` | Medium | Prompt described Gate-2 video interview analysis generically. | The prompt could ask DeepSeek to explain combined confidence as if it were emotion-only confidence. | Updated docstring and prompt preface to distinguish combined assessment from raw emotion evidence. |
| `backend/cultivator/api/v1/endpoints/jobs.py` `get_job_interview_analyses` | Medium | Returned only legacy top-level and raw emotion fields. | It discarded `rawEmotion`, `rawDeception`, and `combinedAssessment`, making downstream consumers depend on ambiguous top-level fields. | Added raw/combined fields additively and mapped new `gate2_*` raw emotion keys with legacy fallback. |
| `frontend/src/features/cultivator/screens/AdminApplicationsScreen.tsx` analysis modal | Medium | Displayed Gate-2 section as generic interview analysis and `confidence` as generic confidence. | Combined confidence was shown directly next to raw emotion fields without explaining the distinction. | Renamed the section to combined assessment, relabeled confidence, and added a short note that raw emotion evidence is shown below. |
| `frontend/src/features/cultivator/screens/InPersonInterviewScreen.tsx` result screen | Medium | Displayed top-level `confidence` as `Confidence`. | That label no longer distinguishes combined Gate-2 confidence from raw emotion model confidence. | Relabeled it to `Overall Gate-2 Confidence`. |
| `frontend/src/features/cultivator/screens/ViewAnalysisScreen.tsx` job analysis list | Medium | Labeled the section `Video Emotion Analyses (Gate-2)` while showing `analysisDecision` and `confidence`. | The section implied raw emotion analysis, but those fields now carry combined Gate-2 final semantics. | Renamed section to combined interview assessments and relabeled confidence as overall Gate-2 confidence. |

## Ambiguous but Not Modified

| Consumer | Reason no code change was made |
| --- | --- |
| `frontend/src/features/cultivator/screens/AdminApplicationsScreen.tsx` status card `Interview Result` | This already reads as a final result rather than raw emotion. |
| Raw emotion distribution / dominant emotion sections | These sections use raw emotion-specific fields and labels, so they remain semantically correct. |
| Gate-1 call screens | They are not Gate-2 consumers and continue to use Gate-1 confidence semantics. |
| `backend/cultivator/services/decision_engine.py` old Gate-2 helper | Search did not show it as active in the current Gate-2 interview flow. |

## Remaining Gaps

None classified as broken or risky in the current audited paths.

## Future UI Opportunity

A future admin UI pass should render `combinedAssessment.reasoning`, `combinedAssessment.degradedBranches`, `rawEmotion`, and `rawDeception` as separate evidence panels. That is not required to fix the current top-level `decision` / `confidence` compatibility risk.
