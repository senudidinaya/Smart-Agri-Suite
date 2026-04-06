# Cultivator Quick-End And UI Consistency Gap List

## 1. Mixed call-analysis views across screens

- Severity: Medium
- Proof files/functions:
  - `frontend/src/features/cultivator/screens/ViewAnalysisScreen.tsx` -> `fetchAnalyses()`
  - `frontend/src/features/cultivator/screens/AdminApplicationsScreen.tsx` -> `handleViewCallAssessment()`
  - `backend/cultivator/api/v1/endpoints/jobs.py` -> `get_job_call_analyses()`
  - `backend/cultivator/api/v1/endpoints/interviews.py` -> `get_interview_status()`
- Why it matters:
  - one screen shows raw Gate-1 intent analysis
  - another shows combined final call decision summary
  - users may interpret this as inconsistent results for the same call
- Safe to defer: yes, but it is a user-visible truthfulness issue

## 2. Combined decision paired with raw confidence in admin UI

- Severity: Medium
- Proof files/functions:
  - `frontend/src/features/cultivator/screens/AdminApplicationsScreen.tsx` -> call assessment badge and modal
  - `backend/cultivator/api/v1/endpoints/calls.py` -> `call_assessment["decision"]` and `call_assessment["confidence"]`
- Why it matters:
  - the badge/modal displays `decision` from combined analysis
  - the percentage shown is raw intent confidence, not trust score or combined-decision confidence
- Safe to defer: yes, but misleading if left unexplained

## 3. Persisted combined-analysis fields not exposed in frontend types/views

- Severity: Low
- Proof files/functions:
  - `frontend/src/features/cultivator/services/api.ts` -> `CallAssessment` interface
  - `frontend/src/features/cultivator/screens/ViewAnalysisScreen.tsx`
  - `frontend/src/features/cultivator/screens/AdminApplicationsScreen.tsx`
- Why it matters:
  - backend persists `recommendation`, `trustScore`, `riskLevel`, `reasoning`, deception fields
  - frontend cannot display them because they are not part of the active type/view path
- Safe to defer: yes
