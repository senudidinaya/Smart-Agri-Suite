# Agora Token Pipeline Instrumentation Summary

## Overview
Added structured debug logging across the entire Agora RTC call pipeline to trace token values at every stage from backend generation to frontend joinChannel call.

**Objective:** Identify where/if the Agora token is being corrupted between backend and frontend.

---

## Log Format Standard

All logs follow this format:
```
[PHASE-NAME] key1=value1 key2=value2 ...
```

### Key Fields Tracked:
- `channel` - Agora channel name
- `uid` - User ID for the call
- `prefix` - First 10 characters of token (safe to log)
- `length` - Total token length
- `starts_with_006` - Boolean validation (Agora tokens must start with "006")

---

## Instrumentation Points

### PHASE 1: Backend Token Generation
**File:** `backend/cultivator/services/agora.py`  
**Function:** `generate_agora_token()`  
**Location:** Line ~423, immediately after token is generated

**Log Format:**
```
[AGORA-BACKEND-GENERATE] channel=<channel> uid=<uid> prefix=<first_10> length=<len> starts_with_006=<bool>
```

**Example:**
```
[AGORA-BACKEND-GENERATE] channel=job_69a86ad2_69adb8f0 uid=1482 prefix=006e18906a length=139 starts_with_006=True
```

**What to Check:**
- ✅ Token should start with "006"
- ✅ Length should be ~139 characters (with production credentials)
- ✅ Prefix should be consistent `006e18906a...`

---

### PHASE 2: Backend API Response
**Files:** 
- `backend/cultivator/api/v1/endpoints/calls.py` (initiate_call)
- `backend/cultivator/api/v1/endpoints/calls.py` (accept_call)

**Location:** Before returning CallInitiateResponse / CallAcceptResponse

**Log Format:**
```
[AGORA-BACKEND-RESPONSE] channel=<channel> uid=<uid> prefix=<first_10> length=<len> starts_with_006=<bool>
```

**What to Check:**
- ✅ Token prefix/length should match PHASE 1
- ✅ No corruption during database storage/retrieval
- ✅ Both admin token (initiate) and client token (accept) logged

---

### PHASE 3: Frontend API Response Handling
**Files:**
- `frontend/app/cultivator/admin/applications.tsx` (admin initiates call)
- `frontend/app/cultivator/_layout.tsx` (client receives incoming call)
- `frontend/app/cultivator/incoming-call.tsx` (client accepts call)

**Location:** Immediately after `api.initiateCall()` or `api.acceptCall()` or `checkIncomingCall()`

**Log Format:**
```
[AGORA-FRONTEND-RECEIVE] channel=<channel> uid=<uid> prefix=<first_10> length=<len> starts_with_006=<bool>
```

**What to Check:**
- ✅ Token prefix/length should match PHASE 2
- ✅ No corruption during HTTP response parsing
- ✅ Frontend receives exact same token backend sent

---

### PHASE 4: AsyncStorage Save
**Files:**
- `frontend/app/cultivator/admin/applications.tsx`
- `frontend/app/cultivator/_layout.tsx`
- `frontend/app/cultivator/incoming-call.tsx`

**Location:** Before `AsyncStorage.setItem()`

**Log Format:**
```
[AGORA-FRONTEND-STORAGE-SAVE] prefix=<first_10> length=<len>
```

**What to Check:**
- ✅ Token prefix/length should match PHASE 3
- ✅ Token about to be stored is still uncorrupted

---

### PHASE 5: AsyncStorage Load
**Files:**
- `frontend/app/cultivator/admin/call.tsx` (admin call screen)
- `frontend/app/cultivator/call.tsx` (client call screen)

**Location:** After `AsyncStorage.getItem()` and `JSON.parse()`

**Log Format:**
```
[AGORA-FRONTEND-STORAGE-LOAD] prefix=<first_10> length=<len> starts_with_006=<bool>
```

**What to Check:**
- ✅ Token prefix/length should match PHASE 4
- ✅ No corruption during AsyncStorage serialization/deserialization
- ✅ JSON.parse() preserves token exactly

