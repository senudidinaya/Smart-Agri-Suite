# Cultivator Client Recording Upload Audit

## Executive Summary

The upload failure happens at the frontend file boundary before the backend can receive `POST /calls/{call_id}/recording`.

The strongest code-level breakpoint was in:

- `frontend/src/features/cultivator/hooks/useAgora.ts`

That hook was importing `expo-file-system` from the package root and reading:

- `FileSystem.cacheDirectory`
- `FileSystem.documentDirectory`

But this app is on `expo-file-system ~19`, where the top-level package exposes the newer API surface and the legacy directory constants are not the reliable source for this usage. In the existing hook, that could collapse to:

- `filePath = filename`

instead of a real `file://...` path.

That directly matches the device log symptom:

- `Recording stopped, URI: call_recording_<timestamp>.wav`

Once a bare filename reaches the upload boundary, the upload helper normalizes it to:

- `file://call_recording_<timestamp>.wav`

which is not a valid local app file URI for Android multipart upload. That causes the frontend networking layer to fail before the server sees the request.

## Real Upload Path Trace

1. `ClientCallScreen.tsx`
   - `handleEndCall()` or `handleCallEndedByOther()`
   - calls `stopLocalRecording()`
   - receives returned `uri`
   - passes that value into `uploadRecording(uri)`

2. `useAgora.ts`
   - `startLocalRecording()`
   - builds `filePath`
   - stores it in `recordingPathRef.current`

3. `useAgora.ts`
   - `stopLocalRecording()`
   - returns `recordingPathRef.current`

4. `ClientCallScreen.tsx`
   - `uploadRecording(uri)`
   - calls `api.uploadRecording(callId, uri)`

5. `api.ts`
   - `uploadRecording(callId, audioUri)`
   - builds `FormData`
   - uses raw `fetch(...)`
   - does not go through the shared JSON request wrapper

## File URI / Existence Findings

### Verified source bug

Before the fix, `useAgora.ts` did this:

```ts
import * as FileSystem from "expo-file-system";
...
const fs = FileSystem as any;
const cacheDirectory = fs.cacheDirectory || fs.documentDirectory;
const filePath = cacheDirectory ? `${cacheDirectory}${filename}` : filename;
```

If those directory values are not present on that namespace at runtime, the hook falls back to just:

```ts
filePath = filename
```

That is consistent with the observed device log where the stopped recording URI was only the filename.

### Why this breaks Android upload

The upload helper then did:

```ts
const fileUri = audioUri.startsWith("file://") ? audioUri : `file://${audioUri}`;
```

So a bare filename becomes:

```ts
file://call_recording_<timestamp>.wav
```

That is not a real app-local file path, so the multipart request fails in the client networking stack.

## Multipart / Request Findings

- The upload path uses a dedicated raw `fetch(...)` branch in `api.ts`
- It does **not** use the shared `request(...)` logger used by JSON API calls
- That explains why there was no visible:
  - `POST /calls/{call_id}/recording`
  log before the failure

Multipart construction itself was otherwise acceptable:

- `file` field exists
- `uri` is supplied
- `name` is supplied
- `type` is supplied
- no manual multipart `Content-Type` boundary override was being forced

So the main failure was not the boundary header; it was the bad URI feeding the multipart file part.

## Exact Breakpoint

Strict conclusion:

- **A. recording output value is wrong before upload starts**
- and therefore
- **F. server is never reached because frontend networking rejects the payload**

This is supported by:

- bare filename observed in device logs
- source fallback to `filename` in `useAgora.ts`
- separate raw upload path in `api.ts` that previously had no explicit upload-start logging

## Fix Applied

### 1. Correct the recording file path source

Changed `useAgora.ts` to use the legacy FileSystem API surface that actually provides:

- `cacheDirectory`
- `documentDirectory`
- `getInfoAsync`

New behavior:

- recording path is created from a real writable directory
- no silent fallback to bare filename

### 2. Add targeted file existence visibility

Added logs in `useAgora.ts` for:

- exact recording target path at start
- exact returned recording path at stop
- file existence and size after stop

### 3. Add upload-boundary visibility

Added logs in `api.ts` for:

- raw recording URI
- normalized upload URI
- file existence / size before request
- upload request start
- upload response status
- upload failure details

### 4. Add one early truthful failure

If the recorded file does not exist before upload, the app now throws:

- `Recorded audio file is missing before upload starts.`

instead of letting the raw network layer fail more opaquely.

## Why The Fix Is Minimal And Correct

- No auth changes
- No routing changes
- No backend analysis changes
- No switch to cloud recording
- No multipart contract change
- Fixes the recording URI at the source
- Improves observability only around the exact failing path

## Remaining Risks

- If Agora native recording itself fails to write audio even with a correct path, the new existence/size logs will expose that immediately.
- The upload path still uses a dedicated raw `fetch(...)` branch rather than the shared JSON request wrapper, but that is intentional here because multipart upload has different requirements.
