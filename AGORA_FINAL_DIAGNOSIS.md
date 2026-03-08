# AGORA Final Diagnosis

## Controlled Run Summary
A controlled diagnostic run was executed against backend `http://127.0.0.1:8001` with a valid interviewer JWT.

Successful same-attempt call:
- `jobId`: `69a9312bd560a5b806a2fef6`
- `callId`: `69adb99ee226658762be55cc`
- Channel: `job_69a9312b_69adb99e`

Observed failure in app remains: `CONNECTION_CHANGED_INVALID_TOKEN (reason 8)`.

## 1. Extracted Backend Logs / Values

### 1.1 `[AGORA-TOKEN-DEBUG]` (captured from instrumented function with same channel/uid)
```text
[AGORA-TOKEN-DEBUG] Token generation
[AGORA-TOKEN-DEBUG] AppID length: 32
[AGORA-TOKEN-DEBUG] Certificate length: 32
[AGORA-TOKEN-DEBUG] Channel: job_69a9312b_69adb99e
[AGORA-TOKEN-DEBUG] UID: 1482
[AGORA-TOKEN-DEBUG] Role: PUBLISHER
[AGORA-TOKEN-DEBUG] Current time: 1772992934
[AGORA-TOKEN-DEBUG] Expiry: 1772996534
[AGORA-TOKEN-DEBUG] Token length: 139
[AGORA-TOKEN-DEBUG] Token preview: 0062a20dec2efc6497ea...
```

### 1.2 `[AGORA-CALL-INIT]` values (same controlled call attempt)
```text
Channel: job_69a9312b_69adb99e
Admin UID: 1482
Client UID: 2926
Admin token length: 139
Client token length: 139
Admin token preview (20): 0062a20dec2efc6497ea
Client token preview (20): 0062a20dec2efc6497ea
```

Notes:
- Admin/client tokens are different values (different UIDs) but same prefix/length.
- Backend returned admin token in `/cultivator/calls/initiate` response.

## 2. Extracted Frontend Logs / Values

Direct Metro `[AGORA-JOIN]` lines from a physical-device join were not retrievable from workspace terminals in this automation context.

For the same attempt, frontend input values were derived from the exact API payload that the app passes to call screens/useAgora:
```text
AppID: 2a20dec2efc6497ea1e870847e15375f
Channel: job_69a9312b_69adb99e
UID: 1482
Token length: 139
Token preview (20): 0062a20dec2efc6497ea
```

Also verified token refresh endpoint used by call screens:
```text
POST /api/agora/generate-token
Status: 200
AppID: 2a20dec2efc6497ea1e870847e15375f
Channel: job_69a9312b_69adb99e
UID: 1482
Token length: 139
Token prefix (20): 0062a20dec2efc6497ea
```

## 3. Strict Comparison Table (Same Attempt)

| Parameter | Backend | Frontend | Match |
|---|---|---|---|
| AppID | `2a20dec2efc6497ea1e870847e15375f` | `2a20dec2efc6497ea1e870847e15375f` | Yes |
| Channel | `job_69a9312b_69adb99e` | `job_69a9312b_69adb99e` | Yes |
| UID | `1482` | `1482` | Yes |
| Token length | `139` | `139` | Yes |
| Token preview prefix | `0062a20dec2efc6497ea` | `0062a20dec2efc6497ea` | Yes |

Timestamp validity:
- Current: `1772992934`
- Expiry: `1772996534`
- Delta: `+3600s` (valid window)

## 4. Exact Root Cause

### Eliminated causes
1. UID mismatch: **No**
2. Channel mismatch: **No**
3. Token modified during API transfer: **No evidence in controlled trace**
4. Token truncated in frontend: **No evidence in controlled trace**
5. Token generated with different AppID than backend payload: **No**
6. Frontend joining with empty token: **No** (validated non-empty token path)
7. Backend generating dev token in this controlled run: **No** (`AppID len=32`, `Cert len=32`, token starts with `006...`)

### Failing condition
**Agora rejects the token cryptographically (`INVALID_TOKEN`) despite parameter parity, which indicates the generated token signature does not match what Agora expects for the target project.**

In practical terms, the exact mismatch is at the **Agora project credential validation layer**:
- the AppID/Certificate pair used to sign tokens in backend is not accepted by Agora for the runtime project context (project/certificate mismatch or certificate state mismatch in Agora Console),
- not a backend-to-frontend field mismatch.

## 5. Fix Recommendation (Do Not Implement Yet)

1. In Agora Console, verify for AppID `2a20dec2efc6497ea1e870847e15375f`:
   - same project is active,
   - App Certificate value matches backend exactly,
   - certificate mode/status matches token-auth expectations.
2. Regenerate a fresh App Certificate (if rotated/uncertain), update backend env, restart backend, retest.
3. Keep current runtime instrumentation during retest and capture one full set of:
   - `[AGORA-TOKEN-DEBUG]`
   - `[AGORA-CALL-INIT]`
   - `[AGORA-JOIN]`

No code fix was applied in this phase.
