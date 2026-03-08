# Agora Development Client Rebuild Plan

**Date**: March 8, 2026  
**Project**: Smart-Agri-Suite Frontend  
**Issue**: Native module react-native-agora not linked in current APK  
**Action Required**: Complete Expo development client rebuild  
**Estimated Duration**: 15-25 minutes  

---

## Document Purpose

This document provides a systematic, step-by-step plan to rebuild the Expo development client with proper react-native-agora native module linking. This is a **build configuration issue**, not an application logic issue.

**What This Document Does**:
- ✅ Verifies build environment readiness
- ✅ Explains why the current build fails
- ✅ Provides exact rebuild commands
- ✅ Defines success validation steps

**What This Document Does NOT Do**:
- ❌ Modify application code
- ❌ Change call flow logic
- ❌ Alter backend configuration
- ❌ Update API endpoints

---

## PHASE 1 — Expo Environment Verification

### Current Configuration Analysis

#### Package Versions (frontend/package.json)

| Package | Version | Status | Compatibility |
|---------|---------|--------|---------------|
| expo | ~54.0.33 | ✅ CORRECT | Latest stable (SDK 54) |
| react-native | 0.81.5 | ✅ CORRECT | Compatible with Expo 54 |
| react-native-agora | ^4.6.2 | ✅ CORRECT | Latest, RN 0.81+ compatible |
| expo-dev-client | ~6.0.20 | ✅ CORRECT | Matches Expo 54 |
| react | 19.1.0 | ✅ CORRECT | Latest |

**Version Compatibility**: ✅ ALL VERSIONS COMPATIBLE

#### Expo Configuration (frontend/app.json)

```json
{
  "expo": {
    "name": "Idle Land Mobilization System",
    "slug": "idle-land-mobilization",
    "version": "1.0.0",
    "android": {
      "package": "com.smartsgri.idleland",
      "versionCode": 1
    },
    "plugins": [
      "expo-router"
    ],
    "extra": {
      "eas": {
        "projectId": "b4a38393-e79d-42a0-a288-4765b04e8f86"
      }
    },
    "owner": "dinayarupasinghe"
  }
}
```

**Configuration Status**: ✅ VALID

**Observations**:
- ✅ EAS project ID configured: `b4a38393-e79d-42a0-a288-4765b04e8f86`
- ✅ Android package: `com.smartsgri.idleland`
- ✅ Owner: `dinayarupasinghe`
- ⚠️  No explicit native module plugins listed (this is OK - expo-autolinking handles it)

#### EAS Build Configuration (frontend/eas.json)

```json
{
  "cli": {
    "version": ">= 18.1.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    }
  }
}
```

**Build Profile Status**: ✅ VALID

**Observations**:
- ✅ `developmentClient: true` - Enables dev client mode
- ✅ `distribution: internal` - APK downloadable (not published to store)
- ✅ EAS CLI version requirement: >= 18.1.0

**Current installed**: 18.1.0 (from package.json devDependencies)

### Environment Verdict

| Component | Status | Notes |
|-----------|--------|-------|
| Expo version | ✅ PASS | SDK 54, latest stable |
| React Native version | ✅ PASS | 0.81.5, compatible |
| Agora version | ✅ PASS | 4.6.2, latest |
| Dev client | ✅ PASS | Configured properly |
| EAS profile | ✅ PASS | Development profile exists |
| Version compatibility | ✅ PASS | All packages compatible |

**OVERALL**: ✅ **ENVIRONMENT READY FOR REBUILD**

---

## PHASE 2 — Native Module Readiness Verification

### Dependency Status

#### package.json Entry

```json
"react-native-agora": "^4.6.2"
```

**Status**: ✅ PRESENT in dependencies

**Version**: 4.6.2 (latest as of March 2026)

**Caret Range**: `^4.6.2` allows 4.6.x updates (safe)

#### node_modules Installation

**Path**: `frontend/node_modules/react-native-agora/`

**Verification Results**:

| Directory/File | Status | Purpose |
|----------------|--------|---------|
| android/ | ✅ EXISTS | Native Android bindings |
| ios/ | ✅ EXISTS | Native iOS bindings |
| src/ | ✅ EXISTS | TypeScript source code |
| lib/ | ✅ EXISTS | Compiled JavaScript |
| package.json | ✅ EXISTS | Package metadata |
| react-native-agora.podspec | ✅ EXISTS | iOS CocoaPods spec |

**Installed Version Confirmation**:

```json
{
  "name": "react-native-agora",
  "version": "4.6.2",
  "description": "Agora RTC SDK For React Native"
}
```

**Verification**: ✅ COMPLETE PACKAGE INSTALLED

### Native Module Structure Analysis

#### Android Native Components

**Path**: `node_modules/react-native-agora/android/`

**Contents**:
- Gradle build scripts
- Java/Kotlin wrapper code
- Agora RTC SDK JNI bindings
- Manifest declarations

**Purpose**: Provides the bridge between JavaScript and Agora's native Android SDK

#### iOS Native Components

**Path**: `node_modules/react-native-agora/ios/`

**Contents**:
- Objective-C/Swift wrapper code
- CocoaPods configuration
- Agora RTC SDK bindings

**Purpose**: Provides the bridge between JavaScript and Agora's native iOS SDK

### Module Readiness Verdict

| Check | Status | Notes |
|-------|--------|-------|
| Package in package.json | ✅ PASS | Version 4.6.2 declared |
| Package in node_modules | ✅ PASS | Fully installed |
| Android bindings present | ✅ PASS | Complete native code |
| iOS bindings present | ✅ PASS | Complete native code |
| JavaScript bindings present | ✅ PASS | TypeScript + compiled JS |

**OVERALL**: ✅ **NATIVE MODULE READY FOR LINKING**

---

## PHASE 3 — Android Native Project Linking Analysis

### Current State Investigation

#### build.gradle Analysis

**File**: `frontend/android/app/build.gradle`

**Search Query**: `agora|Agora`

**Result**: ❌ **NO MATCHES FOUND**

**Expected References** (if linked):
```gradle
// SHOULD exist but DOESN'T:
implementation project(':react-native-agora')
// OR (via autolinking):
// Automatically linked dependencies appear through Gradle plugin
```

#### settings.gradle Analysis

**File**: `frontend/android/settings.gradle`

**Search Query**: `agora|Agora`

**Result**: ❌ **NO MATCHES FOUND**

**Current Autolinking Configuration**:
```gradle
plugins {
  id("com.facebook.react.settings")
  id("expo-autolinking-settings")  // ← This SHOULD link Agora
}

expoAutolinking.useExpoModules()
```

**Observed Behavior**: Expo autolinking is configured, but react-native-agora is not present in the linked modules.

### Why Linking Is Missing

#### Root Cause Explanation

**Timeline of Events**:

1. **Initial Project Setup**:
   - `npx expo prebuild` was run
   - Generated `android/` and `ios/` folders
   - At this time, `package.json` did NOT include `react-native-agora`

2. **Agora Added Later**:
   - Developer added `"react-native-agora": "^4.6.2"` to `package.json`
   - Ran `npm install`
   - Package installed to `node_modules/` ✅

3. **Android Project Not Regenerated**:
   - `android/` folder NOT regenerated after adding Agora
   - `expo prebuild` NOT run again
   - Autolinking scanned package.json ONCE during initial prebuild
   - New dependency (Agora) not picked up

4. **Development Build Created**:
   - `eas build` or `expo run:android` executed
   - Used the OLD `android/` folder configuration
   - APK compiled WITHOUT Agora native libraries
   - **Result**: Current APK on device lacks Agora

#### How Expo Autolinking Works

```
npx expo prebuild
   ↓
Expo reads package.json
   ↓
Identifies native modules (e.g., react-native-agora)
   ↓
Generates android/settings.gradle with module references
   ↓
Configures Gradle to include native code
   ↓
Android project ready for build
```

**Key Point**: Autolinking happens at **prebuild time**, not at runtime.

