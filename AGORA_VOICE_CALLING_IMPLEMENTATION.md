# Agora Voice Calling Implementation Guide

## Overview

This document describes the implementation of Agora RTC (Real-time Communication) voice calling with native audio recording capabilities in the Smart Agri Suite application. The implementation includes:

1. **useAgora Hook** - React hook for managing Agora RTC engine lifecycle
2. **Native Audio Recording** - Captures both local and remote audio streams
3. **Cross-platform Support** - Works on Android, iOS, and degrades gracefully on web
4. **Error Handling** - Comprehensive error management with user-friendly messages

## Architecture

### Components

```
Smart-Agri-Suite/
├── frontend/
│   └── src/hooks/
│       └── useAgora.ts          (v4.x API for main frontend)
├── _cultivator_intention_analyzer/
│   └── frontend/
│       └── hooks/
│           └── useAgora.ts      (v4.x API for Expo app)
```

### Data Flow

```
App Component
    ↓
useAgora Hook
    ├→ Agora RTC Engine
    │   ├→ Audio Stream (Local Mic)
    │   ├→ Audio Stream (Remote User)
    │   └→ Native Recording (Mixed Audio)
    │
    ├→ State Management (Redux/Context)
    │   ├→ Connection Status
    │   ├→ Joined Users
    │   └→ Recording State
    │
    └→ Event Handlers
        ├→ onJoinChannelSuccess
        ├→ onUserJoined/Offline
        ├→ onConnectionStateChanged
        └→ onError
```

## API Reference

### useAgora Hook

#### Configuration

```typescript
interface AgoraConfig {
  appId: string;           // Agora App ID from console
  channelName: string;     // Voice channel to join
  token: string;           // RTC token (generated server-side)
  uid: number;             // Unique user ID in channel
}
```

#### State

```typescript
interface AgoraState {
  isConnected: boolean;     // Connection established
  isJoined: boolean;        // Successfully joined channel
  isMuted: boolean;         // Microphone muted status
  remoteUsers: number[];    // List of remote user UIDs
  connectionState: string;  // 'connecting' | 'connected' | 'disconnected' | etc.
  error: string | null;     // Error message if any
}
```

#### Return Value

```typescript
interface UseAgoraReturn {
  state: AgoraState;
  
  // Join the voice channel
  joinChannel: () => Promise<boolean>;
  
  // Leave the voice channel
  leaveChannel: () => Promise<void>;
  
  // Toggle microphone mute
  toggleMute: () => void;
  
  // Recording state
  isRecording: boolean;
  
  // Start native audio recording (captures both sides)
  startLocalRecording: () => Promise<boolean>;
  
  // Stop recording and get file path
  stopLocalRecording: () => Promise<string | null>;
}
```

### Usage Example

```typescript
import { useAgora, AgoraConfig } from '@/src/hooks/useAgora';

export function VoiceCallScreen() {
  const agoraConfig: AgoraConfig = {
    appId: process.env.AGORA_APP_ID || '',
    channelName: 'agricultural-support',
    token: 'YOUR_RTC_TOKEN', // from server
    uid: 12345,
  };

  const {
    state,
    joinChannel,
    leaveChannel,
    toggleMute,
    isRecording,
    startLocalRecording,
    stopLocalRecording,
  } = useAgora(agoraConfig);

  const handleStartCall = async () => {
    const success = await joinChannel();
    if (success) {
      console.log('Joined call successfully');
    }
  };

  const handleStartRecording = async () => {
    const success = await startLocalRecording();
    if (success) {
      console.log('Recording started');
    }
  };

  const handleStopRecording = async () => {
    const filePath = await stopLocalRecording();
    if (filePath) {
      console.log('Recording saved to:', filePath);
      // Upload to server or process locally
    }
  };

  return (
    <View style={styles.container}>
      <Text>Status: {state.connectionState}</Text>
      
      {!state.isJoined ? (
        <Button title="Start Call" onPress={handleStartCall} />
      ) : (
        <>
          <Text>Connected Users: {state.remoteUsers.length}</Text>
          
          <Button 
            title={state.isMuted ? 'Unmute' : 'Mute'} 
            onPress={toggleMute} 
          />
          
          {!isRecording ? (
            <Button 
              title="Start Recording" 
              onPress={handleStartRecording}
              disabled={!state.isJoined}
            />
          ) : (
            <Button title="Stop Recording" onPress={handleStopRecording} />
          )}
          
          <Button title="End Call" onPress={leaveChannel} />
        </>
      )}
      
      {state.error && (
        <Text style={styles.error}>{state.error}</Text>
      )}
    </View>
  );
}
```

## Audio Recording Details

### Recording Strategy

The implementation uses **Agora's native audio recording** which automatically captures:

1. **Local Microphone** - User's microphone input
2. **Remote Audio** - Audio from other call participants
3. **Mixed Recording** - Both streams combined in a single WAV file

### Recording Configuration

```typescript
startAudioRecording({
  filePath: string;           // Where to save the file
  sampleRate: 16000;          // 16kHz (ideal for speech/ML)
  recordingChannel: 1;        // Mono channel
  quality: 'medium';          // Medium quality (balanced)
  fileRecordingType: 'mixed';  // Mix local + remote audio
});
```

### File Paths

- **Android**: `/data/user/0/{packageName}/cache/call_recording_{timestamp}.wav`
- **iOS**: App Documents directory (Agora default)
- **Web**: Not supported (gracefully disabled)

