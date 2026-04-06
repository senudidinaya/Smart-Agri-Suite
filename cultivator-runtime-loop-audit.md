# Cultivator Runtime Loop Audit

Date: 2026-04-05

## Scope

- `frontend/src/features/cultivator/CultivatorModule.tsx`
- `frontend/app/index.tsx`
- `frontend/app/(main)/_layout.tsx`
- `frontend/app/_layout.tsx`
- `frontend/src/features/cultivator/services/api.ts`
- recently changed cultivator navigation and role-routing logic

## Evidence reviewed

### 1. Root auth gate

File:
- `frontend/app/_layout.tsx`

Findings:
- `AuthGate` redirects only when auth state and route group truly disagree.
- No direct evidence of a redirect ping-pong for authenticated users already inside the cultivator module.

### 2. Home and tab routing

Files:
- `frontend/app/index.tsx`
- `frontend/app/(main)/_layout.tsx`

Findings:
- Home card navigation to `/cultivator-module` is user-triggered only.
- Main tab layout only changes dashboard visibility based on role.
- No repeated navigation effect was found there.

### 3. Cultivator module

File:
- `frontend/src/features/cultivator/CultivatorModule.tsx`

Findings:
- `ClientTabsShell` polls `api.checkIncomingCall()` every 3 seconds.
- Before the fix, each successful response with the same `callId` could call `navigation.navigate("IncomingCall", ...)` again.
- That created a realistic repeated-navigation/remount hazard if the backend kept reporting the same pending incoming call.
- `AppContent()` also called `api.setAuthToken(token)` during render, which is a render-side effect and unsafe in dev/Strict Mode.

## Most likely root cause

The highest-confidence loop source was repeated navigation from the incoming-call polling effect in `ClientTabsShell`, amplified by render-time token mutation in `AppContent()`.

## Minimum safe fix direction

1. Guard `IncomingCall` navigation by `callId` so the same pending call only triggers once.
2. Move merged-token injection into a `useEffect([token])` instead of running it during render.

## Intentionally not changed

- Root auth architecture
- Expo Router route structure
- interviewer/admin role routing logic
- cultivator screen-level data-loading flows outside the loop hotspot
