# Cultivator Client Recording Race Audit

## Executive Summary

The client call flow had a real timing race between Agora channel join and local recording start.

The code in `frontend/src/features/cultivator/screens/ClientCallScreen.tsx` starts recording from a delayed async effect that runs only after `agoraState.isJoined` becomes `true`. That effect intentionally waits 500ms before calling `startLocalRecording()`, and may retry later.

During that window, `handleEndCall()` could run first. When that happened, `stopLocalRecording()` was called while recording had not actually started yet, so the returned URI was `null`. The delayed recording-start task could still continue afterward, which matches the real log ordering:

- end call requested
- `isRecording: false`
- stop returns success code but no file path
- only afterward `Channel joined, starting local recording...`

## Client Call/Recording Lifecycle Trace

1. `ClientCallScreen` mounts and calls `joinChannel()`.
2. `joinChannel()` returns after issuing the native join request, not after recording starts.
3. Agora later fires `onJoinChannelSuccess`, which updates `agoraState.isJoined = true`.
4. A `useEffect` in `ClientCallScreen` sees `agoraState.isJoined` and launches `tryStartRecording()`.
5. `tryStartRecording()` waits 500ms, then calls `startLocalRecording()`.
6. `startLocalRecording()` in `frontend/src/features/cultivator/hooks/useAgora.ts` sets `isRecordingStarting = true`, calls the native Agora recorder, and only sets `isRecording = true` after a successful return.
7. Before step 6 completes, the user can press End Call.
8. `handleEndCall()` previously called `stopLocalRecording()` unconditionally, even if recording had never become ready.
9. If that happened early, upload was skipped because the URI was `null`.
10. The delayed start task could still fire after the call had already entered ending flow.

## Exact Race Window

The race window is:

- `agoraState.isJoined` becomes `true`
- delayed `tryStartRecording()` has been scheduled but has not yet completed
- user presses End Call

This is both:

- `A. end-call can fire before startLocalRecording finishes`
- `D. channel joined callback races with end-call handler`

## Fix Applied

Two small, deterministic guards were added:

1. `useAgora.ts`
   - Added `isRecordingStarting` to track when native recording start is in flight.
   - Added lifecycle logs for `isRecordingStarting` and `isRecording`.

2. `ClientCallScreen.tsx`
   - Added `callEndingRef` and `isEndingCall`.
   - The delayed `tryStartRecording()` now checks `callEndingRef` before starting, before retrying, and after a start attempt resolves.
   - `handleEndCall()` and `handleCallEndedByOther()` now only run the stop/upload path when `isRecording` is truly ready.
   - If the call ends before recording becomes ready, stop/upload is skipped explicitly and truthfully.
   - Duplicate end-call requests are ignored locally.

## Why The Fix Is Minimal And Correct

- It does not change backend behavior.
- It does not redesign upload behavior.
- It does not fake a recording URI.
- It preserves successful normal calls where recording is already active.
- It makes early-ended calls deterministic: no ghost stop, no null upload attempt, no late delayed start after ending begins.

## Remaining Risks

- If Agora reports successful join but native recording still fails for another reason, the new logs will show that directly.
- Early-ended calls will still have no recording or upload, which is the truthful behavior when recording never became ready.
