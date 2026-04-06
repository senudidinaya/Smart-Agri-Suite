# Cultivator Client Recording Race Validation

## Test 1: Quick End Attempt

1. Start a client call from the normal Cultivator flow.
2. Accept the call on the client.
3. Press End Call very quickly, before the normal recording indicator appears.

### Expected Logs

- `Client joining Agora channel: ...`
- `[CultivatorRecordingRace] Recording start requested after channel join`
- `Client end-call requested` with:
  - `isRecording: false`
  - `isRecordingStarting: false` or `true`
- `[CultivatorRecordingRace] Recording not ready at end-call; stop/upload path will be skipped`
- `[CultivatorRecordingRace] Suppressing late recording start before first attempt`
  or
- `[CultivatorRecordingRace] Recording start resolved after call began ending`

### Expected Behavior

- The call ends cleanly.
- No upload starts.
- The ended screen shows that recording was not available.
- No delayed recording start should continue after the call has already entered ending flow.

## Test 2: Normal Call Duration Attempt

1. Start a client call.
2. Accept the call.
3. Wait until the call is clearly connected and recording has had time to start.
4. Then press End Call.

### Expected Logs

- `Channel joined, starting local recording...`
- `[CultivatorRecording] startAudioRecording result: 0`
- `[CultivatorRecording] Recording lifecycle state: { isRecordingStarting: false, isRecording: true }`
- `Client end-call requested` with `isRecording: true`
- `[CultivatorRecordingRace] Recording is ready, stopping and preparing upload`
- `Recording stopped, URI: file:///...`
- `Starting upload for URI: file:///...`

### Expected Behavior

- The call ends cleanly.
- Recording stop returns a real URI.
- Upload starts normally.

## Failure Signals That Still Indicate A Remaining Issue

- `Client end-call requested` shows `isRecording: true` but `stopLocalRecording()` still returns `null`.
- Recording start logs appear after the call has already fully ended and without a suppression log.
- Duplicate end-call presses trigger multiple end flows.
- The quick-end case still tries to upload a null or missing recording.
