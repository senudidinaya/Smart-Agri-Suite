# Call Flow Runtime Test Procedures

**Document Version**: 1.0  
**Created**: 2025-01-XX  
**Purpose**: Device testing procedures for interview call flow with runtime diagnostics

---

## Overview

This document provides comprehensive test procedures for validating the interview call system on physical Android devices. These tests utilize the runtime diagnostic instrumentation added in Phase 8.

**Prerequisites**:
- Android device with Expo development build installed
- Metro bundler running on development machine
- Backend server running with AGORA_APP_ID and AGORA_CERT configured
- Both admin and client devices on same LAN (192.168.x.x)
- `AGORA_DEBUG = true` in frontend/src/config.ts

---

## Test Environment Setup

### 1. Backend Verification
```bash
# Check backend .env has required Agora credentials
cat backend/.env | grep AGORA

# Expected output:
# AGORA_APP_ID=<32-char hex string>
# AGORA_CERT=<32-char hex string>
```

### 2. Frontend Configuration
```bash
# Verify AGORA_DEBUG flag is enabled
grep "AGORA_DEBUG" frontend/src/config.ts

# Expected output:
# export const AGORA_DEBUG = true;
```

### 3. Device Connection
- Admin device: Connect to Metro bundler at http://<DEV_IP>:8081
- Client device: Connect to Metro bundler at same IP
- Both devices: Enable USB debugging, keep screen awake

---

## Test Case 1: Successful Admin Call Initiation

**Objective**: Verify admin can successfully initiate and join an Agora voice call

**Steps**:
1. Admin logs in to application
2. Navigate to Applications screen
3. Select a client application
4. Tap "Call Client" button
5. Observe logs in Metro bundler console

**Expected Runtime Logs**:
```
[AGORA-MODULE] Successfully loaded react-native-agora
[AGORA-MODULE] createAgoraRtcEngine available: true
[ADMIN-CALL] Setup started
[ADMIN-CALL] Agora config validation passed
[ADMIN-CALL] ===== TOKEN VALIDATION REPORT =====
[ADMIN-CALL] Token Source: refreshed
[ADMIN-CALL] Current token length: 206
[ADMIN-CALL] Channel Name: job_12345678_abcd1234
[ADMIN-CALL] UID: 1001
[ADMIN-CALL] App ID present: true
[ADMIN-CALL] ===== END TOKEN VALIDATION REPORT =====
[AGORA] ===== JOIN CHANNEL TIMELINE START =====
[AGORA] STEP 1: Validating configuration...
[AGORA] STEP 1 SUCCESS: All config fields validated
[AGORA] STEP 2: Requesting microphone permission...
[AGORA] STEP 2 SUCCESS: Microphone permission granted
[AGORA] STEP 3: Initializing Agora engine...
[AGORA] STEP 3 SUCCESS: Engine initialized and event handlers registered
[AGORA] STEP 4: Joining channel...
[AGORA] STEP 4 SUCCESS: engine.joinChannel() executed without throwing
[AGORA] STEP 5: Waiting for onJoinChannelSuccess callback...
[AGORA] Joined channel successfully: job_12345678_abcd1234
[ADMIN-CALL] Successfully joined Agora channel
```

**Success Criteria**:
- ✅ Native module loads without errors
- ✅ Config validation passes (all 5 fields present)
- ✅ Token refresh succeeds (or initial token used)
- ✅ All 5 STEPS succeed
- ✅ onJoinChannelSuccess callback fires
- ✅ Call status changes to "ringing"
- ✅ No error alerts shown

**Failure Investigation**:
- If STEP 1 fails: Check backend response contains all required fields
- If STEP 2 fails: Grant microphone permission in Android settings
- If STEP 3 fails: Check native module linkage and appId validity
- If STEP 4 fails: Check for exception in catch block
- If STEP 5 hangs: Check token validity, SDK error codes in onError

---

## Test Case 2: Config Validation Failure

**Objective**: Verify proper error handling when Agora config is incomplete

**Setup**:
1. Temporarily modify backend to return incomplete config (e.g., missing token)
2. Or inject null values in frontend before validation

**Steps**:
1. Admin taps "Call Client"
2. Observe validation logs

