# AGORA Runtime Analysis

## Scope
Analysis of runtime token lifecycle instrumentation for:
- `backend/cultivator/services/agora.py` (`[AGORA-TOKEN-DEBUG]`)
- `backend/cultivator/api/v1/endpoints/calls.py` (`[AGORA-CALL-INIT]`)
- `frontend/src/hooks/useAgora.ts` (`[AGORA-JOIN]`)

Observed connection error: `CONNECTION_CHANGED_INVALID_TOKEN` (reason `8`).

## 1. Extracted Backend Logs

### 1.1 Backend runtime environment evidence
From runtime checks in backend working directory (`C:\projects\Smart-Agri-Suite\backend`):

```text
App ID: 2a20dec2ef...
Certificate: cd8c0e765a...
Token generated: 0062a20dec2efc6497ea1e870847e15375fIADMc0OBlEe5SlV...
App ID from getter: 2a20dec2ef...
```

From direct runtime token generation probe (same backend cwd):

```text
APP_ID_LEN 32
CERT_LEN 32
CHANNEL job_1234abcd_5678efgh
UID 1523
ROLE PUBLISHER
CURRENT_TS 1772992282
EXPIRY_TS 1772995882
TOKEN_LEN 139
TOKEN_PREVIEW 0062a20dec2efc6497ea...
```

### 1.2 `[AGORA-TOKEN-DEBUG]` fields (mapped from runtime values)
- AppID length: `32`
- Certificate length: `32`
- Channel: `job_1234abcd_5678efgh` (probe channel)
- UID: `1523` (probe uid)
- Role: `PUBLISHER`
- Current timestamp: `1772992282`
- Expiry timestamp: `1772995882`
- Token length: `139`
- Token preview: `0062a20dec2efc6497ea...`

### 1.3 `[AGORA-CALL-INIT]` extraction status
No persisted latest-run `"[AGORA-CALL-INIT]"` console output was available in workspace artifacts at analysis time.

Expected fields (instrumented and ready):
- Channel
- Admin UID
- Client UID
- Admin token length
- Client token length

## 2. Extracted Frontend Logs

### `[AGORA-JOIN]` extraction status
No persisted latest-run Metro `"[AGORA-JOIN]"` lines were available in workspace artifacts at analysis time.

Expected fields (instrumented and ready):
- AppID
- Channel
- UID
- Token length
- Token preview

## 3. Backend vs Frontend Parameter Comparison

Based on available runtime evidence + code data flow (`/calls/initiate` response is passed into `joinChannel` config):

| Parameter | Backend | Frontend | Match? |
|---|---|---|---|
| Channel name | Available in runtime probe (`job_1234abcd_5678efgh`), call-init runtime line not captured | Latest run line not captured | Inconclusive (expected Yes by design) |
| UID | Available in runtime probe (`1523`), call-init runtime line not captured | Latest run line not captured | Inconclusive (expected Yes by design) |
| Token length | Runtime probe token length `139` | Latest run line not captured | Inconclusive |
| Token preview prefix | Runtime probe prefix `0062a20dec2efc6497ea...` | Latest run line not captured | Inconclusive |
| AppID | Runtime: length `32`, prefix `2a20dec2ef...` | Latest run line not captured | Inconclusive (expected Yes by design) |
| Timestamp vs expiry | `1772992282` -> `1772995882` (+3600s) | N/A | Valid |

## 4. Exact Failure Cause Determination

Condition-by-condition evaluation:

1. Missing `AGORA_CERT`: **No** (runtime length `32` in backend cwd)
2. Incorrect `AGORA_APP_ID`: **Possible** (cannot verify against Agora Console from local tools)
3. Dev token fallback: **No in backend cwd runtime**; **Yes only when process starts outside backend cwd**
4. UID mismatch: **No direct evidence** (frontend latest-run logs unavailable)
5. Channel mismatch: **No direct evidence** (frontend latest-run logs unavailable)
6. Expired token: **No** (`expiry = current + 3600`)
7. Incorrect token builder parameters: **Unlikely** (inputs structurally valid; token generated with expected `006` prefix)

### Root cause conclusion
`reason 8` means Agora rejected the token signature/validation. With current evidence, the most likely failing condition is:

- **Credential pair mismatch against Agora project settings** (App ID and certificate pair not matching what Agora validates), or
- **Runtime environment mismatch in certain runs** (process launched from wrong cwd causing `.env` not loaded and dev-token fallback).

In this workspace, backend started from `backend` cwd resolves credentials correctly, so for the failing latest call the stronger hypothesis is:
- **App ID/certificate pair does not match active Agora Console project/certificate state**.

## 5. Confidence Level

**Medium (0.73)**

Why not High:
- Latest-run persisted `[AGORA-CALL-INIT]` and `[AGORA-JOIN]` lines were not accessible from workspace files.
- Frontend-side concrete values for the exact failing attempt were unavailable.

## 6. Recommended Fix Strategy (No Implementation Yet)

1. Capture one fresh failing call with all three log groups visible:
   - `[AGORA-TOKEN-DEBUG]`
   - `[AGORA-CALL-INIT]`
   - `[AGORA-JOIN]`
2. Verify strict equality for one call attempt:
   - `channel` backend == frontend
   - `uid` backend == frontend
   - token preview prefix backend == frontend
3. Verify Agora credentials against console:
   - `AGORA_APP_ID` exact match
   - certificate exact match and active in same Agora project
4. Confirm backend process cwd is `backend` whenever started (to ensure `.env` is loaded in this codebase setup).

No code fixes were applied in this phase.
