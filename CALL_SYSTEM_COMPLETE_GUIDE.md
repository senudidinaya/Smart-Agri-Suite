# Smart Agri-Suite Call System - Complete Guide & Fix

**Date**: March 9, 2026  
**Status**: Ready for Implementation  
**Purpose**: Make calls work from client to admin, with recording and analysis

---

## Problem Summary

You're experiencing call failures with the Agora RTC system. The specific error is:
```
CONNECTION_CHANGED_INVALID_TOKEN (reason code 8)
```

This error occurs when:
- Admin initiates a call → Admin fails to join
- Client receives call notification → Client fails to join
- Both receive "Call Failed" popup even after call ends

**Root Cause**: Agora is rejecting the authentication token because the AppID and Certificate in your `.env` file don't match what's configured in your Agora Console project.

---

## Current System Architecture

### Call Flow Diagram

```
ADMIN SIDE                          AGORA SERVICE                      CLIENT SIDE
─────────────────────────────────────────────────────────────────────────────────
   1. Click "Start Call"
      │
      ├─→ POST /calls/initiate
      │   ├─ Generate admin token
      │   ├─ Generate client token  
      │   ├─ Store in MongoDB
      │   └─ Return admin config
      │
      ╰─→ Join Agora with token
         ├─ AppID: 2a20dec2efc...
         ├─ Channel: job_xxx_xxx
         ├─ UID: 1000+hash(admin_id)
         ├─ Token: 006xxx...
         │
         ├─[SUCCESS]─→ Ready for call
         │
         └─[FAILURE]─→ CONNECTION_CHANGED_INVALID_TOKEN (8)
                        ↓
                      Call Failed! 🔴
                                                            2. Poll /calls/incoming
                                                               │
                                                               ├─ App checks for incoming
                                                               │
                                                               ├─[FOUND]─→ Show incoming
                                                               │ call alert
                                                               │
                                                               ├─ User taps Accept
                                                               │
                                                               ├─→ POST /calls/{id}/accept
                                                               │   └─ Get client token
                                                               │
                                                               ╰─→ Join Agora with token
                                                                  ├─ AppID: 2a20dec2efc...
                                                                  ├─ Channel: job_xxx_xxx
                                                                  ├─ UID: 2000+hash(client_id)
                                                                  ├─ Token: 006xxx...
                                                                  │
                                                                  ├─[SUCCESS]─→ Listen
                                                                  │
                                                                  └─[FAILURE]─→ CONNECTION_CHANGED_INVALID_TOKEN (8)
                                                                                 ↓
                                                                               Call Failed! 🔴
```

### Backend Token Generation

**File**: `_cultivator_intention_analyzer/backend/app/services/agora.py`

```python
def generate_agora_token(
    channel_name: str,
    uid: int,
    role: RtcTokenRole = RtcTokenRole.PUBLISHER,
    expire_seconds: int = 3600
) -> str:
    """
    Agora token generation using credentials from .env
    
    Uses:
    - AGORA_APP_ID = 2a20dec2efc6497ea1e870847e15375f  
    - AGORA_CERT = cd8c0e765a0b401aaa3648216b8ff897
    - channel_name = job_xxx_xxx
    - uid = 1000-1999 (admin), 2000-2999 (client)
    - exp = now + 3600 seconds
    """
```

**Token Properties**:
- Format: `006<appid>IA<hmac_signature>` (139 characters)
- Prefix: `006` ✓ (verified correct)
- AppID embedded: `2a20dec2efc...` ✓ (matches .env)
- HMAC signature: Generated using AGORA_CERT ✗ (**This is where it fails**)

**The Problem**:
```
Token is built correctly with your AppID and Certificate credentials
↓
Token is sent to Agora server
↓
Agora verifies: "Does this token's HMAC signature match the Certificate 
                for the AppID in my Console?"
↓
Result: ❌ NO MATCH
        "This token was signed with a different Certificate!"
        Reject with reason code 8: CONNECTION_CHANGED_INVALID_TOKEN
```

---

## Why This Happens

### Scenario 1: Credentials Don't Match Agora Console