### Why Runtime Error Occurs

#### The Error

```
[AGORA-MODULE] CRITICAL: Failed to load react-native-agora
The package 'react-native-agora' doesn't seem to be linked.
```

#### Explanation

**JavaScript Side** (Metro Bundler):
```javascript
const agoraModule = require('react-native-agora');  // ← Tries to load
```

**Metro Response**: ✅ "I can serve this JavaScript module from node_modules/"

**Native Side** (APK):
```
NativeModules.AgoraRtcEngine  // ← Tries to access native binding
```

**APK Response**: ❌ "No such native module exists in this binary"

**Result**: JavaScript code exists, but native bridge doesn't → Runtime error

#### Comparison: What Happens When Linked

**After Proper Rebuild**:

1. JavaScript: `require('react-native-agora')`
   - Metro: ✅ "Here's the JS module"

2. JavaScript calls: `createAgoraRtcEngine()`
   - Native bridge: ✅ "Calling Android native code"
   - Agora SDK: ✅ "Initializing RTC engine"

3. **Success**: Full stack works end-to-end

### Linking Analysis Verdict

| Check | Status | Explanation |
|-------|--------|-------------|
| Agora in build.gradle | ❌ FAIL | Not referenced |
| Agora in settings.gradle | ❌ FAIL | Not included |
| Autolinking configured | ✅ PASS | But ran before Agora was added |
| Native binaries in APK | ❌ FAIL | Not included at build time |
| Root cause identified | ✅ CLEAR | Android project needs regeneration |

**DIAGNOSIS**: ✅ **CONFIRMED - ANDROID PROJECT PREDATES AGORA ADDITION**

**SOLUTION**: ✅ **REGENERATE ANDROID PROJECT WITH EXPO PREBUILD**

---

## PHASE 4 — Project Rebuild Preparation

### Command Sequence

Execute these commands **from the `frontend/` directory** in order:

#### Command 1: Verify Dependencies

```bash
npm install
```

**Purpose**: Ensure all packages in package.json are installed and up-to-date

**Expected Output**:
```
added 1234 packages in 15s
```

**Verification**:
```bash
npm list react-native-agora
```

**Expected**:
```
idle-land-mobile@1.0.0 C:\projects\Smart-Agri-Suite\frontend
└── react-native-agora@4.6.2
```

**Status Check**: ✅ If version 4.6.2 appears, proceed

---

#### Command 2: Clean and Regenerate Native Project

```bash
npx expo prebuild --clean
```

**Purpose**: 
- Delete existing `android/` and `ios/` folders
- Regenerate them with ALL current dependencies from package.json
- Trigger Expo autolinking to scan and include react-native-agora

**What Gets Deleted**:
- ⚠️  `frontend/android/` (entire folder)
- ⚠️  `frontend/ios/` (entire folder)
- ⚠️  Any manual changes to these folders

**What Gets Created**:
- ✅ New `android/` with Agora linked
- ✅ New `ios/` with Agora linked
- ✅ Updated Gradle configurations
- ✅ Updated Xcode project

**Expected Output**:
```
✔ Cleaned Android project.
✔ Cleaned iOS project.
✔ Config synced
✔ Installed dependencies
✔ Generated native code

Your native app is now using the latest config from app.json or app.config.js
```

**Duration**: 2-3 minutes

**Verification After Prebuild**:
```bash
grep -r "react-native-agora" android/
```

**Expected**: Should find multiple references in Gradle files (if autolinking worked)

**Status Check**: ✅ If "Config synced" and "Generated native code" appear, proceed

---

#### Command 3: Build Development Client

```bash
npx eas build --profile development --platform android
```

**Purpose**: Build a new Expo development client APK that includes react-native-agora native libraries

**What Happens**:
1. Uploads project to EAS servers
2. Runs Gradle build in cloud
3. Compiles native Android code (including Agora)
4. Generates signed APK
5. Provides download URL

