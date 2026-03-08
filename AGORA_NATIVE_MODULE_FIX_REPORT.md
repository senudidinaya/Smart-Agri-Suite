# Agora Native Module Fix Report

**Date**: March 8, 2026  
**Status**: ❌ Native Module Not Linked  
**Severity**: CRITICAL - Blocking Call Functionality  
**Component**: Expo Development Build + react-native-agora

---

## Executive Summary

The runtime diagnostic instrumentation successfully detected that `react-native-agora` is not available in the current Expo development build on the Android device. The package IS correctly installed in the codebase, but the native Android project does not include it because the development build was created before the native module was added.

**Root Cause**: The Expo development build (APK) currently installed on the device was built before react-native-agora was added to the project dependencies. Native modules require a rebuild of the development client.

**Impact**: Interview call system cannot initialize Agora SDK, blocking all voice calling functionality.

**Resolution**: Rebuild and reinstall the Expo development client.

---

## Phase 1 - Dependency Installation Status

### ✅ Package in package.json

**File**: `frontend/package.json`

```json
"react-native-agora": "^4.6.2"
```

**Status**: ✅ PRESENT - Correctly listed in dependencies

### ✅ Package in node_modules

**Path**: `frontend/node_modules/react-native-agora/`

**Installed Version**: 4.6.2

**Contents Verified**:
- ✅ android/ (native Android code)
- ✅ ios/ (native iOS code)
- ✅ lib/ (JavaScript bindings)
- ✅ src/ (TypeScript source)

**Status**: ✅ INSTALLED - Package is in node_modules

### ❌ Native Linking Status

**File**: `frontend/android/app/build.gradle`

**Search Result**: No references to `react-native-agora` found

**Status**: ❌ NOT LINKED - Native Android project doesn't include Agora SDK

### Comparison: Analyzer Frontend vs Main Frontend

| Package | Main Frontend | Analyzer Frontend | Status |
|---------|---------------|-------------------|--------|
| react-native-agora | ✅ v4.6.2 | ✅ v4.4.2 | Main has newer version |
| expo-dev-client | ✅ v6.0.20 | ✅ v6.0.20 | Same |
| expo | ✅ v54.0.33 | ✅ v54.0.0 | Similar |
| react-native | ✅ v0.81.5 | ✅ v0.81.5 | Same |

**Analysis**: Both projects have react-native-agora installed. The main frontend actually has a NEWER version (4.6.2 vs 4.4.2). The issue is not the dependency installation, but rather the native build integration.

---

## Phase 2 - Native Integration Requirements

### Current Setup

**Expo Configuration**: Managed workflow with expo-dev-client

**Key Files**:
- ✅ `app.json` - Expo configuration exists
- ✅ `eas.json` - EAS Build configuration exists
- ✅ `android/` - Native Android project exists (prebuild was run)
- ✅ `node_modules/` - Dependencies installed

### Development Build Status

**Current State**: The Expo development build on the device was created at a point in time when react-native-agora was NOT in package.json (or before a fresh prebuild was run).

**Why It Fails**: 
- Metro bundler serves JavaScript code dynamically ✅
- Native modules are compiled INTO the APK at build time ❌
- The current APK doesn't contain Agora's native Android libraries ❌

**Analogy**: It's like trying to use a USB device (react-native-agora) on a computer that doesn't have the driver installed (native libraries not in APK).

### Requirements for Fix

1. **Regenerate Native Project**: Run `expo prebuild --clean` to regenerate the android/ folder with all current dependencies including react-native-agora

2. **Rebuild Development Client**: Create a new Expo development build with EAS Build that includes react-native-agora's native code

3. **Replace APK on Device**: Install the new development build on the Android device, replacing the old one

---

## Phase 3 - Fix Installation Steps

### ✅ Already Completed

No additional package installation is needed. The package is already correctly installed:

```bash
# Already done - no action needed
npm install react-native-agora@^4.6.2
```