---

### PHASE 6: Before joinChannel()
**File:** `frontend/src/hooks/useAgora.ts`  
**Function:** `joinChannel()`  
**Location:** Line ~577, immediately before `engine.joinChannel()` call

**Log Format:**
```
[AGORA-FRONTEND-JOIN] channel=<channel> uid=<uid> prefix=<first_10> length=<len> starts_with_006=<bool>
```

**What to Check:**
- ✅ Token prefix/length should match PHASE 5
- ✅ This is the **final token** passed to Agora SDK
- ✅ If this is corrupted, corruption happened before this point
- ✅ If this is valid but join fails, issue is with Agora credentials/network

---

### PHASE 7: Join Result
**File:** `frontend/src/hooks/useAgora.ts`  
**Event Handlers:** `onJoinChannelSuccess`, `onError`

**Success Log:**
```
[AGORA-JOIN-SUCCESS]
[AGORA-CONNECTED]
[AGORA-CONNECTED] Channel: <channel>
[AGORA-CONNECTED] UID: <uid>
[AGORA-CONNECTED] Elapsed: <ms> ms
[AGORA-CONNECTED] ✓ SUCCESSFULLY JOINED CHANNEL AND CONNECTED TO AGORA SERVICE
```

**Failure Log:**
```
[AGORA-JOIN-FAILED] error=<error_message> code=<error_code>
[AGORA] ===== SDK ERROR DETECTED =====
[AGORA] Error Code: <code>
[AGORA] Error Message: <msg>
```

**What to Check:**
- ✅ Success means token was valid and accepted by Agora
- ❌ Error code 110 = Invalid/expired token
- ❌ Error code 101 = Invalid App ID
- ❌ Error code 2 = Token/AppID mismatch

---

## Complete Pipeline Flow

```
Backend:
  PHASE 1: generate_agora_token() → Token created
            ↓
  PHASE 2: initiate_call/accept_call() → Token returned in API response

Network:
  HTTP Response → Token transmitted to frontend

Frontend:
  PHASE 3: api.initiateCall/acceptCall/checkIncoming() → Token received
            ↓
  PHASE 4: AsyncStorage.setItem() → Token saved
            ↓
  PHASE 5: AsyncStorage.getItem() → Token loaded
            ↓
  PHASE 6: joinChannel() → Token passed to Agora SDK
            ↓
  PHASE 7: onJoinChannelSuccess/onError → Result

Expected Timeline:
  [AGORA-BACKEND-GENERATE] ...
  [AGORA-BACKEND-RESPONSE] ...
  [AGORA-FRONTEND-RECEIVE] ...
  [AGORA-FRONTEND-STORAGE-SAVE] ...
  [AGORA-FRONTEND-STORAGE-LOAD] ...
  [AGORA-FRONTEND-JOIN] ...
  [AGORA-JOIN-SUCCESS] or [AGORA-JOIN-FAILED]
```

---

## How to Use These Logs

### 1. **Restart Services**
```bash
# Stop backend and frontend (Ctrl+C in both terminals)

# Terminal 1 - Backend
cd backend
uvicorn idle_land_api:app --reload --host 0.0.0.0 --port 8000

# Terminal 2 - Frontend
cd frontend
npx expo start --dev-client
```

### 2. **Initiate a Test Call**
- Admin logs in → Applications → Select job → Press "Call" button

### 3. **Collect Logs**
**Backend logs** will appear in the uvicorn terminal:
```
[AGORA-BACKEND-GENERATE] channel=job_abc uid=1001 prefix=006e18906a length=139 starts_with_006=True
[AGORA-BACKEND-RESPONSE] channel=job_abc uid=1001 prefix=006e18906a length=139 starts_with_006=True
```