### Post-Recording Processing

After stopping the recording, the file can be:

1. **Uploaded to Server** - Use FormData with multipart upload
2. **Transcribed** - Send to speech-to-text service (e.g., Google Speech-to-Text)
3. **Processed Locally** - Analyze with React Native audio processing libraries
4. **Stored** - Save to device storage for later access

Example upload:

```typescript
const uploadRecording = async (filePath: string) => {
  const formData = new FormData();
  formData.append('recording', {
    uri: `file://${filePath}`,
    type: 'audio/wav',
    name: `recording_${Date.now()}.wav`,
  });
  
  const response = await fetch(`${API_BASE}/calls/upload-recording`, {
    method: 'POST',
    body: formData,
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
  });
  
  if (response.ok) {
    const { recordingId } = await response.json();
    return recordingId;
  }
};
```

## Error Handling

### Common Errors

| Code | Message | Solution |
|------|---------|----------|
| 110 | Invalid token | Regenerate token server-side |
| 2, 101 | Invalid App ID | Check environment variables |
| 102 | Invalid channel name | Use valid channel name |
| 1002 | Microphone unavailable | Check device permissions |
| 1020 | Recording initialization failed | Check file system permissions |

### Platform-Specific Considerations

#### Android
- Requires `RECORD_AUDIO` permission (handled automatically)
- Requires `WRITE_EXTERNAL_STORAGE` or cache access
- File path uses app-specific cache directory

#### iOS
- Requires microphone permission (ask first)
- Uses app's Documents directory
- Requires `NSMicrophoneUsageDescription` in Info.plist

#### Web
- Gracefully disabled with error message
- Users redirected to mobile app
- No native Agora support on web

## Integration Checklist

- [ ] Install `react-native-agora` package
- [ ] Get App ID from Agora Console
- [ ] Implement server-side token generation
- [ ] Configure environment variables (AGORA_APP_ID, AGORA_CERT)
- [ ] Test on Android device
- [ ] Test on iOS device
- [ ] Implement recording upload
- [ ] Set up error analytics
- [ ] Document recording retention policy
- [ ] Test with poor network conditions
- [ ] Implement call timeout logic
- [ ] Add user feedback during connection

## Performance Optimization

### Connection
- Pre-initialize engine on app startup
- Reuse engine instance across calls
- Implement connection timeout (60 seconds)
- Show connection progress to user

### Recording
- Use 16kHz sample rate (sufficient for speech)
- Use mono channel (reduces file size)
- Implement on-device compression if needed
- Upload asynchronously in background

### Memory
- Release engine on app close
- Clean up event listeners properly
- Avoid keeping large audio buffers in memory
- Use refs for mutable values

## Testing

### Unit Tests
```typescript
describe('useAgora', () => {
  it('should initialize engine on first call', async () => {
    const { joinChannel } = renderHook(() => useAgora(mockConfig));
    await joinChannel();
    expect(engineRef.current).toBeDefined();
  });

  it('should handle invalid token', async () => {
    const { state } = renderHook(() => useAgora(invalidConfig));
    // Should set error state
    expect(state.error).toContain('token');
  });
});
```

### Integration Tests
- Test on actual devices (not simulators)
- Verify audio quality with test users
- Test network disconnection scenarios
- Verify recording file integrity
- Test token expiration handling

## Security Considerations

1. **Token Generation**
   - Generate tokens server-side
   - Include user identification
   - Set expiration (e.g., 1 hour)
   - Rotate tokens regularly

2. **Recording Privacy**
   - Inform users about recording
   - Get explicit consent before recording
   - Encrypt recordings at rest
   - Implement retention policies
   - Provide user deletion options

3. **Channel Security**
   - Use channel names as authentication tier
   - Separate channels per user/context
   - Implement role-based access (broadcaster vs audience)
   - Monitor for unauthorized access

## Troubleshooting

### "Engine not initialized"
- Ensure `initEngine()` is called before using the engine
- Check that Agora App ID is valid
- Verify network connectivity

### "Joined channel but no audio"
- Check microphone permissions are granted
- Verify remote user is also in channel
- Check audio profile settings
- Test with another user in same channel

### "Recording not captured"
- Verify file path is writable
- Check disk space availability
- Ensure call is active (not muted)
- Check file permissions on device

### "Token expired during call"
- Implement token refresh mechanism
- Call API to get new token
- Update Agora config
- Rejoin channel if needed

## Future Enhancements

1. **Video Calling**
   - Extend hook to support video streams
   - Add camera selection
   - Implement screen sharing

2. **Advanced Recording**
   - Per-user audio tracks
   - Real-time transcription
   - Automatic meeting notes
   - Speaker identification

3. **Analytics**
   - Call duration tracking
   - Connection quality metrics
   - Recording completion tracking
   - Error rate monitoring

4. **User Experience**
   - Advanced sound effects (ringtone, disconnect)
   - Connection quality indicators
   - Network warning messages
   - Call history and replay

## References

- [Agora React Native SDK](https://docs.agora.io/en/video-call-4-x/get-started/get-started-sdk?platform=react-native)
- [Token Generation](https://docs.agora.io/en/video-call-4-x/develop/authentication-workflow)
- [Audio Recording](https://docs.agora.io/en/video-call-4-x/develop/record-audio)
- [Error Codes](https://docs.agora.io/en/video-call-4-x/basics/error-code-table)

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review Agora documentation
3. Check React Native Agora GitHub issues
4. Contact development team