**Expected Runtime Logs**:
```
[ADMIN-CALL] Setup started
[ADMIN-CALL] CONFIG VALIDATION FAILED: Missing Agora authentication token
```

**Expected Behavior**:
- ✅ Alert shown: "Call Configuration Error: Missing Agora authentication token"
- ✅ No Agora SDK calls made
- ✅ Screen navigates back to applications list

**Success Criteria**:
- Specific error message identifies missing field
- App doesn't crash
- User understands what went wrong

---

## Test Case 3: Native Module Not Available

**Objective**: Verify error handling when react-native-agora fails to load

**Setup**:
1. Simulate module loading failure (or test on web platform)

**Expected Runtime Logs**:
```
[AGORA-MODULE] CRITICAL: Failed to load react-native-agora
[AGORA-MODULE] Error: <module error message>
[AGORA] CRITICAL: Native module not available
[AGORA] Module load error: <error message>
```

**Expected Behavior**:
- ✅ Clear error message: "Agora native module not found. Please reinstall the app."
- ✅ No attempt to call SDK functions
- ✅ App doesn't crash

**Success Criteria**:
- Module availability check prevents crash
- User gets actionable error message

---

## Test Case 4: Client Receives Incoming Call

**Objective**: Verify client can detect and receive admin's call via database polling

**Setup**:
1. Admin successfully initiates call (Test Case 1)
2. Client app is logged in and on dashboard

**Expected Client Logs**:
```
Incoming call found, navigating to incoming-call screen
[CLIENT] Call details: { callId: "...", jobTitle: "...", adminUsername: "..." }
```

**Steps**:
1. Client observes incoming call notification
2. Client taps "Accept" button
3. Client device joins Agora channel

**Expected Runtime Logs** (on client accept):
```
[CLIENT-CALL] Setup started
[CLIENT-CALL] Agora config validation passed
[CLIENT-CALL] ===== TOKEN VALIDATION REPORT =====
[CLIENT-CALL] Token Source: refreshed
[CLIENT-CALL] Channel Name: job_12345678_abcd1234
[CLIENT-CALL] UID: 2001
[AGORA] ===== JOIN CHANNEL TIMELINE START =====
[AGORA] STEP 1 SUCCESS: All config fields validated
[AGORA] STEP 2 SUCCESS: Microphone permission granted
[AGORA] STEP 3 SUCCESS: Engine initialized
[AGORA] STEP 4 SUCCESS: engine.joinChannel() executed
[AGORA] Joined channel successfully
```

**Success Criteria**:
- ✅ Client polls and finds "ringing" call
- ✅ Client can parse Agora config from call record
- ✅ Client joins same channel as admin
- ✅ Admin sees remote user in remoteUsers array
- ✅ Call status changes to "connected" on both sides

---

## Test Case 5: Audio Connection Established

**Objective**: Verify bidirectional audio works between admin and client

**Prerequisites**:
- Test Case 1 (admin join) passed
- Test Case 4 (client join) passed

**Steps**:
1. Admin speaks into microphone
2. Client listens for audio
3. Client speaks into microphone
4. Admin listens for audio

**Expected Behavior**:
- ✅ Both parties hear each other clearly
- ✅ No echo or feedback
- ✅ Mute button works (audio stops when muted)

**Success Criteria**:
- Audio latency < 500ms
- No dropped audio
- Mute/unmute functions correctly

---

## Test Case 6: Token Expiration / Network Recovery

**Objective**: Verify token refresh handles expiration gracefully

**Setup**:
1. Start call normally
2. Wait for token to approach expiration (3600s)
3. Or simulate network interruption

**Expected Runtime Logs** (on refresh):
```
[ADMIN-CALL] Token approaching expiration, refreshing...
[ADMIN-CALL] Token refresh successful, new token length: 206
[AGORA] Connection state changed: RECONNECTING
[AGORA] Connection state changed: CONNECTED
```

**Success Criteria**:
- ✅ Token refresh happens before expiration
- ✅ Call continues without interruption
- ✅ Network reconnection handled gracefully

---

## Test Case 7: Microphone Permission Denied

**Objective**: Verify error handling when user denies microphone permission

**Setup**:
1. Deny microphone permission in Android settings
2. Attempt to start call

**Expected Runtime Logs**:
```
[AGORA] STEP 2: Requesting microphone permission...
[AGORA] STEP 2 FAILED: Microphone access not granted
```

