# Cultivator Admin Analysis UI Polish Validation

## Manual Validation Steps On Phone

1. Log in as an admin/interviewer user on a phone.
2. Complete a call that produces a successful raw Gate-1 result.
3. Observe the ended-call screen immediately after the call.
4. Navigate back to the admin applications list.
5. Find a job with a call assessment and inspect the job-card summary.
6. Tap `View Full Analysis` and inspect the modal on the same phone.

## What The Admin Ended-Call Screen Should Now Look/Feel Like

- The `Raw Voice Intent Analysis` block should feel like a clear result card, not a dense text cluster.
- The intent badge should be easy to spot.
- `Intent confidence` should sit clearly below the badge.
- The raw score breakdown should look like a separate sub-section inside the result card.
- The `Close` button should feel wider and easier to tap.

## What The Admin Job-Card Summary Should Now Look/Feel Like

- `Final Call Decision` should read like a compact summary block rather than a cramped row.
- The decision badge should stand on its own visually.
- `Raw intent confidence` should sit underneath with enough breathing room.
- `View Full Analysis` should have cleaner separation from the summary and feel easier to tap.

## What The Full-Analysis Modal Should Now Look/Feel Like

- `Final Call Assessment` should stand out immediately.
- The user should be able to scan in this order:
  1. final combined decision
  2. raw intent confidence
  3. explanatory note
  4. raw intent score breakdown
- The explanatory note should wrap comfortably and not feel jammed into the same visual block as the badge.
- Score rows should feel cleaner and less crowded.

## What Would Count As Over-Polished Or Semantically Misleading

- turning the raw confidence line into a dominant headline that competes with the final decision
- visually merging raw metrics back into the final-decision badge
- adding new labels that blur raw and final analysis meaning
- making the screen flashy at the expense of scanability on a phone
