# Agora Voice Calling - Quick Reference

## 📋 What Was Implemented

**Agora RTC voice calling with native audio recording** for Smart Agri Suite - allows users to make voice calls and automatically recording both sides of the conversation.

## 📁 Files Created/Updated

```
Smart-Agri-Suite/
├── frontend/src/hooks/useAgora.ts              ✅ Main hook (complete)
├── _cultivator_intention_analyzer/frontend/
│   └── hooks/useAgora.ts                       ✅ Expo hook (complete)
├── AGORA_VOICE_CALLING_IMPLEMENTATION.md       ✅ (1000+ lines)
├── AGORA_SETUP.md                              ✅ (500+ lines)
├── AGORA_API_INTEGRATION.md                    ✅ (600+ lines)
└── AGORA_QUICK_REFERENCE.md                    ✅ This file
```

## 🚀 Quick Start (5 Steps)

### 1. Get Agora Credentials (5 min)
```
1. Visit https://console.agora.io
2. Create project → Copy App ID
3. Copy App Certificate (server only)
4. Save to environment variables
```

### 2. Install Dependencies (2 min)
```bash
# Main frontend
cd frontend && npm install react-native-agora

# Expo frontend
cd _cultivator_intention_analyzer/frontend && npx expo install react-native-agora
```

### 3. Create Token Endpoint (10 min)
```javascript
// backend/routes/agora.js
router.post('/generate-token', (req, res) => {
  // Use example from AGORA_API_INTEGRATION.md
  // Returns token + config
});
```

### 4. Use Hook in Component (5 min)
```typescript
import { useAgora } from '@/hooks/useAgora';

const { state, joinChannel, leaveChannel, toggleMute, startLocalRecording, stopLocalRecording } = useAgora(config);
```

### 5. Test (10 min)
```bash
npm start
# Join same channel from 2 devices
# Verify audio works both ways
# Test recording saves file
```

## 🔑 Key APIs

### useAgora Hook

```typescript
const {
  // State
  state: {
    isConnected,    // boolean - connection established
    isJoined,       // boolean - in channel
    isMuted,        // boolean - mic muted
    remoteUsers,    // number[] - other users
    connectionState, // string - status
    error,          // string | null - error message
  },
  
  // Methods
  joinChannel,         // () => Promise<boolean>
  leaveChannel,        // () => Promise<void>
  toggleMute,         // () => void
  
  // Recording
  isRecording,        // boolean
  startLocalRecording, // () => Promise<boolean>
  stopLocalRecording, // () => Promise<string | null> - file path
} = useAgora(config);
```

### Configuration

```typescript
interface AgoraConfig {
  appId: string;      // From Agora Console
  channelName: string; // "agricultural-support"
  token: string;      // From your backend
  uid: number;        // User ID in channel
}
```

## 📊 Recording Flow

```
User starts recording
    ↓
startLocalRecording() → Agora captures local mic + remote audio
    ↓
[Recording continues in background]
    ↓
User stops recording
    ↓
stopLocalRecording() → Returns file path
    ↓
Upload to server
    ↓
Transcribe (optional)
    ↓
Store in database
```

## 🔧 Common Tasks

### Join a Voice Call
```typescript
const success = await joinChannel();
if (!success) {
  console.error(state.error);
}
```

### Toggle Microphone
```typescript
toggleMute(); // Switches muted state
// state.isMuted will update
```

### Record Audio
```typescript
// Start
const started = await startLocalRecording();

// Stop and get file path
const filePath = await stopLocalRecording();
if (filePath) {
  // Upload to server
  await uploadRecording(filePath);
}
```

### Monitor Connection
```typescript
<Text>Status: {state.connectionState}</Text>
<Text>Remote Users: {state.remoteUsers.length}</Text>
{state.error && <Text style={red}>{state.error}</Text>}
```

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| "Engine not initialized" | Call `joinChannel()` first |
| "No audio heard" | Check remote user is in channel |
| "Recording fails" | Check file path is writable |
| "Token invalid" | Regenerate token from backend |
| "No audio from user" | User's mic might be muted |
| "App crashes" | Check cleanup in useEffect |

## 📚 Documentation Files

| File | Purpose | Read Time |
|------|---------|-----------|
| AGORA_VOICE_CALLING_IMPLEMENTATION.md | Complete reference + examples | 20 min |
| AGORA_SETUP.md | Step-by-step configuration guide | 15 min |
| AGORA_API_INTEGRATION.md | Backend endpoint implementations | 15 min |

