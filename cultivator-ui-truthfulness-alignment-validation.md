# Cultivator UI Truthfulness Alignment Validation

## Manual Validation Steps

1. Log in as an interviewer/admin user.
2. Open a job entry that already has a completed call assessment.
3. On `AdminApplicationsScreen`, inspect the summary row.
4. Tap `View Full Analysis` to open the modal.
5. Open `View Analysis` for the same job.
6. If available, open an `AdminCallScreen` ended state after a successful call analysis.

## What AdminApplicationsScreen Should Now Show

### Summary row

- Label: `Final Call Decision:`
- Badge text: only the final combined decision, such as `PROCEED`
- Separate line below badge:
  - `Raw intent confidence: XX%`

It should no longer show:

- `PROCEED (95%)` as if `95%` were the certainty of the final combined decision

### Modal

- Section title: `Final Call Assessment`
- Combined final decision in the badge
- Confidence line:
  - `Raw intent confidence: XX%`
- Score section title:
  - `Raw Intent Score Breakdown`
- Explanatory hint clarifying that the decision is combined while the percentage is raw Gate-1 intent confidence

## What ViewAnalysisScreen Should Now Show

- Section title:
  - `Raw Voice Intent Analyses (Gate-1)`
- Each call card should show:
  - raw intent label
  - `Intent confidence: XX%`
  - `Raw Intent Scores`

It should remain a raw-analysis screen, not a combined-summary screen.

## What AdminCallScreen Should Now Show

- Title:
  - `Raw Voice Intent Analysis`
- Confidence line:
  - `Intent confidence: XX%`
- Score section:
  - `Raw Intent Scores`

## What Would Still Count As Misleading

- a combined decision badge displayed with an unlabeled `95% confidence`
- wording that suggests raw intent confidence is the certainty of the final combined decision
- a raw Gate-1 screen that is labeled as if it were the final combined assessment
