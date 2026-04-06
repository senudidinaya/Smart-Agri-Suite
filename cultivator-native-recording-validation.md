# Cultivator Native Recording Validation

## Exact Manual Validation Steps On Android

1. Launch the merged app on a physical Android device using the development build.
2. Sign in normally.
3. Start a cultivator call.
4. Accept the call on the client device.
5. Wait a few seconds after the call connects.
6. End the call from either side.
7. Watch the client logs from recording start through recording stop, before upload starts.

## Expected Logs On Start

You should now see:

```text
[CultivatorRecording] Starting local recording: {
  api: 'startAudioRecording',
  recordingUri: 'file:///data/.../call_recording_<timestamp>.wav',
  nativeFilePath: '/data/.../call_recording_<timestamp>.wav',
  ...
}
```

and:

```text
[CultivatorRecording] startAudioRecording result: 0
```

and ideally:

```text
[CultivatorRecording] Recorder state changed: { stateName: 'start', reasonName: 'none', ... }
```

## Expected Logs On Stop

You should now see:

```text
[CultivatorRecording] stopAudioRecording result: 0
```

and then one or more:

```text
[CultivatorRecording] Stopped local recording: {
  uri: 'file:///data/.../call_recording_<timestamp>.wav',
  nativeFilePath: '/data/.../call_recording_<timestamp>.wav',
  exists: true,
  size: <number>,
  attempt: <number>
}
```

## Expected File Existence / Size Signals

Success before upload starts means:

- `exists: true`
- `size > 0`

If that happens, the native recording path problem is resolved.

## What Success Should Look Like Before Upload Starts

- recorder start result is `0`
- recorder state reaches `start`
- recorder stop result is `0`
- file existence becomes `true`
- file size is non-zero

Only after those signals should upload proceed normally.

## Failure Signals That Still Indicate A Remaining Issue

- `startAudioRecording result` is negative
- `Recorder state changed` shows:
  - `stateName: 'error'`
  - `reasonName: 'write_failed'`
  - `reasonName: 'no_stream'`
- file still shows:
  - `exists: false`
  - `size: 0`
  even after the post-stop attempts

If that happens, the remaining problem is likely native recorder/device-state related rather than URI formatting.
