# Idle Land Mobilization System — Mobile Component (Fixed)

This package is aligned to Expo SDK 54 toolchain expectations.

## First run (Windows)
1) Start Android emulator (Android Studio → Virtual Device Manager).
2) Verify:
   - `adb devices` shows emulator

## Install
- `npm install`
- `npx expo install`

## Build dev client (required for react-native-maps)
- `npx expo prebuild --clean`
- `npx expo run:android`

## Run
- `npx expo start --dev-client -c`
- Press `a` to open on Android.
