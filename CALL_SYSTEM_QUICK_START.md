# QUICK ACTION: Get Calls Working Now

**Time to Complete**: ~30 minutes  
**Prerequisites**: Admin and Client user accounts created  
**Goal**: Complete a successful call from admin to client with recording analysis

---

## PHASE 1: Verify Your Credentials (5 minutes)

### Action 1.1: Check Your Agora Console

```
1. Open: https://console.agora.io
2. Log in
3. Find your Smart Agri-Suite project  
4. Note the APP ID shown in Project Details
5. Check: Compare with value in backend/.env

   backend/.env has: AGORA_APP_ID=2a20dec2efc6497ea1e870847e15375f
   
   If Console shows DIFFERENT AppID:
   ⚠️  Your AppID is WRONG → Must update .env
   
   If Console shows SAME AppID:
   ✓ AppID is correct
```

### Action 1.2: Generate Test Token

```bash
cd _cultivator_intention_analyzer/backend

python -c "
from app.services.agora import validate_agora_credentials_at_startup
result = validate_agora_credentials_at_startup()
print(f'✓ Credentials Valid: {result}')
"
```

**Expected Output**:
```
[AGORA-STARTUP-CHECK] ===== CREDENTIAL VALIDATION =====
[AGORA-STARTUP-CHECK] AppID length: 32 (required: 32)
[AGORA-STARTUP-CHECK] Certificate length: 32 (required: 32)
[AGORA-STARTUP-CHECK] ✓ All credential validations PASSED
✓ Credentials Valid: True
```

**If you see ERROR**:
```
[AGORA-STARTUP-CHECK] AppID length: X (required: 32)
[AGORA-STARTUP-CHECK] VALIDATION FAILED
```

→ Go to PHASE 2 (Update Credentials)

---

## PHASE 2: Update Credentials (If Needed)

### Only if PHASE 1 showed errors:

```bash
# Edit credentials
cd backend
notepad .env           # Windows
# OR
nano .env              # Mac/Linux

# Update these values from your Agora Console:
AGORA_APP_ID=your_correct_app_id_from_console
AGORA_CERT=your_correct_certificate_from_console

# Save and exit
```

### Restart Backend

```bash
# Kill the previous backend instance (Ctrl+C in that terminal)

# Restart:
cd backend
uvicorn idle_land_api:app --reload --host 127.0.0.1 --port 8001

# Watch for success message:
# [AGORA-STARTUP-CHECK] ✓ All credential validations PASSED
```

---

## PHASE 3: Test Credentials Work (5 minutes)

### Test in Agora Web Demo

```bash
# In another terminal, generate a test token:
cd backend
python scripts/agora_direct_join_test.py
```

**Copy the output values**:
```
AppID: 2a20dec2efc6497ea1e870847e15375f
Channel: diagnostic_direct_join
UID: 1001
Token: 0062a20dec2efc6497ea1e870847e...
```

### Open Web Demo

1. Visit: https://webdemo.agora.io/basicVideoCall/index.html
2. Paste the values:
   - **App ID**: [paste from above]
   - **Channel**: [paste from above]
   - **Token**: [paste from above - full value]
   - **User ID**: `1001`
3. Click **"Join"**

**Result**:

✅ **Succeeds** (video/audio visible):
- Your credentials are CORRECT
- Backend system is working
- Proceed to PHASE 4

❌ **Fails with error message** (usually INVALID_TOKEN):
- Your credentials are STILL WRONG
- Go back to PHASE 2, double-check values in Agora Console
- Retry PHASE 3

---

## PHASE 4: Test Call Flow (15 minutes)

### Prerequisites:
- [ ] Backend running (port 8001)
- [ ] Frontend running (`npx expo start --dev-client`)
- [ ] MongoDB connected
- [ ] Credentials verified (PHASE 3 passed)

### Test Scenario: Admin Calls Client

#### Setup

```
Device 1: Admin logged in
Device 2: Client logged in
Both can be same phone/emulator, just need two browser tabs or two emulator windows
```

####  Step 1: Admin Initiates Call

**On Admin Device**:

1. Navigate to job search or applications
2. Find a job posted by the test client
3. Click the job
4. Click "Call" or "Start Call" button

**Monitor Logs** (Development Console):
```
[ADMIN-CALL] Setup started
[ADMIN-CALL] Agora config validation passed
[ADMIN-CALL] Token validation reported
[ADMIN-CALL] Prepared config - calling joinChannel()
[AGORA-JOIN] AppID: 2a20dec2efc...
[AGORA-JOIN] Channel: job_xxx_xxx
[AGORA-JOIN] Token length: 139
```

**Expected Result**: Admin call screen shows "Waiting for client" or "Ringing..."

#### Step 2: Client Receives Call

**On Client Device**:

1. Client app automatically polls for incoming calls
2. Should see notification: "Incoming call from [Admin Name]"
3. Two buttons: "Accept" and "Reject"

**If no notification appears after 10 seconds**:
- Manually refresh the app
- Check backend logs for `/incoming` endpoint calls

#### Step 3: Client Accepts Call

**On Client Device**:

1. Tap "Accept"
2. Call screen appears