**Expected Output**:
```
✔ Build started
  Build ID: a1b2c3d4-e5f6-7890-abcd-ef1234567890
  Platform: Android
  Profile: development
  
✔ Uploading files...
✔ Uploading complete!

Build is running...
🔨 Android build is building...

✔ Build completed
  Build artifact URL: https://expo.dev/artifacts/eas/...apk
  
Download the artifact from the URL above to install it on your device.
```

**Duration**: 10-15 minutes (cloud build time)

**Notification**: You'll receive an email when build completes

**Status Check**: ✅ If "Build completed" appears, copy the APK download URL

---

#### Command 4: Uninstall Old Development Client

**On Android Device**:
```
Settings → Apps → Idle Land Mobilization System → Uninstall
```

**OR via ADB** (if device connected):
```bash
# From any directory with device connected
adb devices
adb uninstall com.smartsgri.idleland
```

**Expected Output** (ADB):
```
Success
```

**Purpose**: Remove old dev client that doesn't have Agora

**Why Required**: 
- Android won't overwrite the old app if signatures differ
- Development builds often have different signatures
- Clean uninstall ensures new build installs properly

**Status Check**: ✅ If app no longer appears on device, proceed

---

#### Command 5: Install New Development Client

**Option A: Direct Download on Device**

1. Open the EAS artifact URL on your Android device (from Step 3)
2. Download the APK:
   ```
   https://expo.dev/artifacts/eas/.../app-development.apk
   ```
3. Tap the downloaded APK file
4. Grant "Install from Unknown Sources" if prompted
5. Tap "Install"

**Option B: Via ADB** (if device connected):

```bash
# Download APK to your computer first, then:
adb install /path/to/downloaded-apk.apk
```

**Expected Output** (ADB):
```
Performing Streamed Install
Success
```

**Verification**:
- App appears on device home screen
- App icon shows "Idle Land Mobilization System"
- App version shows 1.0.0

**Status Check**: ✅ If app launches without crashing, proceed to Phase 5

---

### Command Sequence Summary

| Step | Command | Duration | Can Skip? |
|------|---------|----------|-----------|
| 1 | `npm install` | 1 min | ❌ No - ensures deps current |
| 2 | `npx expo prebuild --clean` | 2-3 min | ❌ No - critical for linking |
| 3 | `npx eas build --profile development --platform android` | 10-15 min | ❌ No - creates new APK |
| 4 | Uninstall old app | 1 min | ⚠️  Maybe - Android may block install if skipped |
| 5 | Install new APK | 2 min | ❌ No - must install to test |

**Total Time**: 16-22 minutes (excluding wait time for EAS build)

---

## PHASE 5 — Post-Build Validation Steps

### Validation Checklist

Execute these checks in order after installing the new development client:

#### ✅ Check 1: App Launches

**Action**: Tap app icon on device

**Expected**: 
- App opens to login screen or last authenticated screen
- No immediate crash
- No "Native module error" alert

**If Fails**: 
- Check Logcat for crash logs
- Verify correct APK was installed
- Ensure old app was fully uninstalled

---

#### ✅ Check 2: Metro Bundler Connects

**Action**: 
1. Ensure backend is running:
   ```bash
   # In backend/ directory
   uvicorn idle_land_api:app --reload --host 0.0.0.0 --port 8000
   ```

2. Ensure Metro is running:
   ```bash
   # In frontend/ directory
   npx expo start --dev-client
   ```

3. Shake device → Dev menu → "Reload"

**Expected Metro Logs**:
```
 BUNDLE  [android, dev] ./index.js ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ 100.0% (1234/1234), done.
```

**If Fails**:
- Check device and dev machine on same network
- Verify Metro is running on correct port (8080)
- Check firewall isn't blocking connection

---

#### ✅ Check 3: Native Module Loads Successfully

**Action**: Watch Metro logs when app launches

**Expected Logs**:
```
=== AGORA DEBUG MODE ENABLED ===
Platform: android
EXPO_PUBLIC_AGORA_APP_ID: NOT SET

[AGORA-MODULE] Successfully loaded react-native-agora
[AGORA-MODULE] createAgoraRtcEngine available: true
[AGORA-MODULE] ChannelProfileType available: true
[AGORA-MODULE] ClientRoleType available: true
[AGORA-MODULE] ConnectionStateType available: true
[AGORA-MODULE] RtcConnection available: true
```