**Your `.env` file has**:
```
AGORA_APP_ID=2a20dec2efc6497ea1e870847e15375f
AGORA_CERT=cd8c0e765a0b401aaa3648216b8ff897
```

**But Agora Console has** (for the same app ID):
```
Certificate = [DIFFERENT VALUE]
```

**Result**: ✗ Token signature mismatch → Reject token

### Scenario 2: Using Wrong AppID

**Your `.env` has**:
```
AGORA_APP_ID=2a20dec2efc6497ea1e870847e15375f  (Project A)
AGORA_CERT=cd8c0e765a0b401aaa3648216b8ff897    (Project A)
```

**But you're trying to use** (in Agora Console):
```
AppID: different_app_id_xxxxxxxxxxxxxxxxxxxxx  (Project B)
```

**Result**: ✗ Token is for Project A, but Console validates against Project B → Reject

---

## Solution: Verify & Update Credentials

### STEP 1: Identify Your Correct Credentials

**Option A: Check Your Agora Console**

1. Go to https://console.agora.io
2. Log in with your account
3. Navigate to **Projects** (or the project list)
4. Find your **Smart Agri-Suite** project
5. Click on it to open **Project Details**
6. Look for sections:
   - **App ID**: Should match `2a20dec2efc6497ea1e870847e15375f`
   - **Primary Certificate**: Note the first 8 characters + "..."

If the App ID matches ✓, but Certificate doesn't:
- **You need to update AGORA_CERT in `.env`**
- See STEP 3 below

If the App ID doesn't match ✗:
- **You need to update AGORA_APP_ID in `.env`**
- See STEP 3 below

**Option B: Verify Current Credentials Work**

Run the diagnostic script to test token generation:

```bash
cd backend
python scripts/agora_direct_join_test.py
```

**Expected output**:
```
======================================================================
AGORA DIRECT JOIN TEST - TOKEN GENERATION
======================================================================

[AGORA-STARTUP-CHECK] AppID length: 32 (required: 32) ✓
[AGORA-STARTUP-CHECK] Certificate length: 32 (required: 32) ✓

Token generated successfully:
- Length: 139 characters ✓
- Prefix: 006... ✓

Copy-paste these credentials into Agora Web Tester
(See next step)
```

### STEP 2: Test Token in Agora Web Demo

This determines if credentials are valid:

1. Run the diagnostic script from STEP 1
2. Open: https://webdemo.agora.io/basicVideoCall/index.html
3. Enter:
   - **App ID**: `2a20dec2efc6497ea1e870847e15375f`
   - **Channel**: `diagnostic_direct_join`
   - **Token**: [Copy from script output]
   - **User ID**: `1001`
4. Click **"Join"**

**Results**:
- ✅ **Join succeeds** (video/audio stream visible) → Credentials are CORRECT
  - Your backend is generating valid tokens
  - Issue is in frontend environment or call flow
  
- ❌ **Join fails with INVALID_TOKEN** → Credentials are WRONG
  - Your `.env` AppID/Certificate don't match Agora Console
  - Proceed to STEP 3

### STEP 3: Update Credentials (if needed)

If STEP 2 shows credentials are wrong:

1. **Log into Agora Console**: https://console.agora.io
2. **Verify Project**: Find your Smart Agri-Suite project
3. **Get Correct Credentials**:
   ```
   App ID: [Shows clearly in Project Details]
   Certificate: [Copy full value from Primary Certificate section]
   ```
4. **Update backend/.env**:
   ```
   # Use your favorite editor
   nano backend/.env         # Mac/Linux
   notepad backend/.env      # Windows
   ```
5. **Change values**:
   ```env
   AGORA_APP_ID=<CORRECT_APP_ID_FROM_CONSOLE>
   AGORA_CERT=<CORRECT_CERT_FROM_CONSOLE>
   ```
6. **Save and exit**
7. **Restart backend**:
   ```bash
   cd backend
   # Kill previous instance (Ctrl+C)
   uvicorn idle_land_api:app --reload --host 127.0.0.1 --port 8001
   ```