**Monitor Logs**:
```
[AGORA] STEP 1: Validating configuration...
[AGORA-JOIN-VALIDATION] Validating token format...
[AGORA-JOIN-VALIDATION] Token length: 139 (valid >= 50)
[AGORA-JOIN-VALIDATION] Token validation PASSED
[AGORA] STEP 4: Joining channel...
```

#### Step 4: Both Join Successfully

**Expected Result**:
```
[AGORA-CONNECTED]
[AGORA-CONNECTED] Channel: job_xxx_xxx
[AGORA-CONNECTED] UID: 1xxx (or 2xxx for client)
[AGORA-CONNECTED] ✓ SUCCESSFULLY JOINED CHANNEL AND CONNECTED TO AGORA SERVICE
```

**On Call Screen**:
- Both sides show "Connected"
- Can mute/unmute audio
- Call duration timer starts

**Success!** ✅ Calls are working

#### Step 5: Call Ends

1. Either admin or client taps "End Call"
2. Both see disconnection
3. Call screen closes
4. Status shows "Call Ended"

#### Step 6: Recording Upload (if implemented)

**On Client Device**:

1. After call ends, should see "Upload Recording" option
2. Tap to send recording to backend

**In Backend Logs**:
```
Recording saved: /recordings/{call_id}.wav

[Gate 1] Step 1: Intent Classification
Intent predicted: [LABEL]
Confidence: 0.92

[Gate 2] Step 2: Deception Analysis
Deception: [TRUE/FALSE]

[Decision] Step 3: Combined Analysis
Final Decision: [APPROVE/VERIFY/REJECT]

MongoDB updated with analysis
```

**Success!** ✅ Recording and analysis working

---

## PHASE 5: Verify in Database

### Check Call Was Stored

```bash
# Connect to MongoDB and query:
db.calls.findOne({}, {sort: {createdAt: -1}})
```

**Should show**:
```javascript
{
  _id: ObjectId(...),
  status: "ended",  // ✓ Should be "ended" after call completed
  channelName: "job_xxx_xxx",  // ✓ Both had same channel
  adminUid: 1xxx,  // ✓ 1000s range
  clientUid: 2xxx,  // ✓ 2000s range
  recording: {
    backendFilePath: "...",
    uploadedAt: ISODate(...)
  },
  analysis: {
    intentLabel: "BUY",  // ✓ Gate 1 analysis
    confidence: 0.92,
    deceptionLabel: "TRUTHFUL",  // ✓ Gate 2 result
    finalDecision: "APPROVE",  // ✓ Combined decision
    riskLevel: "LOW"
  }
}
```

---

## Troubleshooting: If Something Fails

### Admin Fails to Join (Step 1)

**Error**: `CONNECTION_CHANGED_INVALID_TOKEN (8)`

**Fix**:
1. Stop here
2. Go back to PHASE 2 - Update credentials
3. Verify in PHASE 3 - Test in Web Demo
4. Retry PHASE 4

**Error**: Different error code (2, 101, 104, etc.)

**Fix**: Refer to Error Reference table in `CALL_SYSTEM_COMPLETE_GUIDE.md`

### Client Doesn't Receive Incoming Call (Step 2)

**Reason**: Polling issue or backend not running

**Fix**:
1. Verify backend is running: Check for `[AGORA-STARTUP-CHECK]` in logs
2. Manually refresh client app
3. Check client is actually logged in and has auth token
4. Check backend logs for `/incoming` endpoint errors

### Client Fails to Join (Step 3)

**Error**: `CONNECTION_CHANGED_INVALID_TOKEN (8)`

→ Same as Admin, issue is credentials

**Error**: Other error code

→ Refer to Error Reference table

### Recording Doesn't Upload (Step 6)

**Reason**: Recording feature might not be implemented on frontend

**Status**: System still works, just without automated recording
- You can manually capture audio during call
- Upload to separate API endpoint
- Backend will analyze it

### Analysis Doesn't Run

**Check**:
1. Backend logs show `[Gate 1]` and `[Gate 2]` messages?
2. Model files exist in `_cultivator_intention_analyzer/backend/models/`?
3. MongoDB connection working?

**If models missing**:
- Download from your model storage
- Place in `models/` directory
- Restart backend

---

## Quick Reference: Key Commands

```bash
# Test credentials
cd _cultivator_intention_analyzer/backend
python -c "from app.services.agora import validate_agora_credentials_at_startup; validate_agora_credentials_at_startup()"

# Generate test token
cd backend
python scripts/agora_direct_join_test.py

# Restart backend
cd backend
uvicorn idle_land_api:app --reload --host 127.0.0.1 --port 8001

# Restart frontend
cd frontend
npx expo start --dev-client

# Check MongoDB
# Use MongoDB Compass or your client to query db.calls
```

---

## When You're Done

✅ Calls work between admin and client  
✅ Both can join and communicate  
✅ Recording uploads and analyzes  
✅ Results stored in MongoDB  

Your system is ready for:
- Production deployment
- User testing
- Integration with your application workflow

---

**Next**: See `CALL_SYSTEM_COMPLETE_GUIDE.md` for detailed information and troubleshooting