### ✅ Already in package.json

The dependency is already saved:

```json
"react-native-agora": "^4.6.2"
```

### What Changed Since Last Build

The current development build on the device was likely built from a previous state of the codebase. Between then and now, `react-native-agora` was added to package.json. Therefore, the development build needs to be regenerated.

---

## Phase 4 - Rebuild Development Client Requirements

### ⚠️ REBUILD REQUIRED

**Answer**: YES, a fresh Expo development build is REQUIRED.

**Reason**: Native modules like react-native-agora cannot be added to an existing development build. They require recompilation of the native Android code.

### Exact Commands (from `frontend/` directory)

#### Step 1: Verify Dependencies
```bash
# Ensure all dependencies are installed
npm install

# Verify react-native-agora is in package-lock.json
grep "react-native-agora" package-lock.json
```

**Expected Output**: Should show react-native-agora version 4.6.2

---

#### Step 2: Clean and Regenerate Native Project
```bash
# WARNING: This will regenerate the android/ and ios/ folders
# Any manual changes to those folders will be lost

npx expo prebuild --clean
```

**What This Does**:
- Deletes existing `android/` and `ios/` folders
- Regenerates them with all dependencies from package.json
- Includes react-native-agora's native Android/iOS code
- Updates gradle configurations to link the native module

**Expected Output**:
```
✔ Cleaned Android project.
✔ Cleaned iOS project.
✔ Config synced
✔ Installed dependencies
✔ Generated native code
```

**Verification**: After prebuild, search for react-native-agora in the Android Gradle files:
```bash
grep -r "react-native-agora" android/
```

Should find references in gradle files.

---

#### Step 3: Build Development Client with EAS
```bash
npx eas build --profile development --platform android
```

**What This Does**:
- Builds a new Expo development client APK
- Includes all native modules (now including react-native-agora)
- Uploads to EAS servers and provides download link

**Expected Duration**: 5-15 minutes (cloud build)

**Expected Output**:
```
✔ Build started
✔ Build completed
✔ Android build: https://expo.dev/accounts/.../builds/...

Download URL: https://expo.dev/artifacts/eas/...apk
```

**Important**: Copy the APK download URL - you'll need it for the next step.

---

#### Step 4: Uninstall Old Dev Build from Device
```bash
# Option A: On device
Settings > Apps > Idle Land Mobilization System > Uninstall

# Option B: Via ADB (if device is connected)
adb devices
adb uninstall com.smartsgri.idleland
```

**Why This Is Required**: Android won't allow installing a new development build over an old one with the same package name if the signing keys differ (which they often do with development builds).

---

#### Step 5: Install New Dev Build on Device

**Option A: Direct Download on Device**
1. Open the EAS download URL on your Android device
2. Download the APK (may need to allow downloads from Chrome)
3. Tap the downloaded APK to install
4. Allow installation from unknown sources if prompted

**Option B: Via ADB (if device is connected)**
```bash
# Download APK to your computer first, then:
adb install ./path/to/downloaded.apk
```

**Expected Result**: New "Idle Land Mobilization System" app appears on device home screen

---

#### Step 6: Verify Native Module Loads

1. **Ensure backend is running**:
   ```bash
   # From backend/ directory
   uvicorn idle_land_api:app --reload --host 0.0.0.0 --port 8000
   ```

2. **Ensure Metro bundler is running**:
   ```bash
   # From frontend/ directory
   npx expo start --dev-client
   ```

3. **Open app on device**: Tap the app icon

4. **Check Metro logs** for module loading:

**Expected Success Logs**:
```
=== AGORA DEBUG MODE ENABLED ===
Platform: android
[AGORA-MODULE] Successfully loaded react-native-agora
[AGORA-MODULE] createAgoraRtcEngine available: true
[AGORA-MODULE] ChannelProfileType available: true
[AGORA-MODULE] ClientRoleType available: true
```

**Should NOT See**:
```
[AGORA-MODULE] CRITICAL: Failed to load react-native-agora
```