**Expected Behavior**:
- ✅ Alert shown: "Microphone permission denied. Please enable it in settings."
- ✅ Call doesn't proceed
- ✅ User redirected back to applications list

**Success Criteria**:
- Clear error message
- No crash
- Actionable guidance (go to settings)

---

## Test Case 8: SDK Error Codes

**Objective**: Verify Agora error codes are decoded to human-readable messages

**Setup**:
1. Simulate various Agora error conditions:
   - Invalid token (error code 110)
   - Invalid appId (error code 101)
   - Invalid channel name (error code 102)

**Expected Runtime Logs**:
```
[AGORA] onError called with code: 110
[AGORA] ERROR 110: Invalid or expired token
```

**Expected Behavior**:
- ✅ Specific error message shown to user
- ✅ Error logged with code and meaning
- ✅ Call terminates gracefully

**Success Criteria**:
- Error codes 110, 101, 102, 17, 18 are decoded
- User sees helpful message, not just error code

---

## Test Case 9: DeepSeek Question Generation (Non-Blocking)

**Objective**: Verify call continues even if DeepSeek questions fail to generate

**Setup**:
1. Backend .env has no DEEPSEEK_API_KEY
2. Start call normally

**Expected Runtime Logs**:
```
[ADMIN-CALL] Successfully joined Agora channel
[ADMIN-CALL] Fetching interview questions...
[ADMIN-CALL] Question generation failed: DEEPSEEK_API_KEY environment variable not set
[ADMIN-CALL] Call will continue without generated questions
```

**Expected Behavior**:
- ✅ Call proceeds normally (call status = "ringing" then "connected")
- ✅ Questions section shows soft error message
- ✅ No alert/modal blocks the call
- ✅ Admin can still conduct interview manually

**Success Criteria**:
- DeepSeek failure doesn't block call
- Error is logged but not fatal
- User can still use the call interface

---

## Test Case 10: End Call and Analysis

**Objective**: Verify call can be ended and analysis is triggered

**Prerequisites**:
- Call is connected (Test Case 5)

**Steps**:
1. Admin taps "End Call" button
2. Observe cleanup logs

**Expected Runtime Logs**:
```
[ADMIN-CALL] Ending call...
[AGORA] Leaving channel...
[AGORA] Left channel: job_12345678_abcd1234
[ADMIN-CALL] Waiting for server-side analysis...
```

**Expected Behavior**:
- ✅ Agora engine leaves channel
- ✅ Client receives disconnect notification
- ✅ Backend triggers ML analysis
- ✅ Analysis results displayed when ready

**Success Criteria**:
- Clean disconnect
- No crashes on cleanup
- Analysis eventually completes (separate from call flow)

---

## Diagnostic Log Analysis Guide

### Key Log Patterns to Look For

**1. Module Loading**
```
✅ GOOD: [AGORA-MODULE] Successfully loaded react-native-agora
❌ BAD:  [AGORA-MODULE] CRITICAL: Failed to load react-native-agora
```

**2. Config Validation**
```
✅ GOOD: [AGORA] STEP 1 SUCCESS: All config fields validated
❌ BAD:  [AGORA] STEP 1 FAILED: Missing token
```

**3. Token Source**
```
✅ GOOD: [ADMIN-CALL] Token Source: refreshed
⚠️  WARN: [ADMIN-CALL] Token Source: initiateCall (refresh failed)
```

**4. Join Timeline**
```
✅ GOOD: All STEP 1-5 show SUCCESS
❌ BAD:  Any STEP shows FAILED
⏳ HANG: STEP 5 logged but no onJoinChannelSuccess
```

**5. Connection State**
```
✅ GOOD: [AGORA] Joined channel successfully
❌ BAD:  [AGORA] onError called with code: 110
```

### Common Failure Patterns

