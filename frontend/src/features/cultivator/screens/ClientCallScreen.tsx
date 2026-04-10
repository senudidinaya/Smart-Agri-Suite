/**
 * Client Call Screen - Audio call interface with Agora RTC and recording
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { api, AnalysisResult, AgoraTokenInfo } from '../services/api';
import { useAgora, AgoraConfig } from '../hooks/useAgora';

interface RouteParams {
  callId: string;
  jobTitle?: string;
  // Agora connection info
  agora?: AgoraTokenInfo;
  // Legacy fields (kept for backwards compatibility)
  roomName?: string;
  livekitUrl?: string;
  token?: string;
}

export default function ClientCallScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { callId, jobTitle, agora } = route.params as RouteParams;

  const [callStatus, setCallStatus] = useState<'connecting' | 'connected' | 'ended'>('connecting');
  const [callDuration, setCallDuration] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [uploadFailed, setUploadFailed] = useState(false);
  const [endedByOther, setEndedByOther] = useState(false);
  const [isEndingCall, setIsEndingCall] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingAttemptedRef = useRef(false);
  const callEndingRef = useRef(false);
  const isRecordingRef = useRef(false);

  // Configure Agora
  const agoraConfig: AgoraConfig | null = agora ? {
    appId: agora.appId,
    channelName: agora.channelName,
    token: agora.token,
    uid: agora.uid,
  } : null;

  // Use Agora hook for voice calling
  const {
    state: agoraState,
    joinChannel,
    leaveChannel,
    toggleMute,
    isRecording,
    isRecordingStarting,
    startLocalRecording,
    stopLocalRecording,
  } = useAgora(agoraConfig);

  // Keep ref in sync so async handlers always see latest recording state
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  // Join Agora channel on mount
  useEffect(() => {
    const setup = async () => {
      if (!agoraConfig) {
        Alert.alert('Error', 'No call configuration received');
        navigation.goBack();
        return;
      }

      console.log('Client joining Agora channel:', agoraConfig.channelName);
      
      const joined = await joinChannel();
      if (!joined) {
        Alert.alert('Error', 'Failed to join the call. Please try again.');
        navigation.goBack();
        return;
      }

      // Recording will start after channel is actually joined (see isJoined effect below)
      startStatusPolling();
    };

    setup();

    return () => {
      cleanup();
    };
  }, []);

  // Start recording ONLY after the Agora channel is actually joined
  // joinChannel() is async/non-blocking — isJoined becomes true when onJoinChannelSuccess fires
  useEffect(() => {
    if (agoraState.isJoined && !recordingAttemptedRef.current) {
      recordingAttemptedRef.current = true;
      
      const tryStartRecording = async () => {
        console.log('[CultivatorRecordingRace] Recording start requested after channel join', {
          isJoined: agoraState.isJoined,
          callEnding: callEndingRef.current,
        });
        // Small delay to let audio engine fully stabilize after join
        await new Promise(resolve => setTimeout(resolve, 500));
        if (callEndingRef.current) {
          console.log('[CultivatorRecordingRace] Suppressing late recording start before first attempt', {
            callEnding: callEndingRef.current,
          });
          return;
        }
        console.log('Channel joined, starting local recording...');
        
        let success = await startLocalRecording();
        console.log('[CultivatorRecordingRace] Recording start completed', {
          success,
          callEnding: callEndingRef.current,
        });
        if (callEndingRef.current) {
          if (success) {
            console.log('[CultivatorRecordingRace] Late recording start succeeded after ending began; stopping immediately');
            await stopLocalRecording();
          }
          console.log('[CultivatorRecordingRace] Recording start resolved after call began ending', {
            success,
            callEnding: callEndingRef.current,
          });
          return;
        }
        
        // Retry up to 2 more times with increasing delays
        for (let attempt = 1; !success && attempt <= 2; attempt++) {
          if (callEndingRef.current) {
            console.log('[CultivatorRecordingRace] Suppressing recording retry because call is ending/ended', {
              attempt,
              callEnding: callEndingRef.current,
            });
            return;
          }
          console.log(`Recording start retry attempt ${attempt}...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          if (callEndingRef.current) {
            console.log('[CultivatorRecordingRace] Suppressing recording retry after wait because call is ending/ended', {
              attempt,
              callEnding: callEndingRef.current,
            });
            return;
          }
          success = await startLocalRecording();
          console.log('[CultivatorRecordingRace] Recording retry completed', {
            attempt,
            success,
            callEnding: callEndingRef.current,
          });
          if (callEndingRef.current && success) {
            console.log('[CultivatorRecordingRace] Late recording retry succeeded after ending began; stopping immediately');
            await stopLocalRecording();
            return;
          }
        }
        
        if (!success) {
          console.error('Failed to start recording after all retries');
        }
      };
      
      tryStartRecording();
    }
  }, [agoraState.isJoined, startLocalRecording]);

  // Update call status based on Agora connection
  useEffect(() => {
    if (agoraState.isJoined && callStatus === 'connecting') {
      setCallStatus('connected');
    }
  }, [agoraState.isJoined]);

  useEffect(() => {
    console.log('[CultivatorRecordingRace] Client call lifecycle snapshot', {
      callStatus,
      isJoined: agoraState.isJoined,
      isRecordingStarting,
      isRecording,
      isEndingCall,
      endedByOther,
    });
  }, [callStatus, agoraState.isJoined, isRecordingStarting, isRecording, isEndingCall, endedByOther]);

  // Call duration timer
  useEffect(() => {
    if (callStatus === 'connected') {
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [callStatus]);

  const cleanup = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (pollRef.current) {
      clearInterval(pollRef.current);
    }
    await leaveChannel();
  };

  // Poll for call status to detect if admin ends the call
  const startStatusPolling = () => {
    pollRef.current = setInterval(async () => {
      try {
        const response = await api.getCallStatus(callId);
        
        if (response.status === 'ended' && callStatus !== 'ended') {
          // Admin ended the call
          setEndedByOther(true);
          await handleCallEndedByOther();
        }
      } catch (error) {
        console.debug('Status poll error:', error);
      }
    }, 2000);
  };

  // Handle when admin ends the call
  const handleCallEndedByOther = async () => {
    if (callEndingRef.current) {
      console.log('[CultivatorRecordingRace] Ignoring admin-ended flow because call ending is already in progress');
      return;
    }
    let endedSuccessfully = false;
    callEndingRef.current = true;
    setIsEndingCall(true);
    try {
      if (pollRef.current) clearInterval(pollRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      
      // Leave Agora channel and stop recording
      console.log('Call ended by admin, evaluating recording stop...', {
        isRecording: isRecordingRef.current,
        isRecordingStarting,
        callStatus,
      });
      let uri: string | null = null;
      if (isRecordingRef.current) {
        console.log('[CultivatorRecordingRace] Taking stop/upload path for admin-ended call');
        uri = await stopLocalRecording();
        console.log('Recording stopped, URI:', uri);
      } else {
        console.warn('[CultivatorRecordingRace] Skipping stop/upload because recording was not ready when admin ended the call', {
          isRecording: isRecordingRef.current,
          isRecordingStarting,
        });
      }
      await leaveChannel();
      setCallStatus('ended');
      endedSuccessfully = true;
      
      if (uri) {
        setRecordingUri(uri);
        await uploadRecording(uri);
      } else {
        console.warn('No recording URI available - recording may not have started');
      }
    } finally {
      if (!endedSuccessfully) {
        callEndingRef.current = false;
      }
      setIsEndingCall(false);
    }
  };

  const uploadRecording = async (uri: string) => {
    setIsUploading(true);
    setUploadFailed(false);

    try {
      console.log('Starting upload for URI:', uri);
      // Fire-and-forget: start the upload but don't wait for it to complete
      // The backend will process the audio and run ML analysis in the background
      api.uploadRecording(callId, uri)
        .then(result => {
          console.log('Upload and analysis complete in background:', result);
          setAnalysisResult({
            intentLabel: result.intentLabel,
            confidence: result.confidence,
            scores: result.scores,
          });
        })
        .catch(error => {
          console.error('Upload failed in background:', error);
          setUploadFailed(true);
        })
        .finally(() => {
          setIsUploading(false);
        });
      
      // Auto-close is handled by the useEffect that watches callStatus === 'ended'
    } catch (error: any) {
      console.error('Upload initiation failed:', error);
      setIsUploading(false);
      setUploadFailed(true);
      
      let errorMsg = error.message || 'Failed to upload recording. Please check your network connection.';
      if (error.message?.includes('network may be blocking')) {
        errorMsg += '\n\nTip: Try using mobile data instead of university Wi-Fi.';
      }
      Alert.alert('Upload Failed', errorMsg, [
        { text: 'Retry', onPress: handleRetryUpload },
        { text: 'Close', style: 'cancel' }
      ]);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleMuteToggle = () => {
    toggleMute();
  };

  const handleEndCall = async () => {
    if (callEndingRef.current) {
      console.log('[CultivatorRecordingRace] Ignoring duplicate end-call request');
      return;
    }
    let endedSuccessfully = false;
    try {
      callEndingRef.current = true;
      setIsEndingCall(true);
      // Stop polling
      if (pollRef.current) clearInterval(pollRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      
      // Stop recording first
      console.log('Client end-call requested', {
        isRecording: isRecordingRef.current,
        isRecordingStarting,
        callStatus,
      });
      let uri: string | null = null;
      if (isRecordingRef.current) {
        console.log('[CultivatorRecordingRace] Recording is ready, stopping and preparing upload');
        uri = await stopLocalRecording();
        console.log('Recording stopped, URI:', uri);
      } else {
        console.warn('[CultivatorRecordingRace] Recording not ready at end-call; stop/upload path will be skipped', {
          isRecording: isRecordingRef.current,
          isRecordingStarting,
          callStatus,
        });
      }
      setRecordingUri(uri);

      // Leave Agora channel
      await leaveChannel();

      // End the call on backend
      await api.endCall(callId);
      setCallStatus('ended');
      endedSuccessfully = true;

      // Upload recording if we have one
      if (uri) {
        await uploadRecording(uri);
      } else {
        console.warn('No recording URI available - recording may not have started');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      if (!endedSuccessfully) {
        callEndingRef.current = false;
      }
      setIsEndingCall(false);
    }
  };

  const handleRetryUpload = async () => {
    if (recordingUri) {
      await uploadRecording(recordingUri);
    }
  };

  const handleClose = () => {
    navigation.goBack();
  };

  // Auto-close after upload completes or after timeout
  useEffect(() => {
    if (callStatus === 'ended') {
      // If upload succeeded, close after 3 seconds
      if (analysisResult && !isUploading && !uploadFailed) {
        const timer = setTimeout(() => {
          navigation.goBack();
        }, 3000);
        return () => clearTimeout(timer);
      }
      // If no upload is happening, no result, and no recording URI (recording never started),
      // give user time to see the message before auto-closing
      if (!isUploading && !analysisResult && !uploadFailed && !recordingUri) {
        const timer = setTimeout(() => {
          navigation.goBack();
        }, 8000);
        return () => clearTimeout(timer);
      }
    }
  }, [analysisResult, isUploading, uploadFailed, callStatus, recordingUri]);

  // Render call ended screen - just show upload status (analysis goes to admin)
  if (callStatus === 'ended') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.endedContent}>
          <Text style={styles.endedTitle}>Call Ended</Text>
          <Text style={styles.durationText}>Duration: {formatDuration(callDuration)}</Text>

          {isUploading && (
            <View style={styles.uploadingContainer}>
              <ActivityIndicator size="large" color="#27ae60" />
              <Text style={styles.uploadingText}>Processing recording...</Text>
            </View>
          )}

          {uploadFailed && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Upload failed</Text>
              <TouchableOpacity style={styles.retryButton} onPress={handleRetryUpload}>
                <Text style={styles.retryButtonText}>Tap to Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {analysisResult && !isUploading && !uploadFailed && (
            <View style={styles.successContainer}>
              <Text style={styles.successIcon}>✓</Text>
              <Text style={styles.successText}>Recording uploaded successfully</Text>
              <Text style={styles.successSubtext}>
                The admin will receive the analysis report.
              </Text>
              <Text style={styles.autoCloseText}>Closing automatically...</Text>
            </View>
          )}

          {!isUploading && !analysisResult && !uploadFailed && !recordingUri && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Recording not available</Text>
              <Text style={styles.endedInfoText}>
                Voice recording could not be captured.{'\n'}
                The admin will not receive voice analysis for this call.
              </Text>
              <Text style={styles.autoCloseText}>Closing automatically...</Text>
            </View>
          )}

          {!isUploading && !analysisResult && !uploadFailed && recordingUri && (
            <View style={styles.endedInfoContainer}>
              <Text style={styles.endedInfoText}>Call has ended</Text>
              <Text style={styles.autoCloseText}>Closing automatically...</Text>
            </View>
          )}

          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Get connection status color
  const getConnectionColor = () => {
    switch (agoraState.connectionState) {
      case 'connected': return '#27ae60';
      case 'connecting': return '#f39c12';
      case 'reconnecting': return '#f39c12';
      case 'disconnected': return '#e74c3c';
      case 'failed': return '#e74c3c';
      default: return '#95a5a6';
    }
  };

  // Render active call screen
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Connection Indicator */}
        <View style={styles.connectionIndicator}>
          <Text style={[styles.connectionText, { color: getConnectionColor() }]}>
            {agoraState.connectionState === 'connected' 
              ? `● Connected${agoraState.remoteUsers.length > 0 ? ` (${agoraState.remoteUsers.length} in call)` : ''}`
              : `● ${agoraState.connectionState.charAt(0).toUpperCase() + agoraState.connectionState.slice(1)}`
            }
          </Text>
        </View>

        {/* Recording Indicator */}
        {isRecording && (
          <View style={styles.recordingIndicator}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingText}>Recording</Text>
          </View>
        )}

        {/* Call Info */}
        <View style={styles.callInfo}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>📞</Text>
          </View>
          <Text style={styles.jobTitle}>{jobTitle || 'Admin Call'}</Text>
          <Text style={styles.statusText}>
            {callStatus === 'connecting' ? 'Connecting...' : formatDuration(callDuration)}
          </Text>
          
          {/* Status */}
          <View style={styles.instructionBox}>
            <Text style={styles.instructionTitle}>🎙️ Voice Call Active</Text>
            <Text style={styles.instructionText}>
              You are now connected via voice.{"\n"}
              Your voice is being recorded for analysis.{"\n"}
              Speak naturally during the conversation.
            </Text>
          </View>
        </View>

        {/* Call Controls */}
        <View style={styles.controls}>
          {/* Mute Button */}
          <TouchableOpacity
            style={[styles.controlButton, agoraState.isMuted && styles.controlButtonActive]}
            onPress={handleMuteToggle}
            activeOpacity={0.7}
          >
            <Text style={styles.controlIcon}>{agoraState.isMuted ? '🔇' : '🎤'}</Text>
            <Text style={styles.controlLabel}>{agoraState.isMuted ? 'Unmute' : 'Mute'}</Text>
          </TouchableOpacity>

          {/* End Call Button */}
          <TouchableOpacity
            style={[styles.controlButton, styles.endCallButton]}
            onPress={handleEndCall}
            disabled={isEndingCall}
            activeOpacity={0.7}
          >
            <Text style={styles.controlIcon}>📵</Text>
            <Text style={[styles.controlLabel, styles.endCallLabel]}>
              {isEndingCall ? 'Ending...' : 'End Call'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Notice */}
        <View style={styles.noticeContainer}>
          <Text style={styles.noticeText}>
            🔴 Your voice is being recorded for intent analysis
          </Text>
        </View>

        {/* Error Display */}
        {agoraState.error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{agoraState.error}</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 40,
  },
  connectionIndicator: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  connectionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 5,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#e74c3c',
    marginRight: 8,
  },
  recordingText: {
    color: '#e74c3c',
    fontSize: 14,
    fontWeight: '600',
  },
  callInfo: {
    alignItems: 'center',
    paddingTop: 40,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#27ae60',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarText: {
    fontSize: 50,
  },
  jobTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  statusText: {
    fontSize: 18,
    color: '#27ae60',
  },
  instructionBox: {
    backgroundColor: 'rgba(92, 154, 154, 0.2)',
    borderRadius: 12,
    padding: 15,
    marginTop: 20,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: '#27ae60',
  },
  instructionTitle: {
    color: '#27ae60',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  instructionText: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  controlButton: {
    alignItems: 'center',
    padding: 15,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.1)',
    minWidth: 80,
    marginHorizontal: 20,
  },
  controlButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  endCallButton: {
    backgroundColor: '#e74c3c',
  },
  controlIcon: {
    fontSize: 30,
    marginBottom: 5,
  },
  controlLabel: {
    color: '#fff',
    fontSize: 12,
  },
  endCallLabel: {
    fontWeight: 'bold',
  },
  noticeContainer: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  noticeText: {
    color: '#e74c3c',
    fontSize: 12,
    textAlign: 'center',
  },
  demoNotice: {
    backgroundColor: 'rgba(241, 196, 15, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 15,
    marginHorizontal: 20,
    borderRadius: 8,
    marginBottom: 20,
  },
  demoNoticeText: {
    color: '#f1c40f',
    fontSize: 10,
    textAlign: 'center',
  },
  // Ended screen styles
  endedContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  endedTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  durationText: {
    fontSize: 16,
    color: '#999',
    marginBottom: 30,
  },
  uploadingContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  uploadingText: {
    color: '#27ae60',
    marginTop: 10,
    fontSize: 14,
  },
  errorContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 16,
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: '#e74c3c',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  successContainer: {
    alignItems: 'center',
    marginVertical: 30,
    backgroundColor: 'rgba(39, 174, 96, 0.15)',
    borderRadius: 15,
    padding: 25,
    width: '100%',
  },
  successIcon: {
    fontSize: 50,
    color: '#27ae60',
    marginBottom: 15,
  },
  successText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#27ae60',
    marginBottom: 8,
  },
  successSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  autoCloseText: {
    fontSize: 12,
    color: '#666',
    marginTop: 15,
    fontStyle: 'italic',
  },
  endedInfoContainer: {
    alignItems: 'center',
    marginVertical: 30,
  },
  endedInfoText: {
    fontSize: 16,
    color: '#999',
    marginBottom: 10,
  },
  closeButton: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 10,
    marginTop: 20,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