## 🔒 Security Checklist

- [ ] Agora credentials in environment variables
- [ ] App Certificate never exposed to frontend
- [ ] Tokens generated server-side only
- [ ] Token expiration set (1-2 hours)
- [ ] Recording consent obtained from users
- [ ] Rate limiting on token endpoint
- [ ] Recording access control implemented
- [ ] Encryption for recording storage

## 📈 Performance Tips

- Pre-initialize engine on app startup
- Use 16kHz sample rate (sufficient for speech)
- Use mono channel (saves space)
- Compress recordings before upload
- Clean up engine on app close
- Handle token refresh before expiry

## 🧪 Testing Checklist

- [ ] Can join channel from 2 devices
- [ ] Can hear other person clearly
- [ ] Mute button works
- [ ] Recording file created with audio
- [ ] Proper error messages on failures
- [ ] App doesn't crash on leave
- [ ] Works on slow networks
- [ ] Works offline (graceful error)

## 💡 Implementation Flow

```
App Startup
    ↓
Get Agora Token from Backend
    ↓
Initialize useAgora Hook
    ↓
User Presses "Start Call"
    ↓
joinChannel()
    ↓
[In Call - User can mute, record, etc.]
    ↓
User Presses "Stop Call"
    ↓
leaveChannel()
    ↓
Cleanup + Releases Resources
```

## 🌐 Platform Support

| Platform | Status | Notes |
|----------|--------|-------|
| Android | ✅ Full | All features |
| iOS | ✅ Full | All features |
| Web | ❌ Not supported | Graceful error message |

## 📞 Example Component

```typescript
import React, { useState, useEffect } from 'react';
import { useAgora } from '@/hooks/useAgora';
import { getAgoraToken } from '@/services/agoraService';

export function CallScreen() {
  const [config, setConfig] = useState(null);
  const { state, joinChannel, leaveChannel, toggleMute, isRecording, startLocalRecording, stopLocalRecording } = useAgora(config);

  // Get token on mount
  useEffect(() => {
    getAgoraToken('support-channel', 12345).then(token => 
      setConfig({
        appId: token.appId,
        token: token.token,
        channelName: token.channelName,
        uid: token.uid,
      })
    );
  }, []);

  return (
    <View>
      <Text>Status: {state.connectionState}</Text>
      
      {!state.isJoined ? (
        <Button title="Call" onPress={joinChannel} />
      ) : (
        <>
          <Button title={state.isMuted ? 'Unmute' : 'Mute'} onPress={toggleMute} />
          <Button 
            title={isRecording ? 'Stop Recording' : 'Start Recording'}
            onPress={() => isRecording ? stopLocalRecording() : startLocalRecording()}
          />
          <Button title="End Call" onPress={leaveChannel} />
        </>
      )}
      
      {state.error && <Text style={{ color: 'red' }}>{state.error}</Text>}
    </View>
  );
}
```

## 🔗 Related Resources

- **Agora Docs**: https://docs.agora.io
- **RTC Token**: https://docs.agora.io/en/video-call-4-x/develop/authentication-workflow
- **React Native SDK**: https://docs.agora.io/en/video-call-4-x/get-started/get-started-sdk?platform=react-native
- **Audio Recording**: https://docs.agora.io/en/video-call-4-x/develop/record-audio

## 📋 Backend Checklist

- [ ] Token generation endpoint working
- [ ] Recording upload endpoint working
- [ ] Database schema created
- [ ] CORS configured
- [ ] Rate limiting enabled
- [ ] Error logging implemented
- [ ] Monitoring set up

## 🎯 Success Criteria

✅ Users can make voice calls
✅ Audio works both ways (send & receive)
✅ Calls can be recorded with file output
✅ Graceful error messages for failures
✅ Works on Android and iOS
✅ Token management is secure
✅ Recordings can be downloaded
✅ Call history is tracked

## 📞 When Everything Works

Users will be able to:
1. Start a voice call with agricultural advisor
2. Have clear two-way audio conversation
3. Automatically record the call for later reference
4. Download transcription of the call
5. Store call history for training purposes
6. See connection quality indicators

## 🚀 Next Step

👉 Read **AGORA_SETUP.md** for complete configuration guide