**Frontend logs** will appear in Metro bundler console or device console:
```
[AGORA-FRONTEND-RECEIVE] channel=job_abc uid=1001 prefix=006e18906a length=139 starts_with_006=true
[AGORA-FRONTEND-STORAGE-SAVE] prefix=006e18906a length=139
[AGORA-FRONTEND-STORAGE-LOAD] prefix=006e18906a length=139 starts_with_006=true
[AGORA-FRONTEND-JOIN] channel=job_abc uid=1001 prefix=006e18906a length=139 starts_with_006=true
[AGORA-JOIN-SUCCESS]
```

### 4. **Compare Token Values**
Create a comparison table:

| Phase | Prefix | Length | Starts 006? | Notes |
|-------|--------|--------|-------------|-------|
| BACKEND-GENERATE | 006e18906a | 139 | ✅ Yes | |
| BACKEND-RESPONSE | 006e18906a | 139 | ✅ Yes | |
| FRONTEND-RECEIVE | 006e18906a | 139 | ✅ Yes | |
| FRONTEND-STORAGE-SAVE | 006e18906a | 139 | - | |
| FRONTEND-STORAGE-LOAD | 006e18906a | 139 | ✅ Yes | |
| FRONTEND-JOIN | 006e18906a | 139 | ✅ Yes | |
| JOIN RESULT | - | - | - | SUCCESS ✅ |

**If values differ at any stage, that's where corruption occurs!**

---

## Common Issues & Diagnosis

### Issue: Token prefix changes between phases
**Symptom:** Prefix is `006e18906a` in backend but becomes `%2B...` or different in frontend  
**Root Cause:** URL encoding corruption (should be fixed with AsyncStorage approach)  
**Solution:** Verify AsyncStorage is being used correctly, not URL params

### Issue: Token length changes
**Symptom:** Length is 139 in backend but 150+ in frontend  
**Root Cause:** Extra encoding/escaping added  
**Solution:** Check JSON stringify/parse, ensure no double-encoding

### Issue: `starts_with_006=false` anywhere
**Symptom:** Boolean check fails at any stage  
**Root Cause:** Token corrupted before that point  
**Solution:** Look at previous phase to identify corruption point

### Issue: All phases show valid token but JOIN FAILED
**Symptom:** Token is valid throughout but Agora rejects it  
**Root Cause:** Not a corruption issue - likely:
- Token expired (check timestamps)
- App ID doesn't match certificate
- Network connectivity
- Agora service issue  
**Solution:** Verify credentials in backend/.env, check Agora console

---

## Files Modified

### Backend (2 files)
1. `backend/cultivator/services/agora.py` - Added PHASE 1 logging
2. `backend/cultivator/api/v1/endpoints/calls.py` - Added PHASE 2 logging

### Frontend (6 files)
1. `frontend/app/cultivator/admin/applications.tsx` - Added PHASE 3 & 4 logging
2. `frontend/app/cultivator/admin/call.tsx` - Added PHASE 5 logging
3. `frontend/app/cultivator/_layout.tsx` - Added PHASE 3 & 4 logging
4. `frontend/app/cultivator/incoming-call.tsx` - Added PHASE 3 & 4 logging
5. `frontend/app/cultivator/call.tsx` - Added PHASE 5 logging
6. `frontend/src/hooks/useAgora.ts` - Added PHASE 6 & 7 logging

**Total: 8 files modified**  
**Lines added: ~80 logging lines**  
**Business logic changed: 0** ✅

---

## Verification Checklist

After restarting services, verify logs appear:

- [ ] Backend terminal shows `[AGORA-BACKEND-GENERATE]`
- [ ] Backend terminal shows `[AGORA-BACKEND-RESPONSE]`
- [ ] Frontend console shows `[AGORA-FRONTEND-RECEIVE]`
- [ ] Frontend console shows `[AGORA-FRONTEND-STORAGE-SAVE]`
- [ ] Frontend console shows `[AGORA-FRONTEND-STORAGE-LOAD]`
- [ ] Frontend console shows `[AGORA-FRONTEND-JOIN]`
- [ ] Frontend console shows `[AGORA-JOIN-SUCCESS]` or `[AGORA-JOIN-FAILED]`

If all logs appear and all show matching token values → **No corruption, token is valid throughout pipeline**
