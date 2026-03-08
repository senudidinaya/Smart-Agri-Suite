# Call Pipeline Audit

Date: 2026-03-09
Project: Smart-Agri-Suite

## Scope
End-to-end audit for the user flow:
1. User registers account
2. User posts job
3. Admin sees job
4. Admin initiates call
5. Backend generates Agora token
6. Frontend receives token
7. React Native Agora joins channel

## Findings

### 1. Backend token generation
File: `backend/cultivator/services/agora.py`
- `generate_agora_token(channel_name, uid, role, expire_seconds)` is the source of call tokens.
- Added diagnostics:
  - `[AGORA TOKEN GENERATED]`
  - `channel`, `uid`, `token prefix`, `token length`
- Validation path already enforced:
  - startup check ensures token starts with `006` and has adequate length.

### 2. API response that returns call credentials
File: `backend/cultivator/api/v1/endpoints/calls.py`
- Admin call init endpoint: `POST /cultivator/calls/initiate`
- Response includes:
  - `agora.appId`
  - `agora.token`
  - `agora.channelName`
  - `agora.uid`
- Added response diagnostics:
  - `[AGORA API RESPONSE]`
  - full payload print to verify token is not truncated in API serialization.

### 3. Frontend token reception
Files:
- `frontend/src/api/cultivatorApi.ts`
- `frontend/app/cultivator/admin/call.tsx`
- `frontend/app/cultivator/call.tsx`

Added logs:
- `[FRONTEND TOKEN RECEIVED] <token>`
- `[TOKEN PREFIX] <first 6 chars>`
- `[JOIN CHANNEL] <channelName>`

These logs run for both initial call payload and refreshed token payload.

### 4. React state / join guard hardening
File: `frontend/src/hooks/useAgora.ts`
- Join now validates token type and content before use:
  - token must exist
  - token must be string
  - token is trimmed (`normalizedToken`)
  - token length >= 50
  - token prefix starts with `006`

If invalid, join aborts with clear error.

### 5. Channel consistency logging
Files:
- `frontend/src/api/cultivatorApi.ts`
- `frontend/app/cultivator/admin/call.tsx`
- `frontend/app/cultivator/call.tsx`

Added `[JOIN CHANNEL]` logging in both admin and client flows so both sides can be compared directly.

### 6. UID type normalization
Files:
- `frontend/app/cultivator/admin/call.tsx`
- `frontend/app/cultivator/call.tsx`

Enforced numeric UID:
- `uid: Number(agora.uid)`
- on refresh: `agoraConfig.uid = Number(refreshed.uid)`

### 7. joinChannel invocation
File: `frontend/src/hooks/useAgora.ts`
- Verified call signature is correct:
  - `engine.joinChannel(token, channelName, uid, options)`
- Updated to use `normalizedToken` (trimmed validated token).

### 8. Success listener
File: `frontend/src/hooks/useAgora.ts`
- Success listener exists and logs:
  - `[AGORA-CONNECTED] Channel`
  - `[AGORA-CONNECTED] UID`

### 9. End-to-end diagnostic script
File: `scripts/test_call_flow.js`
- Requests token from backend endpoint `/api/agora/generate-token`
- Prints status, body, token prefix, token length
- Asserts token prefix starts with `006`

Usage:
```bash
node scripts/test_call_flow.js <BASE_URL> <JWT_TOKEN> <CHANNEL_NAME> <UID>
```

Example:
```bash
node scripts/test_call_flow.js http://192.168.1.9:8000 <jwt> diagnostic_direct_join 1001
```

## Expected verification output

Backend:
- `[AGORA TOKEN GENERATED]`
- `token prefix: 006...`

API:
- `[AGORA API RESPONSE]` with `agora.token` starting with `006`

Frontend:
- `[FRONTEND TOKEN RECEIVED] ...`
- `[TOKEN PREFIX] 006...`
- `[JOIN CHANNEL] <same channel on admin and client>`

Agora hook:
- `[AGORA-JOIN-VALIDATION] Token format: valid (starts with 006)`
- `[AGORA-CONNECTED] ...`

## Root-cause hypothesis for prior failure
If frontend reports invalid token prefix, likely causes are:
1. refresh endpoint returning fallback/dev token (missing cert in runtime env)
2. non-string token value at join-time
3. token mutation or parse issue before hook call

Current instrumentation now makes these points explicit in logs.