| Symptom | Log Pattern | Root Cause | Solution |
|---------|-------------|------------|----------|
| Module not found | `[AGORA-MODULE] CRITICAL` | Native module not linked | Rebuild Expo dev build |
| Missing config | `STEP 1 FAILED: Missing X` | Backend response incomplete | Check backend token generation |
| Permission denied | `STEP 2 FAILED` | Microphone not granted | Enable in Android settings |
| Engine init failed | `STEP 3 FAILED` | Invalid appId or module issue | Verify AGORA_APP_ID in .env |
| Join threw exception | `STEP 4 FAILED` | SDK rejected call | Check error stack trace |
| Hang at STEP 5 | STEP 5 logged, no callback | Invalid token or network | Check onError for code 110 |
| Error code 110 | `ERROR 110: Invalid token` | Token expired/incorrect | Verify backend token generation |
| Error code 101 | `ERROR 101: Invalid App ID` | Wrong appId or not matching cert | Check AGORA_APP_ID matches certificate |

---

## Post-Test Actions

### 1. Collect Logs
```bash
# Save Metro bundler console output
# Filter for [AGORA] and [ADMIN-CALL] prefixes

# Example grep commands:
cat metro.log | grep "\[AGORA\]"
cat metro.log | grep "\[ADMIN-CALL\]"
cat metro.log | grep "STEP"
```

### 2. Disable Debug Mode (Production)
```typescript
// frontend/src/config.ts
export const AGORA_DEBUG = false; // Reduce log verbosity
```

### 3. Document Findings
- Record which test cases passed/failed
- Note any unexpected behavior
- Capture error codes and messages
- Take screenshots of error alerts

### 4. Generate Runtime Diagnostic Report
- Use collected logs to fill out CALL_FLOW_RUNTIME_DIAGNOSTIC.md
- Identify root cause if call fails
- Recommend fixes based on log patterns

---

## Troubleshooting Quick Reference

### Call Fails at STEP 1 (Config Validation)
- **Check**: Backend initiateCall response includes all 5 fields (appId, token, channelName, uid, permission)
- **Fix**: Ensure backend token generation endpoint is working
- **Verify**: `curl http://localhost:8000/api/agora/generate-token` with POST body

### Call Fails at STEP 2 (Permission)
- **Check**: Android microphone permission granted
- **Fix**: Settings > Apps > Smart Agri Suite > Permissions > Microphone > Allow
- **Verify**: Run `adb shell dumpsys package <package_name> | grep "android.permission.RECORD_AUDIO"`

### Call Fails at STEP 3 (Engine Init)
- **Check**: Native module loaded correctly
- **Fix**: Rebuild Expo dev build: `eas build --profile development --platform android`
- **Verify**: [AGORA-MODULE] log shows "Successfully loaded"

### Call Fails at STEP 4 (Join)
- **Check**: Exception stack trace in logs
- **Fix**: Depends on exception - usually SDK error code
- **Verify**: Look for `STEP 4 ERROR:` and `STEP 4 STACK:` in logs

### Call Hangs at STEP 5 (Waiting for Callback)
- **Check**: onError handler logs for error codes
- **Fix**: Usually token/appId mismatch - check backend .env
- **Verify**: Compare token from TOKEN VALIDATION REPORT with backend-generated token

### Client Doesn't Receive Call
- **Check**: Backend call record created with status "ringing"
- **Fix**: Check cultivator/calls/initiate endpoint response
- **Verify**: Query MongoDB: `db.calls.find({status: "ringing"})`

### Audio Doesn't Work
- **Check**: Both devices joined same channel (check channelName in logs)
- **Fix**: Ensure UID ranges are different (admin 1000+, client 2000+)
- **Verify**: [AGORA] remoteUsers array populates with remote UID

---

## Success Metrics

After completing all tests, the system should achieve:

- ✅ **Module Availability**: 100% (native module loads on all devices)
- ✅ **Config Validation**: 100% (all required fields present and valid)
- ✅ **Token Generation**: 100% (backend generates valid tokens)
- ✅ **Join Success Rate**: > 95% (admin and client join channel)
- ✅ **Audio Quality**: > 95% (clear bidirectional audio)
- ✅ **Error Handling**: 100% (all error cases show specific messages)
- ✅ **Non-Blocking DeepSeek**: 100% (call proceeds even if questions fail)

---

## Next Steps

1. Execute all 10 test cases on physical devices
2. Document results in testing log
3. If any test fails, use Troubleshooting Quick Reference
4. Generate CALL_FLOW_RUNTIME_DIAGNOSTIC.md based on findings
5. If all tests pass, proceed to production deployment with AGORA_DEBUG=false

---

**Document End**
