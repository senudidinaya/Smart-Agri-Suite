# AGORA Runtime Token Diagnostic

## Purpose
This document defines the temporary runtime diagnostics added to verify the full Agora token lifecycle before applying any fixes.

Verification goals:
1. AppID matches Agora Console
2. Certificate exists and length is 32
3. Token length is around 200+ characters
4. UID matches between backend and frontend
5. Channel name matches between backend and frontend

## 1. Token Lifecycle Diagram
```text
Admin starts call
   |
   v
POST /cultivator/api/v1/calls/initiate
   |
   +--> backend/cultivator/api/v1/endpoints/calls.py
   |      - Generate channelName
   |      - Generate admin UID and client UID
   |      - Generate admin token and client token
   |      - Emit [AGORA-CALL-INIT] logs
   |
   +--> backend/cultivator/services/agora.py::generate_agora_token()
   |      - Read AGORA_APP_ID and AGORA_CERT
   |      - Compute current timestamp and expiry timestamp
   |      - Build token
   |      - Emit [AGORA-TOKEN-DEBUG] logs
   |
   v
Backend returns Agora payload (appId, channelName, uid, token)
   |
   v
frontend/src/hooks/useAgora.ts::joinChannel()
   - Emit [AGORA-JOIN] logs
   - Call engine.joinChannel(token, channelName, uid, ...)
   |
   v
Agora SDK validates token
```

## 2. Backend Token Generation Parameters
File: `backend/cultivator/services/agora.py`
Function: `generate_agora_token()`

Logged fields:
- App ID length
- App Certificate length
- Channel Name
- UID
- Role
- Current timestamp
- Expiration timestamp
- Generated token length
- Token preview (first 20 chars)

Also logged warnings:
- `app_id` empty
- `app_certificate` empty

## 3. Frontend Join Parameters
File: `frontend/src/hooks/useAgora.ts`
Location: just before `engine.joinChannel(...)`

Logged fields:
- App ID
- Channel Name
- UID
- Token length
- Token preview (first 20 chars)

## 4. Example Expected Logs

### Backend token generation
```text
[AGORA-TOKEN-DEBUG] Token generation
[AGORA-TOKEN-DEBUG] AppID length: 32
[AGORA-TOKEN-DEBUG] Certificate length: 32
[AGORA-TOKEN-DEBUG] Channel: job_1234abcd_5678efgh
[AGORA-TOKEN-DEBUG] UID: 1523
[AGORA-TOKEN-DEBUG] Role: PUBLISHER
[AGORA-TOKEN-DEBUG] Current time: 1735000000
[AGORA-TOKEN-DEBUG] Expiry: 1735003600
[AGORA-TOKEN-DEBUG] Token length: 232
[AGORA-TOKEN-DEBUG] Token preview: 006xxxxxxxxxxxxxxxxx...
```

### Backend call initiation
```text
[AGORA-CALL-INIT]
[AGORA-CALL-INIT] Channel: job_1234abcd_5678efgh
[AGORA-CALL-INIT] Admin UID: 1523
[AGORA-CALL-INIT] Client UID: 2415
[AGORA-CALL-INIT] Admin token length: 232
[AGORA-CALL-INIT] Client token length: 232
```

### Frontend join
```text
[AGORA-JOIN]
[AGORA-JOIN] AppID: 4f3b...<app-id>
[AGORA-JOIN] Channel: job_1234abcd_5678efgh
[AGORA-JOIN] UID: 1523
[AGORA-JOIN] Token length: 232
[AGORA-JOIN] Token preview: 006xxxxxxxxxxxxxxxxx...
```

## 5. Reproduction Steps
1. Start backend:
   - `cd backend`
   - `uvicorn idle_land_api:app --reload --host 0.0.0.0 --port 8000`
2. Start frontend dev client:
   - `cd frontend`
   - `npx expo start --dev-client`
3. On device, log in as interviewer/admin.
4. Initiate a call for a job.
5. Capture logs from:
   - Backend console (`[AGORA-TOKEN-DEBUG]`, `[AGORA-CALL-INIT]`)
   - Frontend console (`[AGORA-JOIN]`)
6. Validate:
   - AppID and certificate lengths are correct
   - Token lengths are around 200+
   - Channel and UID values match across backend and frontend
7. If connection fails, record the Agora connection failure reason and correlate with the above logs.

## Notes
- This instrumentation is temporary and only adds logging.
- No application logic was changed.
