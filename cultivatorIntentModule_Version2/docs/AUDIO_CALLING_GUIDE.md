# Audio Calling Feature - Setup & Testing Guide

This document explains how to set up and test the in-app audio calling feature for Smart Agri-Suite V2.

## 📋 Overview

The audio calling feature allows:
- **Admin** to call clients directly from job postings
- **Client** to receive calls with a legal notice about recording
- **Real-time Voice** using Agora RTC SDK for actual voice communication
- **Recording** of calls (client-side + optional cloud recording)
- **ML Analysis** of recordings to determine cultivator intent

## 🔧 Prerequisites

### 1. Agora Account (Free Tier - 10,000 minutes/month)

1. Go to [Agora Console](https://console.agora.io/) and create a free account
2. Create a new project with **App ID + App Certificate** authentication
3. Note down your:
   - **App ID** (required)
   - **App Certificate** (required for token authentication)
   - **Customer ID** and **Customer Secret** (optional, for cloud recording)

### 2. Environment Variables

Add these to your backend `.env` file:

```env
# Agora RTC Configuration (Required)
AGORA_APP_ID=your_agora_app_id
AGORA_APP_CERTIFICATE=your_agora_app_certificate

# Agora Cloud Recording (Optional - for server-side recording)
AGORA_CUSTOMER_ID=your_customer_id
AGORA_CUSTOMER_SECRET=your_customer_secret
```

## 🚀 Installation

### Backend

```bash
cd cultivatorIntentModule_Version2/backend

# Install Python dependencies including Agora token builder
pip install -r requirements.txt
# or
pip install agora-token-builder aiohttp
```

### Frontend

```bash
cd cultivatorIntentModule_Version2/frontend

# Install Agora React Native SDK
npm install react-native-agora

# For Expo managed workflow, you need to use development build
npx expo install expo-dev-client
npx expo prebuild  # Generate native projects
npx expo run:android  # or run:ios
```

> **Note**: `react-native-agora` requires native code, so you cannot use Expo Go. 
> You must use a development build or eject to bare workflow.

## 📱 Testing the Calling Flow

### Test Scenario: Two-Device Testing

For a complete test, you need two devices/simulators:

1. **Device A**: Admin logged in
2. **Device B**: Client logged in (the one who posted a job)

### Step-by-Step Testing:

#### 1. Start the Backend Server

```bash
cd cultivatorIntentModule_Version2/backend
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

#### 2. Start the Frontend (Development Build)

```bash
cd cultivatorIntentModule_Version2/frontend
npx expo run:android  # or run:ios
```

#### 3. Test as Client (Device B)
- Register/Login as a client user
- Post a job from "My Job Posting" tab
- Keep the app open (polling happens every 3 seconds)

#### 4. Test as Admin (Device A)
- Login as admin (`admin@smartagri.com`)
- Go to "Applications" tab
- Find the client's job posting
- Tap the **📞 Call** button

#### 5. Expected Flow

| Step | Admin (Device A) | Client (Device B) |
|------|------------------|-------------------|
| 1 | Taps "Call" button | - |
| 2 | Joins Agora channel, shows "Ringing..." | Receives incoming call screen |
| 3 | - | Sees legal notice before accepting |
| 4 | - | Taps "I Agree & Accept" |
| 5 | Remote user count updates | Connected, recording starts |
| 6 | Real voice communication active | Can see mute button, recording indicator |
| 7 | Can mute/unmute | Can mute/unmute |
| 8 | Taps "End Call" | - |
| 9 | Shows analysis results | Recording uploads, sees success message |

## 🔴 Recording & Analysis

### How Recording Works

The system supports two recording modes:

#### 1. Client-Side Recording (Default)
- Recording starts automatically when client accepts the call
- Uses `expo-av` to record local microphone audio
- When call ends, recording uploads to backend
- Backend runs ML analysis using `IntentClassifier`

#### 2. Cloud Recording (Optional - Requires Setup)
- Uses Agora Cloud Recording service
- Records audio server-side in the cloud
- Captures all participants' audio
- Requires Agora Customer ID/Secret and cloud storage setup

### Intent Analysis Results
Analysis categorizes caller intent into:
- **Proceed** - Strong positive intent, ready to proceed
- **Verify** - Some interest, needs verification
- **Reject** - Not interested or negative signals

### Recording Format
- Format: WAV
- Sample Rate: 16kHz
- Channels: Mono
- Optimized for speech analysis

## 📁 File Structure

```
Backend:
  app/
    api/v1/endpoints/calls.py    # Call endpoints with Agora
    services/agora.py            # Agora token & cloud recording
    schemas/call.py              # Pydantic models
    core/config.py               # Agora settings

Frontend:
  src/
    hooks/useAgora.ts            # Agora RTC engine hook
    screens/
      AdminCallScreen.tsx        # Admin in-call UI
      ClientCallScreen.tsx       # Client in-call UI with recording
      IncomingCallScreen.tsx     # Incoming call + legal notice
    services/
      api.ts                     # Call API methods
  App.tsx                        # Navigation with call polling
```

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/calls/initiate` | Admin initiates call |
| GET | `/api/v1/calls/incoming` | Client polls for calls |
| POST | `/api/v1/calls/{id}/accept` | Client accepts call |
| POST | `/api/v1/calls/{id}/reject` | Client rejects call |
| POST | `/api/v1/calls/{id}/end` | Either party ends call |
| POST | `/api/v1/calls/{id}/recording` | Upload local recording |
| POST | `/api/v1/calls/{id}/recording/start` | Start cloud recording |
| POST | `/api/v1/calls/{id}/recording/stop` | Stop cloud recording |

## ⚠️ Known Limitations

1. **Native Build Required**: `react-native-agora` requires native code. 
   You cannot use Expo Go - must use development build or bare workflow.

2. **Polling vs Push**: Incoming calls use 3-second polling instead of push notifications.
   This is intentional for simplicity in a final year project.

3. **Cloud Recording**: Requires additional Agora Cloud Recording setup with
   cloud storage (S3, Azure, GCS). Client-side recording works without this.

## 🔒 Legal Notice

The legal notice shown to clients before accepting includes:
- Recording consent
- Research purpose explanation
- Data storage information
- Voluntary participation notice

This ensures ethical compliance for research purposes.

## 🐛 Troubleshooting

### Call not appearing on client side?
- Check client is logged in with the correct account (the one who posted the job)
- Check backend console for any errors
- Verify polling is running (check console.debug logs)

### Voice not working?
- Ensure microphone permissions are granted
- Check Agora App ID and Certificate are correct
- Verify network connectivity (Agora requires internet)
- Check Agora Console for usage/quota

### Recording upload failing?
- Check backend `recordings/` folder exists
- Verify file permissions
- Check network connectivity

### Agora token errors?
- Verify `.env` has correct AGORA_APP_ID and AGORA_APP_CERTIFICATE
- Ensure Agora project uses "Secured mode" with certificates
- Check token expiration (default: 1 hour)

### Build fails with Agora?
- Run `npx expo prebuild` to generate native projects
- For Android, ensure minSdkVersion >= 21
- For iOS, ensure iOS deployment target >= 11.0

## 📚 Resources

- [Agora Developer Documentation](https://docs.agora.io/)
- [Agora React Native SDK](https://docs.agora.io/en/video-calling/get-started/get-started-sdk?platform=react-native)
- [Agora Cloud Recording](https://docs.agora.io/en/cloud-recording/develop/get-started)
- [Expo Development Builds](https://docs.expo.dev/develop/development-builds/introduction/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