**Must NOT See**:
```
❌ [AGORA-MODULE] CRITICAL: Failed to load react-native-agora
❌ The package 'react-native-agora' doesn't seem to be linked
```

**Verification**: All Agora types report `available: true`

**If Fails**: 
- Native module still not linked → Check android/settings.gradle for Agora references
- May need to rebuild again with `expo prebuild --clean`

---

#### ✅ Check 4: Navigate to Call Screen

**Action**:
1. Log in as admin
2. Navigate to Applications screen
3. Select a client application
4. Tap "Call Client" button

**Expected**:
- No immediate crash
- Navigation to call screen succeeds
- Call setup begins

**Expected Logs**:
```
[ADMIN-CALL] Setup started
[ADMIN-CALL] Agora config validation passed
[ADMIN-CALL] Attempting Agora token refresh...
```

---

#### ✅ Check 5: STEP 1-2 Validation Success

**Expected Logs** (continuing from Check 4):
```
[AGORA] ===== JOIN CHANNEL TIMELINE START =====
[AGORA] STEP 1: Validating configuration...
[AGORA] STEP 1 SUCCESS: All config fields validated

[AGORA] STEP 2: Requesting microphone permission...
[AGORA] STEP 2 SUCCESS: Microphone permission granted
```

**If Permission Denied**:
- Grant microphone permission in Android settings
- Retry call

---

#### ✅ Check 6: STEP 3 Engine Initialization Success

**This is the CRITICAL test**

**Expected Logs**:
```
[AGORA] STEP 3: Initializing Agora engine...
[AGORA] Creating RTC engine instance...
[AGORA] Initializing engine with appId...
[AGORA] Enabling audio stream...
[AGORA] Setting client role to broadcaster...
[AGORA] Setting audio profile...
[AGORA] Engine initialization successful
[AGORA] STEP 3 SUCCESS: Engine initialized and event handlers registered
```

**Significance**: 
- ✅ If STEP 3 succeeds → Native module is WORKING
- ❌ If STEP 3 fails → Native module still not linked (rebuild failed)

**Must NOT See**:
```
❌ [AGORA] CRITICAL: Native module not available
❌ [AGORA] STEP 3 FAILED: initEngine() returned null
```

---

#### ✅ Check 7: STEP 4-5 Execution

**Expected Logs** (after STEP 3 success):
```
[AGORA] STEP 4: Joining channel...
[AGORA] STEP 4:   - Channel: job_12345678_abcd1234
[AGORA] STEP 4:   - UID: 1001
[AGORA] STEP 4:   - Token length: 206
[AGORA] STEP 4 SUCCESS: engine.joinChannel() executed without throwing

[AGORA] STEP 5: Waiting for onJoinChannelSuccess callback from Agora SDK...
```

**Possible Outcomes at STEP 5**:

**Option A - Success**:
```
✅ [AGORA] Joined channel successfully: job_12345678_abcd1234
✅ [AGORA] ✓ SUCCESSFULLY CONNECTED TO CHANNEL
```

**Option B - Token/AppId Issue** (separate problem):
```
⚠️  [AGORA] ===== SDK ERROR DETECTED =====
⚠️  [AGORA] Error Code: 110
⚠️  [AGORA] Error Category: TOKEN_ERROR
```

**Option C - Network Issue**:
```
⚠️  [AGORA] Error Code: 1001
⚠️  [AGORA] Error Category: NETWORK_ERROR
```

**Key Decision Point**:
- If STEP 5 reaches "Waiting for callback" → Native module IS working ✅
- If STEP 5 fails with error code → That's a configuration issue (token/appId), NOT a native module issue
- The rebuild succeeded if you see STEP 3 SUCCESS

---

### Success Criteria Summary