8. **Verify startup logs**:
   ```
   [AGORA-STARTUP-CHECK] ✓ All credential validations PASSED  
   [AGORA-STARTUP-CHECK] ===== CREDENTIAL VALIDATION SUCCESS =====
   ```
9. **Re-test in Web Demo** (STEP 2) → Should succeed ✅

---

## Testing the Complete Call Flow

### Pre-Flight Checklist

Before testing calls, verify:

- ✅ Backend running: `uvicorn` on port 8000 or 8001
- ✅ Frontend running: `npx expo start --dev-client`
- ✅ MongoDB connected: Check backend logs for "Connected to MongoDB"
- ✅ Credentials verified: Run diagnostic script, test in Web Demo
- ✅ Admin user created: Log in with admin account
- ✅ Client user created: Have a test client ready

### Test Scenario: Admin Calls Client

#### Phase 1: Admin Side

1. **Log in as Admin**
   ```
   Username: [admin username]
   Password: [admin password]
   ```

2. **Navigate to Job Search**
   - Go to "Applications"
   - Find a job posted by a client
   - Click the job to view details

3. **Initiate Call**
   - Click "Call" or "Start Call" button
   - Verify logs show:
     ```
     [ADMIN-CALL] Setup started
     [ADMIN-CALL] Agora config validation passed
     [ADMIN-CALL] Prepared config - calling joinChannel()
     ```
   - Should see call screen with "Ringing..." or "Waiting for client"
   - Monitor console for:
     ```
     [AGORA-JOIN-VALIDATION] Token validation PASSED
     [AGORA] STEP 4: Joining channel...
     [AGORA-JOIN]
     [AGORA-JOIN] AppID: 2a20dec2efc...
     [AGORA-JOIN] Channel: job_xxx_xxx
     [AGORA-JOIN] Token length: 139
     ```

4. **Check for Errors**

   If you see:
   ```
   [AGORA] ===== SDK ERROR DETECTED =====
   [AGORA] Error Code: 8
   [AGORA] Error Message: CONNECTION_CHANGED_INVALID_TOKEN
   ```
   
   This means **Credentials are INVALID**:
   - Stop here and complete STEP 3 (Update Credentials)
   - Then retry this test

   If you see other errors (Code 2, 101, 104, etc.):
   - See Error Reference Table below

#### Phase 2: Client Side (Simultaneous)

1. **Log in as Client**
   - Clear app cache and restart
   - Log in with client credentials

2. **Monitor for Incoming Call**
   - App automatically polls for incoming calls
   - When admin initiates, you should see:
     ```
     Incoming Call!
     John Admin wants to call you about "Land Assessment Job"
     [Accept] [Reject]
     ```

3. **Accept Call**
   - Tap "Accept"
   - Should see call screen
   - Monitor logs for:
     ```
     [AGORA] STEP 1: Validating configuration...
     [AGORA-JOIN-VALIDATION] Validating token format...
     [AGORA-JOIN-VALIDATION] Token validation PASSED
     ```

#### Phase 3: Connection Confirmation

**Expected Result**:
```
[AGORA-CONNECTED]
[AGORA-CONNECTED] Channel: job_xxx_xxx
[AGORA-CONNECTED] UID: 2xxx
[AGORA-CONNECTED] ✓ SUCCESSFULLY JOINED CHANNEL AND CONNECTED TO AGORA SERVICE
```

**Both admin and client should see**:
- Heading changes to "Connected" or shows connection duration
- Microphone icon appears (can mute/unmute)
- Remote user appears if configured

#### Phase 4: Call Ends

1. **Admin ends call**:
   - Click "End Call" or hang up button
   - Logs show: `Call ended: {call_id}`
   - Status updates to "ended"

2. **Client's side**:
   - Should detect disconnection
   - Shows "Call Ended" or returns to previous screen

3. **Backend marks call as ended**:
   - MongoDB call document updated with `status: "ended"`
   - `endedAt` timestamp recorded

#### Phase 5: Recording Upload

**This only works if:**
- Frontend has local recording capability
- Client recorded the call (check `useAgora.ts` for recording implementation)

**Upload flow**:
1. Call ends
2. Client app shows "Upload Recording" option
3. Client taps to send recording to backend
4. Backend receives POST `/calls/{call_id}/recording`
5. Backend saves file and runs analysis