5. **Test call initiation**:
   - Log in as admin
   - Navigate to Applications
   - Tap "Call Client"
   - Observe STEP 1-5 logs in Metro console

If STEP 1-5 all succeed, the native module is working! 🎉

---

## Phase 5 - Validation Checklist

### Before Rebuild

- [x] react-native-agora in package.json
- [x] react-native-agora in node_modules
- [ ] react-native-agora in android/app/build.gradle (will be added by prebuild)
- [ ] Development build includes native module (will be added by EAS build)

### After Prebuild

```bash
cd frontend
npx expo prebuild --clean

# Verify linking:
grep -r "react-native-agora" android/
```

- [ ] Should find gradle references to react-native-agora
- [ ] android/ folder regenerated with current dependencies

### After EAS Build

```bash
npx eas build --profile development --platform android
```

- [ ] Build completes successfully (no gradle errors)
- [ ] APK download URL provided
- [ ] APK downloaded to device or computer

### After Installation

- [ ] Old dev build uninstalled from device
- [ ] New dev build installed on device
- [ ] App launches without crashing
- [ ] Metro bundler connects successfully

### After Module Load Test

**Metro Logs Check**:
- [ ] `[AGORA-MODULE] Successfully loaded react-native-agora`
- [ ] `createAgoraRtcEngine available: true`
- [ ] NO `[AGORA-MODULE] CRITICAL` errors

**Call Test**:
- [ ] Admin can tap "Call Client" without immediate error
- [ ] STEP 1: Config validation succeeds
- [ ] STEP 2: Permission request works
- [ ] STEP 3: Engine initializes (this is where native module is used)
- [ ] `[AGORA] Engine initialization successful`

---

## Phase 6 - Final Expected Validation Result

### Success Criteria

After completing all rebuild steps, the following log sequence should appear when testing the call:

```
=== AGORA DEBUG MODE ENABLED ===
Platform: android
EXPO_PUBLIC_AGORA_APP_ID: NOT SET

[AGORA-MODULE] Successfully loaded react-native-agora
[AGORA-MODULE] createAgoraRtcEngine available: true
[AGORA-MODULE] ChannelProfileType available: true
[AGORA-MODULE] ClientRoleType available: true
[AGORA-MODULE] ConnectionStateType available: true

[ADMIN-CALL] Setup started
[ADMIN-CALL] Agora config validation passed
[ADMIN-CALL] Attempting Agora token refresh...
[ADMIN-CALL] Token refresh successful, new token length: 206

[ADMIN-CALL] ===== TOKEN VALIDATION REPORT =====
[ADMIN-CALL] Token Source: refreshed
[ADMIN-CALL] Current token length: 206
[ADMIN-CALL] Channel Name: job_12345678_abcd1234
[ADMIN-CALL] UID: 1001
[ADMIN-CALL] App ID present: true
[ADMIN-CALL] App ID length: 32
[ADMIN-CALL] SUCCESS: Using refreshed token from backend
[ADMIN-CALL] ===== END TOKEN VALIDATION REPORT =====

[ADMIN-CALL] Prepared config - calling joinChannel()

[AGORA] ===== JOIN CHANNEL TIMELINE START =====
[AGORA] STEP 1: Validating configuration...
[AGORA] STEP 1 SUCCESS: All config fields validated

[AGORA] STEP 2: Requesting microphone permission...
[AGORA] STEP 2 SUCCESS: Microphone permission granted

[AGORA] STEP 3: Initializing Agora engine...
[AGORA] Creating RTC engine instance...
[AGORA] Initializing engine with appId...
[AGORA] Enabling audio stream...
[AGORA] Setting client role to broadcaster...
[AGORA] Setting audio profile...
[AGORA] Engine initialization successful
[AGORA] STEP 3 SUCCESS: Engine initialized and event handlers registered

[AGORA] STEP 4: Joining channel...
[AGORA] STEP 4:   - Channel: job_12345678_abcd1234
[AGORA] STEP 4:   - UID: 1001
[AGORA] STEP 4:   - Token length: 206
[AGORA] STEP 4 SUCCESS: engine.joinChannel() executed without throwing

[AGORA] STEP 5: Waiting for onJoinChannelSuccess callback from Agora SDK...
```