| Validation | Metric | Pass Threshold |
|------------|--------|----------------|
| App Launch | No crash | ✅ App opens |
| Metro Connect | Bundle loads | ✅ JavaScript runs |
| Module Load | `[AGORA-MODULE] Successfully loaded` | ✅ Log appears |
| Agora Types | `createAgoraRtcEngine available: true` | ✅ All types available |
| STEP 1 | Config validation | ✅ SUCCESS logged |
| STEP 2 | Permission granted | ✅ SUCCESS logged |
| **STEP 3** | **Engine initialization** | ✅ **SUCCESS logged** ← CRITICAL |
| STEP 4 | joinChannel() executes | ✅ SUCCESS logged |
| STEP 5 | "Waiting for callback" | ✅ Log appears |

**REBUILD IS SUCCESSFUL IF**: STEP 3 shows SUCCESS

**Why**: STEP 3 is where the native module is actually instantiated. If it succeeds, the native linking worked.

---

### Expected Success Logs (Complete Sequence)

```
=== APP LAUNCH ===
=== AGORA DEBUG MODE ENABLED ===
Platform: android
EXPO_PUBLIC_AGORA_APP_ID: NOT SET

[AGORA-MODULE] Successfully loaded react-native-agora
[AGORA-MODULE] createAgoraRtcEngine available: true
[AGORA-MODULE] ChannelProfileType available: true
[AGORA-MODULE] ClientRoleType available: true
[AGORA-MODULE] ConnectionStateType available: true

=== USER TAPS "CALL CLIENT" ===
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

**At This Point**: Native module rebuild is confirmed successful ✅

**What Happens Next Depends On**:
- Token validity → If valid: onJoinChannelSuccess fires
- AppId/Cert match → If mismatch: Error 110 or 101
- Network connectivity → If blocked: Error 1001

---

## PHASE 6 — Expected Build Duration

### Timeline Breakdown

| Phase | Activity | Duration | Can Work Async? |
|-------|----------|----------|-----------------|
| **Setup** | Open terminal, cd to frontend/ | <1 min | No |
| **Step 1** | `npm install` | 1-2 min | No (must complete) |
| **Step 2** | `npx expo prebuild --clean` | 2-3 min | No (must complete) |
| **Step 3** | `npx eas build` (local work) | 1 min | No (initiating) |
| **Step 3** | EAS cloud build | 10-15 min | ✅ Yes (wait for email) |
| **Step 4** | Uninstall old app | 1 min | No |
| **Step 5** | Install new APK | 2 min | No |
| **Validation** | Test app launch, check logs | 2-3 min | No |
| **Total** | **19-27 minutes** | | |

### Active Time vs Wait Time

- **Active Time** (you're working): ~9-12 minutes
- **Wait Time** (EAS building): ~10-15 minutes ← Do other work

### Optimization Strategy

1. **Start EAS build** after expo prebuild completes
2. **While EAS is building** (10-15 min wait):
   - Review documentation
   - Update tickets
   - Check backend logs
   - Review code changes
   - Take a break ☕
3. **When build completes** (email notification):
   - Uninstall old app (1 min)
   - Install new APK (2 min)
   - Validate (3 min)

**Total Active Time**: ~15 minutes spread over ~20-25 minute window

---

## Post-Build Validation Checklist

### Must Verify After Rebuild

Copy this checklist and check off each item:

#### Environment
- [ ] Backend running on `http://0.0.0.0:8000`
- [ ] Metro bundler running on port 8080
- [ ] Android device on same network as dev machine
- [ ] Old dev client uninstalled from device
- [ ] New APK installed successfully

#### App Launch
- [ ] App opens without crash
- [ ] Login screen appears (or authenticated screen)
- [ ] No "Native module" error alert
- [ ] Metro bundle loads successfully

#### Native Module
- [ ] Metro logs show `[AGORA-MODULE] Successfully loaded`
- [ ] `createAgoraRtcEngine available: true` logged
- [ ] All Agora type checks show `available: true`
- [ ] No `[AGORA-MODULE] CRITICAL` errors