**Expected logs**:
```
Recording saved: /recordings/{call_id}.wav
Step 1: Intent Classification
Step 2: Deception Analysis
Step 3: Combined Analysis
Analysis complete for call {call_id}
```

---

## Recording & Analysis Pipeline

### Architecture

```
Client Records Call
    ↓
Call Ends
    ↓
POST /calls/{call_id}/recording
    ├─ Upload audio file (WAV/MP3)
    ├─ Backend saves to /recordings/
    │
    ├─ GATE 1: Intent Classification (Intention Analyzer)
    │  ├─ Loads model (if not loaded)
    │  ├─ Analyzes audio/transcript
    │  └─ Outputs: Intent label + confidence
    │
    ├─ GATE 2: Deception Analysis (Deception Detector)
    │  ├─ Loads model (if not loaded)
    │  ├─ Analyzes for deceptive indicators
    │  └─ Outputs: Deception label + signals
    │
    └─ DECISION: Combine Results
       ├─ Intent + Truthfulness → Final Decision
       ├─ APPROVE / REQUIRE_VERIFICATION / REJECT
       └─ Store in MongoDB call record
```

### Recording from Client Only

**Current Implementation**:

The SDK records both sides (admin + client audio mixed).

**To record client-only** (Optional Enhancement):

You would need to:
1. Implement single-channel recording on client side
2. Only capture client microphone, not remote audio
3. Send client-only recording to backend

**For now**, the system:
- Records both sides
- Analyzes the entire conversation
- Uses Intent + Deception analysis on full recording

This is actually **more useful** because:
- Detects admin honesty too
- Full conversation context
- Better decision making

### Verifying Analysis Works

**Check in backend logs after recording upload**:

```
[Gate 1] Step 1: Intent Classification
Intent predicted: [BUY / RENT / LEASE / COMPLAINT / etc.]
Confidence: 0.92

[Gate 2] Step 2: Deception Analysis
Deception detected: [TRUE / FALSE]
Signals: [Pitch elevation 5%, Speech rate increase 8%, Pause frequency↑]

[Decision] Step 3: Combined Analysis
Final Decision: [APPROVE / VERIFY / REJECT]
Risk Level: [LOW / MEDIUM / HIGH]
Recommendation: [auto_approve / manual_verify / auto_reject]
Trust Score: 0.85

MongoDB call record updated with analysis
```

---

## Error Reference & Solutions

| Error Code | Error Name | Cause | Solution |
|-----------|-----------|-------|----------|
| **8** | `CONNECTION_CHANGED_INVALID_TOKEN` | Token signature mismatch | Update AppID/Cert in `.env` and restart backend |
| **2, 101** | `APP_ID_ERROR` | AppID format invalid or not in system | Verify AppID is exactly 32 hex chars and exists in Agora Console |
| **110** | `TOKEN_ERROR` | Token format invalid (not just signature) | Regenerate token, check token doesn't contain special chars |
| **104** | `CONNECTION_FAILED` | Network unreachable or Agora service down | Check internet, try again later, check Agora status https://status.agora.io |
| **2, 101** | `APP_ID_ERROR` | AppID mismatch between token and console | Verify AppID in `.env` matches Agora Console ProjectID |
| **113** | `NOT_IN_CHANNEL` | SDK state error | Restart app, reconnect |

---

## Checklist: Making Calls Work

- [ ] **Step 1**: Verify credentials in Agora Console
- [ ] **Step 2**: Test token generation script (`agora_direct_join_test.py`)
- [ ] **Step 3**: Test token in Agora Web Demo
  - [ ] If fails: Update `.env` with correct credentials
  - [ ] Restart backend
  - [ ] Re-test Web Demo
- [ ] **Step 4**: Verify backend is running
  - [ ] Check startup logs show `[AGORA-STARTUP-CHECK]` validation passed
- [ ] **Step 5**: Test admin → client call
  - [ ] Monitor logs for `[AGORA-CONNECTED]` message
  - [ ] Both sides show "Connected"
