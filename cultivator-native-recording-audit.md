# Cultivator Native Recording Audit

## Executive Summary

The local recording failure was not primarily an upload problem anymore. The file was missing before upload because the recording hook was passing the wrong path format into Agora's native recorder and then assuming `startAudioRecording(...) === 0` meant a usable file would exist immediately.

The exact contract evidence from the installed SDK:

- `react-native-agora` uses `startAudioRecording(config)` / `stopAudioRecording()`
- `AudioRecordingConfiguration.filePath` is documented as:
  - "The absolute path where the recording file is saved locally..."
- The SDK also exposes recorder lifecycle callbacks:
  - `onRecorderStateChanged`
  - `onRecorderInfoUpdated`

Before this fix, the hook passed a `file://...` URI into `startAudioRecording`, while Agora expects a native absolute file path on Android. The hook also did not listen for recorder state callbacks and inspected the file immediately after stop without any finalization window.

## Native Recording Lifecycle Trace

### JS start path

File:

- `frontend/src/features/cultivator/hooks/useAgora.ts`

Function:

- `startLocalRecording()`

Native API called:

- `engineRef.current.startAudioRecording({...})`

Current arguments after fix:

- `filePath: nativeFilePath`
- `sampleRate: 16000`
- `recordingChannel: 1`
- `quality: AudioRecordingQualityType.AudioRecordingQualityMedium`
- `fileRecordingType: AudioFileRecordingType.AudioFileRecordingMixed`

JS-managed values:

- `recordingUri`
  - `file:///data/.../cache/call_recording_<timestamp>.wav`
- `nativeFilePath`
  - `/data/.../cache/call_recording_<timestamp>.wav`

Assumption before fix:

- if `startAudioRecording(...)` returned `0`, recording was treated as started and the chosen path was assumed valid

### JS stop path

File:

- `frontend/src/features/cultivator/hooks/useAgora.ts`

Function:

- `stopLocalRecording()`

Native API called:

- `engineRef.current.stopAudioRecording()`

Return:

- numeric result code only
- it does **not** return a real output path

Assumption before fix:

- the hook returned the originally chosen target path as if it were the confirmed output path
- file existence was inspected immediately after stop with no recorder-state callback and no flush wait

### Screen flow

File:

- `frontend/src/features/cultivator/screens/ClientCallScreen.tsx`

Flow:

- call ends
- `stopLocalRecording()` returns path
- path passed into `api.uploadRecording(callId, uri)`

## Actual Agora API Contract Used

From the installed SDK typings:

- `IAgoraRtcEngine.startAudioRecording(config: AudioRecordingConfiguration): number`
- `IAgoraRtcEngine.stopAudioRecording(): number`

Relevant contract details:

- `AudioRecordingConfiguration.filePath` expects an **absolute path**
- recorder lifecycle visibility exists via:
  - `onRecorderStateChanged(channelId, uid, state, reason)`
  - `onRecorderInfoUpdated(channelId, uid, info)`

Relevant recorder reasons:

- `RecorderReasonWriteFailed`
- `RecorderReasonNoStream`
- `RecorderReasonOverMaxDuration`
- `RecorderReasonConfigChanged`

This proves the current code needed:

1. native-path formatting, not just JS `file://` URI formatting
2. recorder-state visibility instead of assuming native success from the start call alone

## Exact Breakpoint

Strict conclusion:

- **B. JS passes a path the native recorder does not really use**

Primary proof:

- Agora expects absolute native file path
- previous code passed `file://...`
- real device logs showed:
  - start path looked valid as a JS URI
  - stop inspection found `exists: false`, `size: 0`

Secondary contributing issue:

- **C/D. native start/stop lifecycle was assumed rather than verified**

The code relied on numeric return values only and did not listen for `onRecorderStateChanged`, so write failures or no-stream states were not surfaced clearly.

## Fix Applied

### 1. Pass native absolute path to Agora

In `useAgora.ts`:

- keep `recordingUri` for JS/file upload usage
- derive `nativeFilePath` for Agora by stripping `file://` on Android
- pass `nativeFilePath` into `startAudioRecording(...)`

### 2. Keep JS-facing URI separate

The hook still returns the `file://...` URI for later frontend file inspection and upload.

### 3. Add recorder lifecycle logging

Added:

- `onRecorderStateChanged`
- detailed start arguments log
- start result log
- stop result log

### 4. Add short post-stop finalization window

After `stopAudioRecording()`, the hook now checks file existence/size up to 5 times with short delays.

This is not a redesign; it only prevents immediate false negatives if native flush/finalization is slightly delayed.

## Why The Fix Is Minimal And Correct

- no backend changes
- no auth changes
- no routing changes
- no upload contract changes
- no cloud-recording fallback
- only the recording hook was corrected
- logs were added only around the native recording lifecycle

## Remaining Risks

- If the device/Agora native layer reports `write_failed` or `no_stream`, that is a real runtime/native condition, not a JS path bug.
- If the file still never appears with the corrected native path, the new recorder-state logs should expose whether the recorder is erroring at the native layer.
