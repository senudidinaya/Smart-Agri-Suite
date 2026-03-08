# Interview Call Flow - Full Diagnostic Analysis

**Date**: March 8, 2026  
**Status**: ANALYSIS ONLY - No code modifications made  
**Observed Issue**: Admin fails to start call with "Failed to start the call. Please try again." AND "Failed to fetch questions: Error: DEEPSEEK_API_KEY is missing or invalid" while client successfully receives incoming call screen

---

## PHASE 1: Call Button Logic (Admin Side)

### File Location
[frontend/app/cultivator/admin/applications.tsx](frontend/app/cultivator/admin/applications.tsx#L156)

### Function Flow
```
Admin presses "Call" button on job application card
    ↓
handleCallClient(job: Job) triggered
    ↓
api.initiateCall(job.id)  [POST /cultivator/calls/initiate]
    ↓
Receives CallInitiateResponse:
{
  callId: string (MongoDB ObjectId)
  agora: AgoraTokenInfo {
    appId: string
    channelName: string
    token: string (Agora RTC token)
    uid: number
  }
  roomName: string (legacy)
  livekitUrl: string (legacy)
  token: string (legacy)
}
    ↓
router.push('/cultivator/admin/call', params)
```

### Implementation Code
**Lines 156-176** in admin/applications.tsx:
```typescript
const handleCallClient = async (job: Job) => {
  try {
    const response = await api.initiateCall(job.id);
    router.push({
      pathname: '/cultivator/admin/call',
      params: {
        callId: response.callId,
        agora: response.agora ? JSON.stringify(response.agora) : '',
        clientUsername: job.createdByUsername,
        jobTitle: job.title,
        priorExperience: job.priorExperience,
        roomName: response.roomName || '',
        token: response.token || '',
      },
    });
  } catch (e: any) {
    Alert.alert('Call Failed', e.message);
  }
};
```

✅ **Status**: Call button logic is correctly implemented

---

## PHASE 2: Admin Call Initialization

### File Location
[frontend/app/cultivator/admin/call.tsx](frontend/app/cultivator/admin/call.tsx)

### Initialization Flow

**Lines 75-125** - Main useEffect that triggers when component mounts:

```
Screen mounts with route params (callId, agora config)
    ↓
Creates agoraConfig from agora param using EXPO_PUBLIC_AGORA_APP_ID as fallback
    ↓
Calls useAgora hook with agoraConfig
    ↓
setup() function executes:
  - Token refresh via api.getAgoraToken() (safe try-catch, fallback to existing)
  - Calls joinChannel() from useAgora hook
    ↓
    ├─ SUCCESS: joinChannel() returns true
    │   ├─ Sets callStatus to 'ringing'
    │   └─ Starts polling for call state changes
    │
    └─ FAILURE: joinChannel() returns false
        ├─ Shows Alert: "Failed to start the call. Please try again."
        ├─ Replaces route back to applications screen
        └─ CALL FAILS ❌
```

### Question Fetching (Parallel UseEffect)

**Lines 194-217** - Separate useEffect for question generation:

```typescript
useEffect(() => {
  const fetchQuestions = async () => {
    if (!jobTitle || !priorExperience) return;
    
    setQuestionsLoading(true);
    try {
      const response = await api.generateQuestions(
        jobTitle,
        priorExperience,
        'gate1',
        5
      );
      
      if (response.success) {
        setQuestions(response.questions);
      }
    } catch (err: any) {
      console.error('Failed to fetch questions:', err);
      setQuestionsError(err.message);  // ← Shows to user
    } finally {
      setQuestionsLoading(false);
    }
  };
  
  fetchQuestions();
}, [jobTitle, priorExperience]);
```

**KEY ISSUE #1 - DeepSeek API Not Configured**:
- Calls `/cultivator/explain/questions` endpoint
- Backend calls `generate_questions()` → `_call_deepseek()`
- **`_call_deepseek()` immediately raises RuntimeError**: "DEEPSEEK_API_KEY is not configured in .env"
- TypeError message caught and displayed: "Failed to fetch questions: Error: DEEPSEEK_API_KEY is missing or invalid"

**Impact**: This error occurs in parallel with Agora join attempt but happens AFTER joinChannel(), so it's a secondary display issue (questions area shows error) not the primary call failure.

---

## PHASE 3: Client Incoming Call Logic

### File Location
[frontend/app/cultivator/incoming-call.tsx](frontend/app/cultivator/incoming-call.tsx)

### Client Polling Flow

```
Client app polls for incoming calls periodically
    ↓
api.checkIncomingCall()
    [GET /cultivator/calls/incoming]
    ↓
Backend checks_incoming_call endpoint:
  - Queries MongoDB: db.calls.find_one({ clientUserId, status: 'ringing' })
    ↓
    ├─ Call found: Returns IncomingCallResponse with:
    │   ├─ hasIncomingCall: true
    │   ├─ callId: string
    │   ├─ jobTitle: string
    │   ├─ adminUsername: string
    │   └─ agora: AgoraTokenInfo
    │
    └─ No call: Returns { hasIncomingCall: false }
    ↓
Client receives response
    ├─ If hasIncomingCall=true: Navigate to incoming call screen ✅
    └─ If hasIncomingCall=false: Continue polling
```

### Why Client Still Receives Call

**Critical discovering**: Backend creates the call record in "ringing" status IMMEDIATELY in `initiate_call`:

**In backend/cultivator/api/v1/endpoints/calls.py, lines 155-220**:

```python
@router.post("/initiate", response_model=CallInitiateResponse)
async def initiate_call(data: CallInitiate, ...):
    # ... validation and setup ...
    
    now = datetime.now(timezone.utc)
    call_id = str(ObjectId())
    
    # Create call RECORD in MongoDB
    call_doc = {
        "_id": ObjectId(call_id),
        "jobId": data.jobId,
        "adminUserId": user["sub"],
        "clientUserId": client_user_id,
        "channelName": channel_name,
        "clientToken": client_token,  # ← Stored for client
        "status": "ringing",  # ← Set to ringing immediately
        "createdAt": now,
        "updatedAt": now,
        # ... other fields ...
    }
    
    await db.calls.insert_one(call_doc)  # ← DB record created
    
    # Return response to admin
    return CallInitiateResponse(
        callId=call_id,
        agora=AgoraTokenInfo(...),
        # ...
    )
```

**Result**: 
- ✅ Call record created in "ringing" status (admin-side joinChannel failure doesn't affect this)
- ✅ Client polling finds the "ringing" call in database
- ✅ Client navigates to incoming call screen (with stored token)
- ❌ Admin fails to join Agora RTC channel (joinChannel returns false)

**This explains the observed behavior**: Client sees "Incoming Call / Interviewer / Re: Planting" while admin sees "Failed to start the call"

---

## PHASE 4: Agora Token Generation

### Backend Configuration

**File**: [backend/cultivator/core/config.py](backend/cultivator/core/config.py)

**Settings Schema** (lines 83-110):
```python
class Settings(BaseSettings):
    # ...
    agora_app_id: str = Field(
        default="",
        validation_alias=AliasChoices("AGORA_APP_ID", "agora_app_id"),
        description="Agora App ID from console.agora.io",
    )
    agora_app_certificate: str = Field(
        default="",
        validation_alias=AliasChoices("AGORA_CERT", "AGORA_APP_CERTIFICATE", "agora_app_certificate"),
        description="Agora App Certificate for token generation",
    )
    # ...
```

**Actual .env Values** ([backend/.env](backend/.env)):
```
AGORA_APP_ID=2a20dec2efc6497ea1e870847e15375f
AGORA_CERT=cd8c0e765a0b401aaa3648216b8ff897
```

✅ Backend Agora configuration is present

### Backend Token Generation

**File**: [backend/agora_service.py](backend/agora_service.py)

**Endpoint**: `POST /api/agora/generate-token`

**Function** `generate_token()` (lines 40-64):
- Takes `channelName`, `uid`, `role` from request body
- Calls `generate_agora_token()` from SDK
- Returns `AgoraTokenResponse` with valid token

✅ Backend token generation should work

### Frontend Configuration Issue

**File**: [frontend/src/config.ts](frontend/src/config.ts)

**Line 30**:
```typescript
export const EXPO_PUBLIC_AGORA_APP_ID = process.env.EXPO_PUBLIC_AGORA_APP_ID || '';
```

**Problem**:
- Reads from `process.env.EXPO_PUBLIC_AGORA_APP_ID`
- **This environment variable is NOT set anywhere**
- No `.env` file in frontend folder has this variable
- No `app.json` or `eas.json` has this variable
- **Default fallback: empty string ''**

**Frontend Usage in admin/call.tsx, line 13**:
```typescript
import { EXPO_PUBLIC_AGORA_APP_ID } from '@/config';

const agoraConfig: AgoraConfig | null = agora ? {
  appId: agora.appId || EXPO_PUBLIC_AGORA_APP_ID,  // ← Fallback to empty string
  channelName: agora.channelName,
  token: agora.token,
  uid: agora.uid,
} : null;
```

**Consequence**:
- Backend sends `agora.appId` = "2a20dec2efc6497ea1e870847e15375f" (from initiate_call response)
- This gets used correctly
- BUT if token refresh fails AND agora.appId is empty, fallback is empty string

### Frontend Agora Hook - App ID Check

**File**: [frontend/src/hooks/useAgora.ts](frontend/src/hooks/useAgora.ts#L115-L124)

**Lines 115-124** - initEngine():
```typescript
const initEngine = useCallback(async () => {
  if (!config?.appId) {
    console.warn('Agora App ID not provided');
    return null;
  }
  
  // Initialize Agora RTC engine...
}, [config?.appId]);
```

**If appId is missing**:
- Returns null
- Sets error state: "Voice calling not available on web"
- initEngine() fails
- joinChannel() will fail because engineRef.current is null

---

## PHASE 5: DeepSeek Question Generation Failure

### File Locations
- Backend service: [backend/cultivator/services/deepseek_service.py](backend/cultivator/services/deepseek_service.py)
- Backend endpoint: [backend/cultivator/api/v1/endpoints/explain.py](backend/cultivator/api/v1/endpoints/explain.py)
- Frontend API: [frontend/src/api/cultivatorApi.ts](frontend/src/api/cultivatorApi.ts#L723)

### Backend Configuration

**File**: [backend/cultivator/core/config.py](backend/cultivator/core/config.py)

**Lines 142-149**:
```python
# DeepSeek API settings (AI-powered explainability)
deepseek_api_key: str = Field(
    default="",
    description="DeepSeek API key for generating AI-powered insights",
)
deepseek_base_url: str = Field(
    default="https://api.deepseek.com",
    description="DeepSeek API base URL",
)
```

**Actual .env Values** ([backend/.env](backend/.env)):
- **MISSING** - No `DEEPSEEK_API_KEY` environment variable is set
- Defaults to empty string ""

❌ DeepSeek API key not configured

### DeepSeek API Call Chain

**Flow**:
```
Frontend POST /cultivator/explain/questions
    ↓
Backend endpoint: explain_gate1() or explain_gate2() or generate_interview_questions()
    (explain.py, lines 97-165)
    ↓
Service function: generate_questions() (deepseek_service.py, lines 181-250)
    ↓
Helper function: _call_deepseek() (deepseek_service.py, lines 257-301)
    ↓
Check: if not settings.deepseek_api_key:
    ↓
    RAISE: RuntimeError("DEEPSEEK_API_KEY is not configured in .env")
    ↓
Backend endpoint catches RuntimeError
    ↓
Raises HTTPException(status_code=502, detail=str(exc))
    ↓
Frontend catch block receives error
    ↓
Displays: "Failed to fetch questions: Error: DEEPSEEK_API_KEY is missing or invalid"
```

### Code Evidence

**deepseek_service.py, lines 257-275**:
```python
async def _call_deepseek(system_prompt: str, user_content: str) -> str:
    """
    Call the DeepSeek Chat Completions API.

    Raises:
        RuntimeError: If the API call fails or the key is missing.
    """
    settings = get_settings()

    if not settings.deepseek_api_key:
        raise RuntimeError("DEEPSEEK_API_KEY is not configured in .env")

    # ... rest of function ...
```

**explain.py, lines 130-145**:
```python
@router.post("/questions", response_model=QuestionGenerationResponse)
async def generate_interview_questions(body: QuestionGenerationRequest):
    try:
        # ...
        questions_data = await generate_questions(...)
        # ...
    except RuntimeError as exc:
        logger.error("Question generation failed: %s", exc)
        raise HTTPException(status_code=502, detail=str(exc)) from exc
```

**Frontend cultivatorApi.ts, lines 723-735**:
```typescript
async generateQuestions(
  jobTitle: string,
  plantationType: string,
  gate: 'gate1' | 'gate2',
  numQuestions: number = 5
): Promise<QuestionGenerationResponse> {
  return this.request('POST', '/cultivator/explain/questions', {
    job_title: jobTitle,
    plantation_type: plantationType,
    gate,
    num_questions: numQuestions,
  });
}
```

The request() method in cultivatorApi.ts will throw the error which gets caught in admin/call.tsx's useEffect at line 216:
```typescript
} catch (err: any) {
  console.error('Failed to fetch questions:', err);
  setQuestionsError(err.message || 'Failed to load questions');
}
```

---

## PHASE 6: API Endpoint Flow Verification

### Endpoints Status Check

| Endpoint | Method | Backend Status | Frontend Status | Issue |
|----------|--------|----------------|-----------------|-------|
| `/cultivator/calls/initiate` | POST | ✅ Exists, working | ✅ Calls correctly | None |
| `/cultivator/calls/incoming` | GET | ✅ Exists, working | ✅ Client polls | None |
| `/cultivator/calls/{id}/accept` | POST | ✅ Exists | ✅ Client calls | None |
| `/api/agora/generate-token` | POST | ✅ Exists, returns token | ✅ Token refresh attempted | May return empty appId |
| `/cultivator/explain/questions` | POST | ✅ Exists BUT needs DEEPSEEK_API_KEY | ❌ Fails | **Missing env var** |
| `/cultivator/explain/gate1` | POST | ✅ Exists BUT needs DEEPSEEK_API_KEY | ❌ Would fail | **Missing env var** |
| `/cultivator/explain/gate2` | POST | ✅ Exists BUT needs DEEPSEEK_API_KEY | ❌ Would fail | **Missing env var** |

### Call Flow Completeness

✅ **Admin → Backend**: `handleCallClient()` → `initiateCall()` works  
✅ **Backend**: Call record creation in "ringing" status works  
✅ **Backend → Client**: Client polling finds call works  
❌ **Admin Agora Join**: `useAgora.joinChannel()` fails  
❌ **Question Generation**: `generateQuestions()` fails with DeepSeek error  

---

## PHASE 7: Root Cause Analysis

### Primary Issue: Admin Cannot Join Agora Channel

**Error Message**: "Failed to start the call. Please try again."

**Location in Code**: [admin/call.tsx, line 110](frontend/app/cultivator/admin/call.tsx#L107-L112)

**Root Causes** (in order of likelihood):

#### 1. **Agora Token Validation Failure** (MOST LIKELY)

The token generated in `initiate_call` might be:
- Expired (tokens expire in 3600 seconds)
- Invalid signature (if Agora App Certificate changed)
- Generated with wrong channel name or UID

**Code Path**:
- Backend generates token in `initiate_call` (freshly generated, should be valid)
- Admin call screen attempts token refresh via `api.getAgoraToken()` 
- If refresh fails (catch block at line 106-108), uses fallback
- If token is invalid → Agora SDK rejects it
- Error code in hook: "Invalid token" (ConnectionStateType error)

#### 2. **Invalid Agora App ID** (SECONDARY)

If Agora initialization fails because appId is empty:

**Flow**:
1. Backend sends correct appId in response: "2a20dec2efc6497ea1e870847e15375f"
2. Frontend uses it in agoraConfig
3. Creates engine with this ID
4. Should work... ✅

**BUT** - Frontend fallback exists:
```typescript
appId: agora.appId || EXPO_PUBLIC_AGORA_APP_ID  // EXPO_PUBLIC_AGORA_APP_ID = ''
```

If somehow appId isn't in response, fallback is empty string → Init fails

#### 3. **Native Module Failure** (POSSIBLE)

React-native-agora module might:
- Not be properly installed
- Have import issues
- Throw error during joinChannel() call

**Symptom**: joinChannel() returns false (catch block not hit, just returns false)

#### 4. **Microphone Permission Denied** (POSSIBLE on Android)

```typescript
// In useAgora.ts, joinChannel()
const hasPermission = await requestAndroidPermissions();
if (!hasPermission) {
  setState(...error: 'Microphone permission denied')
  return false;  // ← Could show permission error instead
}
```

### Secondary Issue: DeepSeek Question Generation Fails

**Error Message**: "Failed to fetch questions: Error: DEEPSEEK_API_KEY is missing or invalid"

**Root Cause**: 100% Certain

**Evidence**:
1. Backend config `deepseek_api_key` field exists with default ""
2. .env file does not have DEEPSEEK_API_KEY variable
3. _call_deepseek() checks: `if not settings.deepseek_api_key: raise RuntimeError(...)`
4. RuntimeError caught in endpoint and converted to HTTP 502
5. Frontend catches exception and displays message

**Confirmed by code inspection**:
- [backend/.env](backend/.env) - No DEEPSEEK_API_KEY present
- [backend/.env.example](backend/.env.example) - No mention of DeepSeek settings
- [deepseek_service.py line 275](backend/cultivator/services/deepseek_service.py#L275) - Check for missing key

### Why Client Still Receives Call (Key Finding)

The call record is created **BEFORE** admin attempts Agora join:

**Timeline**:
```
T1: Admin clicks "Call" button
    ↓
T2: api.initiateCall() sends POST request
    ↓
T3: Backend creates call document in MongoDB (status: "ringing")
    ↓
T4: Backend returns response to frontend with callId and agora config
    ↓
T5: Frontend navigates to admin call screen
    ↓
T6: Admin attempts useAgora.joinChannel() ❌ FAILS
    ↓
Meanwhile...
    ↓
T2-T3: Client polling loop finds call record in database
    ↓
T3-T4: Client receives incoming call response from GET /incoming
    ↓
T4-T5: Client navigates to incoming call screen ✅ SUCCESS
```

**Decoupling**: Client and admin communication is entirely separate:
- ✅ Admin → Backend (initiate) → Database (call record created)
- ✅ Client ← Backend (polling) ← Database (call record found)
- ❌ Admin ← Agora RTC (native module join fails)

The Agora join failure is a CLIENT-SIDE issue (Agora native SDK), not a backend/database issue.

---

## PHASE 8: Summary Impact Matrix

| Component | Status | Impact | Severity |
|-----------|--------|--------|----------|
| **Call Button Click** | ✅ Works | Admin can initiate | - |
| **Backend Call Record Creation** | ✅ Works | Call stored in DB | - |
| **Client Incoming Call Detection** | ✅ Works | Client sees call | - |
| **Agora Admin Token Generation** | ⚠️ Partial | Token generated but validation unknown | **CRITICAL** |
| **Agora Admin Channel Join** | ❌ Fails | Admin cannot join voice channel | **CRITICAL** |
| **DeepSeek Question Generation** | ❌ Fails | Questions don't appear in UI | Medium |
| **Agora Client Token Storage** | ✅ Works | Client receives token | - |
| **Agora Client Channel Join** | ✅ Works (would if accepted) | Client can join after accepting | - |

---

## Recommended Diagnostic Next Steps

### For Admin Call Failure

**Step 1: Check Agora Token Validity**
- Verify backend's AGORA_APP_ID matches [console.agora.io](https://console.agora.io)
- Verify backend's AGORA_CERT is correct and hasn't changed
- Test token generation: `curl -X POST http://localhost:8000/api/agora/generate-token -H "Authorization: Bearer {token}" -d '{"channelName": "test", "uid": 1, "role": "publisher"}'`

**Step 2: Check Agora App ID in Frontend**
- Verify `EXPO_PUBLIC_AGORA_APP_ID` is sent to frontend (set in build environment or .env)
- Confirm backend sends appId in initiate_call response
- Check if appId is correctly parsed in agoraConfig

**Step 3: Check Native Module**
- Verify react-native-agora@^4.4.2 is installed in frontend
- Check Android device logs for Agora SDK errors
- Verify microphone permissions are granted on device

**Step 4: Enable Verbose Logging**
- useAgora hook already has extensive console.log statements
- Check device logs for "Invalid token", "Invalid App ID", "Invalid channel name" errors
- Look for error codes from onConnectionStateChanged handler

### For DeepSeek Question Failure

**Step 1: Set DEEPSEEK_API_KEY**
- Obtain API key from [deepseek.com](https://deepseek.com)
- Add to backend/.env:
  ```
  DEEPSEEK_API_KEY=your_key_here
  ```
- Restart backend

**Step 2: Test DeepSeek Endpoint**
```bash
curl -X POST http://localhost:8000/cultivator/explain/questions \
  -H "Authorization: Bearer {user_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "job_title": "Harvesting",
    "plantation_type": "Tea",
    "gate": "gate1",
    "num_questions": 5
  }'
```

---

## Code Locations Summary

| Component | File | Lines | Status |
|-----------|------|-------|--------|
| Call Button | admin/applications.tsx | 156-176 | ✅ OK |
| Admin Call Init | admin/call.tsx | 75-125 | ❌ Fails at joinChannel |
| Questions Fetch | admin/call.tsx | 194-217 | ❌ DeepSeek missing key |
| Agora Token Gen Backend | agora_service.py | 40-64 | ✅ OK |
| Token Config Backend | core/config.py | 83-110 | ✅ OK |
| Agora Join Hook | src/hooks/useAgora.ts | 287-327 | ❌ Returns false |
| Agora Init Engine | src/hooks/useAgora.ts | 115-150 | ✅ OK if appId provided |
| DeepSeek Service | deepseek_service.py | 257-301 | ❌ No API key |
| DeepSeek Endpoint | explain.py | 130-165 | ❌ No API key |
| Question API Method | cultivatorApi.ts | 723-735 | ✅ Call correct |
| Client Incoming | incoming-call.tsx | - | ✅ Works |
| Backend Call Init | calls.py | 105-220 | ✅ OK |
| Backend Incoming Check | calls.py | 223-258 | ✅ OK |

---

## Conclusion

### What's Working
✅ Admin can click Call button  
✅ Backend creates call record in "ringing" status  
✅ Client polls and finds incoming call  
✅ Client sees "Incoming Call / Interviewer / Re: Planting" screen  

### What's Failing
❌ Admin's Agora RTC channel join returns false (missing token validation or config)  
❌ Question generation fails due to missing DEEPSEEK_API_KEY  

### Why Client Wins, Admin Loses
The two flows are decoupled:
- **Client flow**: Database polling (independent of Agora)
- **Admin flow**: Agora RTC SDK native module (independent of database)

Admin's Agora failure doesn't affect database, so client still gets the call record.

### Next Action Required
**Highest Priority**: Debug why `useAgora.joinChannel()` returns false on admin side:
1. Check Agora token validity (expiration, signature)
2. Verify Agora App ID configuration on frontend
3. Review Android device logs for native module errors
4. Test microphone permissions

**Medium Priority**: Add DEEPSEEK_API_KEY to enable question generation

---

**End of Diagnostic Report**
