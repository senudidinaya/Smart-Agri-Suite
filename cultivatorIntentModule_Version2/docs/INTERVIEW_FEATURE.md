# In-Person Interview Feature - Build & Verify Guide

This document provides step-by-step instructions to build and verify the In-Person Video Interview + Trust Analysis feature.

## Overview

The feature adds a second-stage verification workflow:
1. **Call Stage**: Admin calls client → Audio analysis → PROCEED/VERIFY/REJECT
2. **Interview Stage**: Admin records in-person video → Video analysis → APPROVE/VERIFY/REJECT

## Part A: Backend Setup

### 1. Activate Virtual Environment

```powershell
cd "c:\Senudi's University\Research Project\Smart-Agri-Suite\cultivatorIntentModule_Version2\backend"
.\.venv\Scripts\Activate.ps1
```

### 2. Install Dependencies

```powershell
pip install ffmpeg-python moviepy
```

> **Note**: `ffmpeg` must be installed on your system for video audio extraction.
> Download from: https://ffmpeg.org/download.html

### 3. Start Backend Server

```powershell
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

### 4. Verify Backend Endpoints

#### Health Check
```powershell
Invoke-RestMethod -Uri "http://localhost:8001/api/v1/health"
```

Expected response:
```json
{
  "status": "healthy",
  "model_loaded": true
}
```

#### Test Invite Endpoint (requires auth token)
```powershell
# First login to get token
$body = @{ username = "admin"; password = "admin123" } | ConvertTo-Json
$response = Invoke-RestMethod -Uri "http://localhost:8001/api/v1/auth/login" -Method POST -Body $body -ContentType "application/json"
$token = $response.token

# Test invite endpoint (replace jobId and clientId with real IDs)
$headers = @{ Authorization = "Bearer $token" }
Invoke-RestMethod -Uri "http://localhost:8001/api/v1/admin/interviews/{jobId}/{clientId}/invite" -Method POST -Headers $headers
```

### 5. MongoDB Collections Created

The following collections are automatically indexed:
- `call_assessments` - Stores call analysis results
- `inperson_interviews` - Stores interview metadata and analysis
- `job_applications` - Extended with new status values

New application statuses:
- `new` → `contacted` → `invited_interview` → `interview_done` → `approved`/`rejected`/`verify_required`

---

## Part B: Frontend Setup

### 1. Install Dependencies

```powershell
cd "c:\Senudi's University\Research Project\Smart-Agri-Suite\cultivatorIntentModule_Version2\frontend"
npm install
npx expo install expo-camera
```

### 2. Start Expo Development Server

```powershell
npx expo start --clear
```

### 3. Test on Device/Emulator

1. Scan QR code with Expo Go app (Android/iOS)
2. Or press `a` for Android emulator / `i` for iOS simulator

---

## Part C: Verify Complete Flow

### Admin Flow Testing

1. **Login as Admin**
   - Username: `admin`
   - Password: `admin123`

2. **View Job Posts**
   - Navigate to "Job Posts" tab
   - See list of client job applications

3. **Call Assessment Stage**
   - Tap "📞 Call" on a new job post
   - Complete the call and upload recording
   - View call assessment result (PROCEED/VERIFY/REJECT)

4. **Invite for Interview**
   - On a "contacted" job, tap "🎥 Invite Interview"
   - Confirm the invitation
   - Status changes to "INVITED_INTERVIEW"

5. **Conduct In-Person Interview**
   - Tap "🎬 Start Interview"
   - Read and accept the consent message
   - Grant camera and microphone permissions
   - Record the interview video (tap circle to start, square to stop)
   - Wait for "Analyzing..." to complete

6. **View Results**
   - See decision: APPROVE / VERIFY / REJECT
   - See confidence percentage
   - See analysis reasons
   - Tap "Done" to return

7. **Verify Status Update**
   - Check that application status updated:
     - APPROVE → `approved`
     - VERIFY → `verify_required`
     - REJECT → `rejected`

8. **Verify Local Video Deleted**
   - The local video file is automatically deleted after successful analysis
   - Check device storage to confirm

---

## Part D: API Reference

### Interview Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/admin/interviews/{jobId}/{clientId}/invite` | Invite client for interview |
| POST | `/admin/interviews/{jobId}/{clientId}/analyze-video` | Upload and analyze interview video |
| GET | `/admin/interviews/{jobId}/{clientId}` | Get interview status |
| POST | `/admin/interviews/{jobId}/{clientId}/reject` | Reject application |

### Request/Response Examples

#### Invite for Interview
```json
POST /admin/interviews/abc123/def456/invite
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Client invited for in-person interview",
  "interviewId": "interview123",
  "applicationStatus": "invited_interview"
}
```

#### Analyze Video
```
POST /admin/interviews/abc123/def456/analyze-video
Content-Type: multipart/form-data
Authorization: Bearer <token>

file: <video.mp4>
duration_seconds: 45

Response:
{
  "success": true,
  "interviewId": "interview123",
  "decision": "APPROVE",
  "confidence": 0.85,
  "reasons": [
    "No suspicious patterns detected",
    "Voice analysis within normal range"
  ],
  "applicationStatus": "approved",
  "message": "Interview analysis complete: APPROVE"
}
```

---

## Troubleshooting

### Backend Issues

1. **"Database not available"**
   - Check MongoDB connection in `.env`
   - Ensure IP is whitelisted in MongoDB Atlas

2. **"Audio extraction failed"**
   - Install ffmpeg: `choco install ffmpeg` (Windows)
   - Or install moviepy: `pip install moviepy`

3. **"Model not loaded"**
   - Check that `models/intent_risk_model.pkl` exists
   - Run training script if needed

### Frontend Issues

1. **"Cannot find module 'expo-camera'"**
   - Run: `npx expo install expo-camera`

2. **Camera permissions denied**
   - On Android: Settings → Apps → Expo Go → Permissions → Camera/Microphone
   - On iOS: Settings → Expo Go → Camera/Microphone

3. **Video upload failed**
   - Check backend URL in `api.ts`
   - Ensure backend is running on correct port

---

## Privacy & Security Notes

- Video files are **NOT stored** on the server after analysis
- Only metadata and analysis results are saved to MongoDB
- Consent banner is required before recording starts
- Local video is deleted after successful upload

---

## File Structure

```
backend/
├── app/
│   ├── api/v1/endpoints/
│   │   └── interviews.py          # New interview endpoints
│   ├── schemas/
│   │   └── interview.py           # Interview data models
│   └── core/
│       └── database.py            # Updated with new indexes

frontend/
├── src/
│   ├── screens/
│   │   ├── AdminApplicationsScreen.tsx  # Updated with interview UI
│   │   └── InPersonInterviewScreen.tsx  # New interview screen
│   └── services/
│       └── api.ts                        # New interview API methods
├── App.tsx                               # Updated navigation
└── package.json                          # Added expo-camera
```