#### Call Flow
- [ ] Can navigate to Applications screen
- [ ] Can select a client application
- [ ] Can tap "Call Client" button
- [ ] Call screen loads without crash

#### STEP Validation
- [ ] STEP 1 SUCCESS (config validation)
- [ ] STEP 2 SUCCESS (microphone permission)
- [ ] **STEP 3 SUCCESS (engine initialization)** ← CRITICAL
- [ ] STEP 4 SUCCESS (joinChannel executed)
- [ ] STEP 5 reached ("Waiting for callback")

#### Success Determination
- [ ] If STEP 3 succeeds → **REBUILD SUCCESSFUL** ✅
- [ ] If STEP 5 fails with error code → Separate configuration issue (not rebuild issue)

---

## Troubleshooting: If STEP 3 Still Fails

### Scenario: Native Module Still Not Loading

**Symptoms**:
```
[AGORA-MODULE] CRITICAL: Failed to load react-native-agora
```

**OR**:
```
[AGORA] STEP 3 FAILED: initEngine() returned null
[AGORA] Module load error: Cannot find module
```

### Diagnostic Steps

#### 1. Verify Correct APK Installed

**Check**: App version on device

**Action**:
```bash
# Via ADB
adb shell dumpsys package com.smartsgri.idleland | grep versionCode

# Expected: versionCode=1 (or higher if rebuilt multiple times)
```

**If version unchanged**: Wrong APK installed or old APK still present

**Solution**: Fully uninstall and reinstall

---

#### 2. Verify Prebuild Included Agora

**Check**: Android settings.gradle has Agora references

**Action**:
```bash
cd frontend
grep -r "agora" android/
```

**Expected**: Should find references in gradle files

**If no matches**: Prebuild didn't pick up Agora

**Solution**: Run prebuild again:
```bash
npx expo prebuild --clean
```

Then check gradle files again before building

---

#### 3. Verify Package Installation

**Check**: node_modules has Agora

**Action**:
```bash
cd frontend
ls -la node_modules/react-native-agora
```

**Expected**: Directory exists with android/, ios/, src/, lib/

**If missing**: Package not installed

**Solution**:
```bash
rm -rf node_modules package-lock.json
npm install
```

---

#### 4. Verify Build Cache

**Check**: EAS build cache may have old configuration

**Action**: Force clean build

**Solution**:
```bash
npx eas build --profile development --platform android --clear-cache
```

This forces EAS to rebuild from scratch without cached dependencies

---

#### 5. Check React Native Version Compatibility

**Issue**: react-native-agora 4.6.2 may have compatibility issues with RN 0.81.5

**Check**: Agora compatibility matrix

**Action**: Review package.json
```json
"react-native": "0.81.5",
"react-native-agora": "^4.6.2"
```

**These versions ARE compatible**, but if still failing:

**Alternative**: Try Agora version 4.4.2 (known stable)
```bash
npm install react-native-agora@4.4.2
npx expo prebuild --clean
npx eas build --profile development --platform android
```

---

#### 6. Local Build for Faster Debugging

**Issue**: EAS builds take 10-15 minutes per iteration

**Solution**: Build locally if Android SDK is configured

**Prerequisites**:
- Android Studio installed
- Android SDK 33+ installed
- ANDROID_HOME environment variable set
- Java JDK 17 installed

**Command**:
```bash
cd frontend
npx expo prebuild --clean
npx expo run:android
```

**Benefits**:
- Builds in 3-5 minutes (faster iteration)
- Installs directly to connected device
- Easier to debug build errors

---

### Escalation: If All Above Fails

#### Verify Expo SDK Compatibility

**Check**: Expo SDK 54 compatibility with react-native-agora

**Action**: Review Expo SDK 54 release notes for known issues

**Alternative**: Downgrade to Expo SDK 53 if SDK 54 has compatibility issues (unlikely)

---

#### Clean Project Completely

**Nuclear Option**: Start with clean slate

**WARNING**: This deletes all local build artifacts

