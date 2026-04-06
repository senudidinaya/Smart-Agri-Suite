# Cultivator Runtime Loop Fix Report

Date: 2026-04-05

## Files changed

- `frontend/src/features/cultivator/CultivatorModule.tsx`

## Exact fix

### 1. Incoming-call navigation guard

Added:
- `lastIncomingCallId` ref in `ClientTabsShell`

Behavior:
- if polling returns the same `callId` repeatedly, the module now ignores duplicate navigations
- when no incoming call is reported, the stored `callId` is cleared

### 2. Token injection moved out of render

Changed:
- `api.setAuthToken(token)` no longer runs directly in `AppContent()` render
- it now runs inside `useEffect(() => { api.setAuthToken(token); }, [token])`

Behavior:
- keeps the shared cultivator API client synced with merged auth
- avoids render-time side effects that can produce development instability

## Before vs after

### Before

- polling could repeatedly navigate to `IncomingCall` for the same backend-reported call
- merged token was being written into the cultivator API singleton during render

### After

- a pending call only triggers navigation once per `callId`
- merged token is injected only when the token changes

## Manual verification

1. Log into the merged app.
2. Open the Cultivator Intention Analyzer flow.
3. Stay on the cultivator module for at least 30 to 60 seconds.
4. Confirm the app does not repeatedly remount or jump screens on its own.
5. If a pending incoming-call scenario exists, confirm `IncomingCall` opens once rather than repeatedly reopening.

## Remaining watch items

If any loop remains after this fix, inspect next:
- call-screen polling lifecycles in `AdminCallScreen.tsx`
- call-screen polling lifecycles in `ClientCallScreen.tsx`
- any development-only runtime exception causing Fast Refresh style remounts
