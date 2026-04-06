# Cultivator Client Recording Upload Validation

## Manual Validation Steps On Android Device

1. Start the merged app on the Android development build.
2. Log into the merged app normally.
3. Start a cultivator call from the admin/interviewer side.
4. Accept the call on the client phone.
5. Let the call run for a few seconds so a recording can be created.
6. End the call from either side.
7. Watch the client device logs during:
   - recording start
   - recording stop
   - upload start
   - upload completion or failure

## Expected Frontend Logs

### Recording start

You should now see a full writable path, not just a filename:

```text
[CultivatorRecording] Starting local recording at: file:///.../call_recording_<timestamp>.wav
```

### Recording stop

You should see:

```text
[CultivatorRecording] Stopped local recording: { uri: 'file:///...', exists: true, size: <number> }
```

If `exists` is `false` or size is `0`, the problem is still before upload.

### Upload start

You should see:

```text
[CultivatorAPI] POST upload /calls/{callId}/recording { rawUri, normalizedUri, fileExists, fileSize }
```

### Upload success

You should see:

```text
[CultivatorAPI] POST http://<host>:8002/calls/<callId>/recording -> 200
```

and later:

```text
Upload and analysis complete in background:
```

## Expected Backend Request Visibility

After the client upload starts successfully, the backend should log from `calls.py`:

```text
[GATE1] Recording received on backend callId=...
```

and then:

```text
[GATE1] Recording payload read callId=... bytes=...
```

If frontend shows upload start but backend never logs receipt, the failure is still on the device/network boundary.

## What Success Should Look Like

- Client log shows a real `file://` URI
- File existence is `true`
- File size is greater than `0`
- Upload request log appears
- Backend receives the multipart request
- Backend returns `200`
- Client no longer throws `TypeError: Network request failed`

## Failure Signals That Would Still Indicate A Remaining Issue

- Recording URI is still only `call_recording_<timestamp>.wav`
- File existence is `false`
- File size is `0`
- Upload fails before any backend receipt log
- Upload log shows normalized URI is malformed
- Backend receives the request but rejects it for a separate server-side reason
