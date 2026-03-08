# Agora Console Web Tester Procedure

## Overview

This procedure tests whether Agora infrastructure accepts the generated token directly using the official Agora Web RTC demo application. This isolates whether the token rejection happens at Agora's project authentication layer.

---

## Step 1: Generate Test Token

Run the diagnostic token generation script:

```bash
# From backend directory
cd backend
python scripts/agora_direct_join_test.py
```

**Expected Output:**
```
======================================================================
AGORA DIRECT JOIN TEST - TOKEN GENERATION
======================================================================

[CREDENTIALS LOADED]
AppID Length:          32 chars
AppID (first 16):      2a20dec2efc6497e...

[DIAGNOSTIC TEST PARAMETERS]
Channel:               diagnostic_direct_join
UID:                   1001

[TOKEN GENERATED]
Token Length:          139 chars
Token Prefix:          0062a20dec2efc6497e...
Token Suffix:          ...rH7k9pJ51bv4PmVI

[TOKEN FORMAT]
Token Format:          Valid (starts with 006)
Token Expiration:      3600 seconds

======================================================================
COPY-PASTE CREDENTIALS FOR AGORA WEB TESTER
======================================================================

AppID:
2a20dec2efc6497ea1e870847e15375f

Channel:
diagnostic_direct_join

UID:
1001

Token:
0062a20dec2efc6497ea1e870847e15375fIADZ2J635cj5KtqMR6u24pMNKT2rfuQfK+n0Or81nRm/k9pJ51bv4PmVIgAqvaQQAAQAAx61pAgAAx61pAwAAx61pBAAAx61p

======================================================================
NEXT STEP: Visit https://webdemo.agora.io/basicVideoCall/index.html
           Enter the above credentials and click 'Join'
======================================================================
```

---

## Step 2: Open Agora Web RTC Tester

1. Open your web browser (Chrome, Firefox, Edge, Safari)
2. Navigate to: **https://webdemo.agora.io/basicVideoCall/index.html**
3. You should see the Agora Web Demo application with input fields

---

## Step 3: Enter Credentials

In the web application, locate the following input fields and enter the values from Step 1:

| Field | Value | Source |
|-------|-------|--------|
| **App ID** | `2a20dec2efc6497ea1e870847e15375f` | Script output: "AppID" section |
| **Channel Name** | `diagnostic_direct_join` | Script output: "Channel" section |
| **User ID** | `1001` | Script output: "UID" section |
| **Token** | `0062a20dec2efc6497ea...` (full token) | Script output: "Token" section |

**Important:** 
- Copy the FULL token (139 characters)
- Include the "006" prefix
- Do NOT modify or truncate the token

---

## Step 4: Join the Channel

1. Click the **"Join"** or **"Join Channel"** button in the web application
2. The application will attempt to connect to Agora using your credentials
3. Wait 5-10 seconds for the connection attempt

---

## Expected Results Interpretation

### ✅ SUCCESS: Join Succeeds (Camera/Audio Stream Visible)

**Interpretation:**
- Agora infrastructure **accepts the token correctly**
- Token signature validation passed
- AppID and Certificate in Agora Console are correct
- Application credentials are properly configured

**Next Action:**
→ Investigation shifts to **frontend environment**
→ Check: Environment variable configuration, token transmission, React Native runtime

---

### ❌ FAILURE: Join Fails with INVALID_TOKEN Error

**Interpretation:**
- Agora infrastructure **rejects the token**
- Token signature validation failed
- **Project credential mismatch confirmed**: AppID and/or Certificate in Agora Console do not match backend configuration

**Recovery Actions:**
1. Open Agora Console: https://console.agora.io/
2. Navigate to your Project
3. **Verify AppID**: Should match `2a20dec2efc6497ea1e870847e15375f`
4. **Verify Certificate**: Should match value in `backend/.env` (AGORA_CERT)
5. If mismatch found:
   - Regenerate certificate in Agora Console
   - Update `backend/.env` with new certificate
   - Restart backend
   - Regenerate test token with new certificate
   - Retest in web application

---

### ❌ FAILURE: Join Fails with Different Error (e.g., APP_ID_ERROR, CONNECTION_FAILED)

**Error Code Reference:**

| Error | Code | Cause |
|-------|------|-------|
| **APP_ID_ERROR** | 2, 101 | AppID format incorrect or not recognized by Agora |
| **TOKEN_ERROR** | 110 | Token format/expiration error (not signature) |
| **CONNECTION_FAILED** | 104 | Network connectivity or Agora service issue |
| **INVALID_TOKEN** | 8 | Token signature rejected (cert mismatch) |

**Next Action:**
→ See interpretation rules below for specific error code

---

## Troubleshooting

### Issue: "Cannot read config from script output"

**Solution:**
- Ensure Python environment is activated: `. .venv/Scripts/Activate.ps1` (Windows) or `source .venv/bin/activate` (Unix)
- Ensure script can import cultivator modules: `$env:PYTHONPATH='.'` (Windows) or `export PYTHONPATH='.'` (Unix)
- Run script again: `python scripts/agora_direct_join_test.py`

### Issue: "Token starts with something other than 006"

**Solution:**
- Token generation failed or used wrong credentials
- Check backend `.env` file has `AGORA_APP_ID` and `AGORA_CERT` set
- Check no special characters or whitespace in credentials
- Run credential verification script: `python scripts/agora_verify_credentials.py`

### Issue: Web Tester Shows "No Camera/Microphone Permission"

**Solution:**
- This is normal - you need to allow camera/microphone access in browser
- Browser will prompt for permission - click "Allow"
- Alternately, the tester will proceed without video/audio in headless mode

### Issue: "Cannot connect to Agora servers"

**Solution:**
- Check internet connection
- Try different browser or incognito/private window
- Try from different network (if corporate firewall blocking)
- Check Agora service status: https://status.agora.io/

---

## Document References

- **Full Diagnosis Report**: See `AGORA_FINAL_DIAGNOSIS.md`
- **Credential Recovery Guide**: See `AGORA_CREDENTIAL_RECOVERY.md`
- **SDK Configuration Audit**: See `AGORA_SDK_CONFIGURATION_AUDIT.md`
