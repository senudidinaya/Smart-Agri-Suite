# Cultivator Two-Phone Validation Checklist

## Preconditions

1. Start the merged backend on port `8000`.
2. Start the cultivator backend on port `8002`.
3. Confirm both phones are on the same LAN as the development machine.
4. Prefer setting explicit environment variables before building/running:
   - `EXPO_PUBLIC_API_BASE_URL=http://<your-laptop-lan-ip>:8000`
   - `EXPO_PUBLIC_CULTIVATOR_API_BASE_URL=http://<your-laptop-lan-ip>:8002`

## Step-by-step validation on two Android phones

### A. App startup

On phone A and phone B:
1. Launch the Expo development build.
2. Confirm the app opens without hanging on startup.
3. Watch Metro/device logs and confirm you see:
   - `[MergedAPI] Base URL resolved to ...`
   - `[CultivatorAPI] Base URL resolved to ...`
4. Confirm both phones resolved the same expected LAN-reachable backend host.

### B. Merged auth restore

On both phones:
1. If already signed in, fully close and reopen the app.
2. Confirm the app restores the merged session without sending you back to the login screen unexpectedly.
3. Open the cultivator module.
4. Confirm you do not see `Missing merged auth token`.

Expected logs:
- `[CultivatorAPI] Merged auth token attached`

### C. Client-side cultivator validation

Use a merged client or farmer account on one phone.

1. Open `Cultivator Intention Analyzer`.
2. Open `Jobs`.
3. Open `Notifications`.
4. Confirm data requests do not fire before the token is ready.
5. Confirm these screens no longer surface the old generic auth error race.

Expected logs:
- `[CultivatorAPI] GET http://<host>:8002/jobs/my auth=yes`
- `[CultivatorAPI] GET http://<host>:8002/jobs/my -> 200` or a meaningful non-200
- `[CultivatorAPI] GET http://<host>:8002/notifications/ auth=yes`
- `[CultivatorAPI] GET http://<host>:8002/notifications/ -> 200` or a meaningful non-200

Expected UI behavior:
- if backend is healthy: screen loads normally
- if DB is unavailable: user should see an explicit service-unavailable style error, not only `An unexpected error occurred. Please try again later.`
- if network is unreachable: user should see a network error

### D. Interviewer-side cultivator validation

Use a merged interviewer or admin account on one phone.

1. Open `Cultivator Intention Analyzer`.
2. Confirm interviewer/admin lands in the correct cultivator admin flow.
3. Confirm `AdminApplicationsScreen` loads without `Missing merged auth token`.

Expected logs:
- `[CultivatorAPI] GET http://<host>:8002/jobs/ auth=yes`
- `[CultivatorAPI] GET http://<host>:8002/jobs/ -> 200` or explicit 503/401/etc.

### E. Network-failure visibility

Temporarily disconnect one phone from the LAN or point it at an unreachable backend.

1. Reopen cultivator screens.
2. Confirm logs clearly show:
   - resolved base URL
   - request method
   - response status or network failure
3. Confirm UI shows a network-oriented error rather than a silent failure.

Failure signals to watch for:
- `Network error: ...`
- request timeout messages
- repeated retries with no base URL visibility

### F. DB-failure visibility

If possible, simulate backend DB unavailability.

1. Start cultivator backend without a working DB connection.
2. Reopen `Jobs`, `Notifications`, and interviewer/admin cultivator screens.
3. Confirm responses become explicit `503 Database not available` style failures rather than generic 500 masking.

### G. Navigation and loop stability

1. Leave the cultivator module open on both phones for at least 1 minute.
2. Confirm there is no repeated remount, reload-like churn, or repeated incoming-call navigation for the same call.

Failure signals to watch for:
- repeated screen resets
- repeated `IncomingCall` reopening for the same `callId`
- repeated token attach/clear churn without a real auth change

### H. Restart stability

On both phones:
1. Fully kill the app.
2. Relaunch it.
3. Re-enter the cultivator module.
4. Confirm the same backend URL is resolved.
5. Confirm merged token attaches again before cultivator requests run.
6. Confirm client and interviewer paths remain stable after restart.
