# Cultivator Client Recording Race Diff Report

## Files Changed

- `frontend/src/features/cultivator/hooks/useAgora.ts`
- `frontend/src/features/cultivator/screens/ClientCallScreen.tsx`

## Exact Code-Path Impact

### `useAgora.ts`

- Added `isRecordingStarting` to the public hook return type.
- `startLocalRecording()` now marks recording start as in-flight before calling the native API and clears that flag on success or failure.
- `stopLocalRecording()` clears `isRecordingStarting` before stop handling.
- Added a small lifecycle log effect for recording state transitions.

### `ClientCallScreen.tsx`

- Added `callEndingRef` to latch the call-ending transition.
- Added `isEndingCall` for local duplicate-end protection and clearer UI state.
- The post-join delayed recording-start effect now:
  - logs recording start intent
  - suppresses late start before first attempt
  - suppresses retries while ending
  - logs when a start attempt resolves after ending has already begun
- `handleEndCall()` now:
  - ignores duplicate requests
  - logs whether recording is actually ready
  - only stops/uploads when `isRecording` is true
  - resets the ending latch if the end flow fails before reaching `ended`
- `handleCallEndedByOther()` uses the same deterministic gating.
- The End Call button is disabled while a local end flow is already in progress.

## Temporary Logs Added

- `[CultivatorRecording] Recording lifecycle state`
- `[CultivatorRecordingRace] Recording start requested after channel join`
- `[CultivatorRecordingRace] Recording start completed`
- `[CultivatorRecordingRace] Suppressing late recording start ...`
- `[CultivatorRecordingRace] Client call lifecycle snapshot`
- `[CultivatorRecordingRace] Recording not ready at end-call; stop/upload path will be skipped`
- `[CultivatorRecordingRace] Recording is ready, stopping and preparing upload`
- duplicate-end suppression logs

## Intentionally Not Changed

- No backend code
- No upload contract
- No auth flow
- No routing architecture
- No call-analysis logic