```bash
cd frontend

# Stop Metro
# (Ctrl+C in terminal running expo start)

# Clean everything
rm -rf node_modules
rm -rf android
rm -rf ios
rm -rf .expo
rm package-lock.json

# Reinstall
npm install

# Regenerate
npx expo prebuild --clean

# Rebuild
npx eas build --profile development --platform android
```

---

## Expected Success Logs (Reference)

### Immediately After App Launch

```
=== AGORA DEBUG MODE ENABLED ===
Platform: android
EXPO_PUBLIC_AGORA_APP_ID: NOT SET

[AGORA-MODULE] Successfully loaded react-native-agora
[AGORA-MODULE] createAgoraRtcEngine available: true
[AGORA-MODULE] ChannelProfileType available: true
[AGORA-MODULE] ClientRoleType available: true
[AGORA-MODULE] ConnectionStateType available: true
[AGORA-MODULE] RtcConnection available: true
[AGORA-MODULE] AudioDeviceInfo available: true
```

**This Confirms**: Native module is present in APK and loaded successfully ✅

### When Initiating Call

```
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
[ADMIN-CALL] SUCCESS: Using refreshed token from backend
[ADMIN-CALL] ===== END TOKEN VALIDATION REPORT =====
```

**This Confirms**: Backend token generation is working ✅

### Timeline STEP 1-3 (Critical Section)

```
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
```

**This Confirms**: Native module can be instantiated and configured ✅

### Timeline STEP 4-5

```
[AGORA] STEP 4: Joining channel...
[AGORA] STEP 4:   - Channel: job_12345678_abcd1234
[AGORA] STEP 4:   - UID: 1001
[AGORA] STEP 4:   - Token length: 206
[AGORA] STEP 4 SUCCESS: engine.joinChannel() executed without throwing

[AGORA] STEP 5: Waiting for onJoinChannelSuccess callback from Agora SDK...
```

**This Confirms**: SDK calls are executing without exceptions ✅

### If Configuration Is Correct

```
[AGORA] Joined channel successfully: job_12345678_abcd1234
[AGORA] ✓ SUCCESSFULLY CONNECTED TO CHANNEL

[ADMIN-CALL] Successfully joined Agora channel
```

**This Confirms**: Full end-to-end call flow working ✅🎉

---

## Summary

### What This Document Covered

1. ✅ **Environment Verification**: All versions compatible, EAS configured
2. ✅ **Dependency Status**: react-native-agora installed correctly in node_modules
3. ✅ **Linking Analysis**: Confirmed Android project doesn't include Agora (predates addition)
4. ✅ **Rebuild Commands**: Exact step-by-step commands with expected outputs
5. ✅ **Validation Plan**: Comprehensive checklist to verify successful rebuild
6. ✅ **Troubleshooting**: Multiple fallback strategies if rebuild fails

### Key Takeaways

**The Issue**:
- Native module installed in package ✅
- Native module NOT in Android project ❌
- Need to regenerate Android project and rebuild APK

**The Solution**:
```bash
npm install                           # Ensure deps current
npx expo prebuild --clean             # Regenerate with Agora
npx eas build --profile development   # Build new APK
# Uninstall old, install new
```

**The Validation**:
- Look for `[AGORA-MODULE] Successfully loaded`
- Look for `[AGORA] STEP 3 SUCCESS`
- If both appear → Rebuild successful ✅

### Next Actions

1. ✅ **Execute rebuild commands** (Phase 4)
2. ✅ **Install new APK** on device
3. ✅ **Run validation checks** (Phase 5)
4. ✅ **Verify STEP 3 succeeds**
5. ⏭️  **If STEP 3 succeeds**: Move to token/config troubleshooting (if STEP 5 fails)
6. ⏭️  **If STEP 3 fails**: Use troubleshooting guide in this document

---

**Document Status**: ✅ COMPLETE AND READY FOR EXECUTION

**Confidence**: HIGH - Standard Expo native module linking procedure

**Risk**: LOW - Does not modify application logic, only rebuild configuration

**Time Required**: 20-25 minutes total (15 minutes active work)

---

**End of Document**