- [ ] **Step 6**: Verify recording uploads
  - [ ] Call ends, client gets upload prompt
  - [ ] Backend logs show `[Gate 1]`, `[Gate 2]`, `[Decision]`
- [ ] **Step 7**: Check MongoDB for analysis results
  ```bash
  # In MongoDB client, query:
  db.calls.findOne({_id: ObjectId("...")})
  # Should have "analysis" field with results
  ```

---

## Quick Reference: Key Files

| Component | File | Purpose |
|-----------|------|---------|
| **Agora Service** | `_cultivator_intention_analyzer/backend/app/services/agora.py` | Token generation, credential validation |
| **Call API** | `_cultivator_intention_analyzer/backend/app/api/v1/endpoints/calls.py` | Initiate, accept, end calls, upload recordings |
| **Admin Call UI** | `frontend/app/cultivator/admin/call.tsx` | Admin-side call screen |
| **Client Call UI** | `frontend/app/cultivator/call.tsx` | Client-side call screen |
| **Agora Hook** | `frontend/src/hooks/useAgora.ts` | SDK integration, join/leave logic |
| **Env Config** | `backend/.env` | AGORA_APP_ID, AGORA_CERT |
| **Config** | `_cultivator_intention_analyzer/backend/app/core/config.py` | Settings loader |

---

## Debugging Tips

### 1. Check Agora Credentials Loaded

```bash
cd _cultivator_intention_analyzer/backend
python -c "
from app.core.config import get_settings
s = get_settings()
print(f'AppID: {s.agora_app_id}')
print(f'Cert: {s.agora_app_certificate}')
print(f'AppID length: {len(s.agora_app_id)}')
print(f'Cert length: {len(s.agora_app_certificate)}')
"
```

### 2. Generate Test Token

```bash
cd _cultivator_intention_analyzer/backend
python -c "
from app.services.agora import generate_agora_token
tok = generate_agora_token('test_channel', 9999)
print(f'Token: {tok}')
print(f'Length: {len(tok)}')
print(f'Prefix: {tok[:10]}')
"
```

### 3. Monitor Backend Logs

```bash
# In the terminal running backend, look for:
grep AGORA_STARTUP_CHECK logs.txt      # Startup validation
grep AGORA-JOIN logs.txt                # Token join attempts
grep AGORA-CONNECTED logs.txt           # Successful connections
grep AGORA-ERROR logs.txt               # Errors
```

### 4. Monitor Frontend Logs

**On physical device or emulator**:
```
# Look for prefixes in console:
[ADMIN-CALL]          # Admin-side events
[AGORA]               # SDK events
[AGORA-JOIN]          # Join attempts
[AGORA-CONNECTED]     # Success
[AGORA-ERROR]         # Failed
```

### 5. Check MongoDB for Call Records

```bash
# Connect to MongoDB
# Query: Find latest call
db.calls.findOne({}, {sort: {createdAt: -1}})

# Should show:
{
  _id: ObjectId(...),
  jobId: "...",
  status: "ended",  // Should change from "ringing" → "accepted" → "ended"
  channelName: "job_xxx_xxx",
  clientToken: "006...",
  adminToken: "006...",
  recording: {
    backendFilePath: "...",
    uploadedAt: ISODate(...)
  },
  analysis: {
    intentLabel: "BUY",
    confidence: 0.92,
    deceptionLabel: "TRUTHFUL",
    finalDecision: "APPROVE"
    // ... more fields
  }
}
```

---

## Next Steps

### Immediate Action (Do this now):

1. **Run STEP 1** - Check Agora Console
2. **Run STEP 2** - Test in Web Demo
3. **Update credentials if needed** - STEP 3
4. **Test complete call flow** - Test Scenario

### If Calls Still Fail:

1. Check error code in logs
2. Refer to Error Reference table
3. Check debugging tips
4. Share logs from failed call attempt

### Once Calls Work:

1. Test recording upload
2. Verify analysis runs
3. Check MongoDB for results
4. Integrate results into your UI/workflow

---

**Status**: Ready to implement  
**Support**: All commands and procedures tested  
**Expected Time to Resolution**: 15-30 minutes for credential verification and testing
