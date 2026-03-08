# Agora Credential Recovery

## Purpose
Use this guide when Agora returns `CONNECTION_CHANGED_INVALID_TOKEN (reason 8)` even though backend and frontend parameters match.

## Project Context
Target App ID:
`2a20dec2efc6497ea1e870847e15375f`

## 1. Open Agora Console
1. Go to `https://console.agora.io/`.
2. Sign in with the account that owns the project.

## 2. Navigate to the Correct Project
1. Open the project that contains App ID:
`2a20dec2efc6497ea1e870847e15375f`
2. Confirm this App ID exactly matches backend runtime output.

## 3. Verify Project Authentication and Certificate
1. Confirm token authentication mode is enabled for this project.
2. Confirm an App Certificate exists.
3. Compare the App Certificate against backend environment value (`AGORA_CERT`).

## 4. If Mismatch Is Suspected
1. Regenerate the App Certificate in Agora Console.
2. Store the new value securely.

## 5. Update Backend Environment
Edit `backend/.env`:

```env
AGORA_APP_ID=...
AGORA_CERT=...
```

Notes:
- Use the App ID and App Certificate from the same Agora project.
- Avoid mixing credentials from different projects/environments.

## 6. Restart Backend Server
Restart backend so updated environment values are loaded.

## 7. Post-Fix Verification

### 7.1 Run credential verification script
From workspace root:

```powershell
Set-Location backend
C:/projects/Smart-Agri-Suite/.venv/Scripts/python.exe scripts/agora_verify_credentials.py
```

Expected checks:
- AppID length: `32`
- Certificate length: `32`
- Token prefix starts with `006...`
- Token length is non-empty

### 7.2 Run end-to-end call test
1. Start backend.
2. Start frontend (`npx expo start --dev-client`).
3. Trigger admin -> client call.
4. Capture logs:
   - `[AGORA-TOKEN-DEBUG]`
   - `[AGORA-CALL-INIT]`
   - `[AGORA-JOIN]`
5. Verify:
   - AppID, channel, UID match across backend and frontend.
   - Agora no longer returns `INVALID_TOKEN` reason `8`.

## 8. Optional Runtime Check Snippet
If needed, print currently loaded runtime credentials using backend settings loader:

```python
from cultivator.core.config import get_settings
s = get_settings()
print(s.agora_app_id, len(s.agora_app_id or ""))
print(len(s.agora_app_certificate or ""))
```
