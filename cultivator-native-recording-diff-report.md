# Cultivator Native Recording Diff Report

## Files Changed

- `frontend/src/features/cultivator/hooks/useAgora.ts`

## Exact Code-Path Impact

### Recording start

Changed:

- added `RecorderState` / `RecorderReasonCode` imports from the Agora module
- derived both:
  - JS `recordingUri`
  - Android-native `nativeFilePath`
- passed `nativeFilePath` into `startAudioRecording(...)`

Impact:

- Agora now receives the absolute native path shape its own contract expects

### Recording lifecycle visibility

Changed:

- added `onRecorderStateChanged` logging in the engine event handler
- expanded Agora error mapping for recording-device failures:
  - `1011`
  - `1012`
  - `1013`

Impact:

- native recording failures are now surfaced instead of remaining implicit

### Recording stop / file finalization

Changed:

- logged `stopAudioRecording()` result
- preserved returned JS URI
- added short repeated file inspection after stop

Impact:

- avoids assuming the file is ready immediately on the first JS tick after stop

## Temporary Logs Added

- `[CultivatorRecording] Starting local recording:`
- `[CultivatorRecording] startAudioRecording result:`
- `[CultivatorRecording] Recorder state changed:`
- `[CultivatorRecording] stopAudioRecording result:`
- `[CultivatorRecording] Stopped local recording:`
- `[CultivatorRecording] Failed to inspect recorded file:`

## Anything Intentionally Not Changed

- `ClientCallScreen.tsx`
- upload logic in `api.ts`
- backend routes
- backend analysis pipeline
- auth logic
- routing logic