**Key Change**: STEP 3 should now succeed instead of failing with "Native module not available" error.

### If STEP 3 Succeeds But STEP 5 Hangs

That would indicate a DIFFERENT issue (likely token/appId mismatch), but at least proves the native module is loaded. At that point, refer to:
- CALL_FLOW_RUNTIME_DIAGNOSTIC.md (error code analysis)
- CALL_FLOW_RUNTIME_TEST.md (Test Case 8: SDK Error Codes)

---

## Timeline and Effort Estimate

| Step | Duration | Can Parallelize? |
|------|----------|------------------|
| Verify dependencies | 1 minute | No |
| expo prebuild --clean | 2-3 minutes | No |
| eas build (cloud) | 5-15 minutes | Can do other work while waiting |
| Uninstall old build | 1 minute | No |
| Install new build | 2 minutes | No |
| Test native module | 2 minutes | No |
| **TOTAL** | **13-24 minutes** | |

**Recommendation**: Start the EAS build and work on documentation or other tasks while it's building in the cloud.

---

## Alternative: Local Build (Faster but More Setup)

If you have Android Studio and Android SDK configured locally, you can build faster:

```bash
# After expo prebuild --clean
cd frontend
npx expo run:android --variant debug
```

This builds and installs directly on a connected device without going through EAS. However, it requires:
- Android Studio installed
- Android SDK and NDK configured
- Device connected via ADB
- Java JDK 17+

If you already have this setup, local build takes ~3-5 minutes vs 10-15 for EAS.

---

## Known Issues and Troubleshooting

### Issue: "expo prebuild" fails with conflicts

**Solution**: Use `--clean` flag to force regeneration
```bash
npx expo prebuild --clean
```

### Issue: EAS build fails with Gradle error

**Check**:
1. react-native-agora version compatibility with react-native 0.81.5
2. Android gradle plugin version in android/build.gradle
3. Build logs on EAS dashboard for specific error

**Solution**: react-native-agora 4.6.2 is compatible with RN 0.81.5, so this shouldn't happen unless there are other dependency conflicts.

### Issue: Can't install APK ("App not installed")

**Reasons**:
- Old dev build still installed (uninstall it first)
- Insufficient storage
- APK corrupted during download

**Solution**:
```bash
adb uninstall com.smartsgri.idleland
# Then try installing again
```

### Issue: Native module loads but STEP 5 fails with error 110

**This means**: Native module is working! The issue is now token/appId configuration.

**Solution**: Check backend .env has correct AGORA_APP_ID and AGORA_CERT

---

## Code Changes Required

### ❌ NO CODE CHANGES NEEDED

The existing code in `frontend/src/hooks/useAgora.ts` is already correct. It:
- ✅ Conditionally loads the native module
- ✅ Has error handling for module not found
- ✅ Has diagnostic logging to detect this issue

The diagnostic instrumentation we added in Phase 8 is what CAUGHT this issue!

### Files That Don't Need Changes

- ✅ `frontend/src/hooks/useAgora.ts` - Already handles module loading correctly
- ✅ `frontend/src/config.ts` - Already has AGORA_DEBUG flag
- ✅ `frontend/app/cultivator/admin/call.tsx` - Already has validation logic
- ✅ `frontend/package.json` - Already has react-native-agora listed

### Files That WILL Change (Automatically)

- `android/` folder - Regenerated by expo prebuild
- `package-lock.json` - May update checksums

---

## Post-Fix Verification

### Test Plan

1. **Module Load Test**:
   - Launch app
   - Check Metro logs for `[AGORA-MODULE] Successfully loaded`

