# Audio Calling Feature - Setup & Testing Guide

This document explains how to set up and test the in-app audio calling feature for Smart Agri-Suite V2.

## 📋 Overview

The audio calling feature allows:
- **Admin** to call clients directly from job postings
- **Client** to receive calls with a legal notice about recording
- **Recording** of calls on the client's device
- **ML Analysis** of recordings to determine cultivator intent

## 🔧 Prerequisites

### 1. LiveKit Account (Free Tier)

1. Go to [LiveKit Cloud](https://cloud.livekit.io/) and create a free account
2. Create a new project
3. Note down your:
   - **LiveKit URL** (e.g., `wss://your-project.livekit.cloud`)
   - **API Key** 
   - **API Secret**

### 2. Environment Variables

Add these to your backend `.env` file:

```env
# LiveKit Configuration
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your-api-key-here
LIVEKIT_API_SECRET=your-api-secret-here
```

## 🚀 Installation

### Backend

```bash
cd cultivatorIntentModule_Version2/backend
pip install livekit-api
```

### Frontend

```bash
cd cultivatorIntentModule_Version2/frontend
npx expo install expo-av
```

## 📱 Testing the Calling Flow

### Test Scenario: Two-Device Testing

For a complete test, you need two devices/simulators:

1. **Device A**: Admin logged in
2. **Device B**: Client logged in (the one who posted a job)

### Step-by-Step Testing:

#### 1. Start the Backend Server

```bash
cd cultivatorIntentModule_Version2/backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 2. Start the Frontend (Expo)

```bash
cd cultivatorIntentModule_Version2/frontend
npx expo start
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
| 2 | Sees "Ringing..." status | Receives incoming call screen |
| 3 | - | Sees legal notice before accepting |
| 4 | - | Taps "I Agree & Accept" |
| 5 | Status changes to "Connected" | Connected, recording starts |
| 6 | Can mute/unmute | Can see recording indicator |
| 7 | Taps "End Call" | - |
| 8 | - | Recording uploads, ML analysis runs |
| 9 | - | Sees intent analysis results |

## 🔴 Recording & Analysis

### How Recording Works

1. Recording starts automatically when client accepts the call
2. Audio is saved locally using `expo-av`
3. When call ends, recording uploads to backend
4. Backend runs ML analysis using `IntentClassifier`
5. Results shown to client with intent labels:
   - **High Interest** - Strong buying/engagement signals
   - **Moderate Interest** - Some interest shown
   - **Low Interest** - Minimal engagement
   - **No Interest** - Not interested

### Recording Format
- Format: WAV
- Sample Rate: 16kHz
- Channels: Mono
- Optimized for speech analysis

## 📁 File Structure

```
Backend:
  app/
    api/v1/endpoints/calls.py    # All call endpoints
    schemas/call.py              # Pydantic models
    core/config.py               # LiveKit settings

Frontend:
  src/
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
| POST | `/api/v1/calls/{id}/recording` | Upload recording |

## ⚠️ Known Limitations

1. **Demo Mode**: LiveKit SDK connection is simulated in the current implementation. 
   Full WebRTC audio requires LiveKit client SDK integration on React Native.

2. **Polling vs Push**: Incoming calls use 3-second polling instead of push notifications.
   This is intentional for simplicity in a final year project.

3. **Single Device Testing**: For quick testing without two devices, you can:
   - Use web browser for admin (expo web)
   - Use phone/emulator for client

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

### Recording upload failing?
- Check backend `recordings/` folder exists
- Verify file permissions
- Check network connectivity

### LiveKit token errors?
- Verify `.env` has correct LIVEKIT_API_KEY and LIVEKIT_API_SECRET
- Ensure LiveKit project is active

## 📚 Resources

- [LiveKit Documentation](https://docs.livekit.io/)
- [Expo AV Documentation](https://docs.expo.dev/versions/latest/sdk/av/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