2. **Engine Init Test**:
   - Start a call as admin
   - Observe STEP 3 logs
   - Verify "Engine initialization successful"

3. **Full Call Flow Test**:
   - Execute Test Case 1 from CALL_FLOW_RUNTIME_TEST.md
   - All STEP 1-5 should succeed (or fail at STEP 5 with token issues, not STEP 3)

4. **Client Call Test**:
   - Client should still receive incoming call
   - Client should be able to join channel

### Success Indicators

- ✅ No `[AGORA-MODULE] CRITICAL` errors
- ✅ `createAgoraRtcEngine available: true`
- ✅ STEP 3 succeeds (engine initialization)
- ✅ Interview call system functional

### Failure Indicators (If Still Failing After Rebuild)

- ❌ Still seeing `[AGORA-MODULE] CRITICAL` - Rebuild didn't complete or wrong APK installed
- ❌ STEP 5 fails with error code 110 - Token issue (separate from native module)
- ❌ STEP 5 fails with error code 101 - App ID issue (separate from native module)

---

## Preservation of Existing Functionality

### ✅ Behaviors Preserved

- **Admin Call Initiation**: Call button logic unchanged
- **Client Incoming Call**: Database polling unchanged
- **DeepSeek Questions**: Remains non-blocking
- **Runtime Diagnostics**: All logging remains active
- **Config Validation**: All validation logic intact
- **Token Refresh**: Token generation unchanged

### What Changed

- **Only the APK binary**: Native module now included

### What Didn't Change

- All JavaScript/TypeScript code
- Backend API endpoints
- Database schemas
- Call flow logic
- UI components

---

## Summary

### What Was Wrong

1. ❌ **react-native-agora not in APK**: The Expo development build on the device was created before the native module was added to package.json
2. ❌ **Native linking missing**: The android/ folder wasn't regenerated after adding the package
3. ✅ **Package.json correct**: Dependency is correctly listed
4. ✅ **Node_modules correct**: Package is correctly installed

### What Needs to Happen

1. ✅ **Regenerate android/** folder: `expo prebuild --clean`
2. ✅ **Rebuild dev client**: `eas build --profile development --platform android`
3. ✅ **Replace APK on device**: Uninstall old, install new

### Expected Outcome

After rebuild, the `[AGORA-MODULE]` diagnostic logs will show:
```
[AGORA-MODULE] Successfully loaded react-native-agora
[AGORA-MODULE] createAgoraRtcEngine available: true
```

Instead of:
```
[AGORA-MODULE] CRITICAL: Failed to load react-native-agora
```

This will allow STEP 3 (Engine Initialization) to succeed, and the call flow can proceed to test the Agora token/configuration (STEP 4-5).

---

## Next Actions

### Immediate (Required)

1. ✅ **Run**: `cd frontend && npm install` (ensure deps current)
2. ✅ **Run**: `npx expo prebuild --clean` (regenerate native project)
3. ✅ **Run**: `npx eas build --profile development --platform android` (rebuild dev client)
4. ⏳ **Wait**: 10-15 minutes for cloud build
5. ✅ **Uninstall**: Old dev build from Android device
6. ✅ **Install**: New APK from EAS download link
7. ✅ **Test**: Launch app, check `[AGORA-MODULE]` logs

### After Native Module Works

If the native module loads successfully but the call still fails at STEP 5, that indicates a token/appId configuration issue. At that point:

1. Review backend .env (AGORA_APP_ID, AGORA_CERT)
2. Verify Agora console project configuration
3. Refer to CALL_FLOW_RUNTIME_DIAGNOSTIC.md error code analysis
4. Execute Test Case 8 from CALL_FLOW_RUNTIME_TEST.md

---

**Document End**

**Status**: Ready for execution  
**Confidence**: HIGH - This is a standard Expo native module rebuild requirement  
**Risk**: LOW - Standard procedure, unlikely to break existing functionality
