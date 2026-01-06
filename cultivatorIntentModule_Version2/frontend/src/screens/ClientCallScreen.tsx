/**
 * Client Call Screen - Audio call interface for client with recording
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
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { api, AnalysisResult } from '../services/api';

interface RouteParams {
  callId: string;
  roomName: string;
  livekitUrl: string;
  token: string;
  jobTitle?: string;
}

export default function ClientCallScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { callId, roomName, livekitUrl, token, jobTitle } = route.params as RouteParams;

  const [callStatus, setCallStatus] = useState<'connecting' | 'connected' | 'ended'>('connecting');
  const [isRecording, setIsRecording] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [uploadFailed, setUploadFailed] = useState(false);
  const [endedByOther, setEndedByOther] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Request audio permissions
  useEffect(() => {
    const setup = async () => {
      try {
        // Request audio permissions
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Microphone permission is required for calls.');
          navigation.goBack();
          return;
        }

        // Set audio mode for recording
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
        });

        console.log('Client connecting to room:', roomName);
        console.log('LiveKit URL:', livekitUrl);
        
        // Immediately mark as connected and start recording
        setCallStatus('connected');
        startRecording();
        startStatusPolling();

      } catch (error) {
        console.error('Setup error:', error);
        Alert.alert('Error', 'Failed to set up call');
        navigation.goBack();
      }
    };

    setup();

    return () => {
      cleanup();
    };
  }, []);

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
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch (e) {
        // Ignore cleanup errors
      }
    }
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
    if (pollRef.current) clearInterval(pollRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    
    // Stop recording and upload
    const uri = await stopRecording();
    setCallStatus('ended');
    
    if (uri) {
      await uploadRecording(uri);
    }
  };

  const startRecording = async () => {
    try {
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync({
        android: {
          extension: '.wav',
          outputFormat: Audio.AndroidOutputFormat.DEFAULT,
          audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.wav',
          outputFormat: Audio.IOSOutputFormat.LINEARPCM,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      });
      
      await recording.startAsync();
      recordingRef.current = recording;
      setIsRecording(true);
      console.log('Recording started');
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const stopRecording = async (): Promise<string | null> => {
    try {
      if (!recordingRef.current) return null;

      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      setIsRecording(false);
      setRecordingUri(uri);
      console.log('Recording saved to:', uri);
      return uri;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      return null;
    }
  };

  const uploadRecording = async (uri: string) => {
    setIsUploading(true);
    setUploadFailed(false);

    try {
      const result = await api.uploadRecording(callId, uri);
      setAnalysisResult({
        intentLabel: result.intentLabel,
        confidence: result.confidence,
        scores: result.scores,
      });
      console.log('Upload and analysis complete:', result);
    } catch (error: any) {
      console.error('Upload failed:', error);
      setUploadFailed(true);
    } finally {
      setIsUploading(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
  };

  const handleEndCall = async () => {
    try {
      // Stop polling
      if (pollRef.current) clearInterval(pollRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      
      // Stop recording first
      const uri = await stopRecording();

      // End the call on backend
      await api.endCall(callId);
      setCallStatus('ended');

      // Upload recording if we have one
      if (uri) {
        await uploadRecording(uri);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
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
      // If no upload is happening and no result, close after 5 seconds
      if (!isUploading && !analysisResult && !uploadFailed) {
        const timer = setTimeout(() => {
          navigation.goBack();
        }, 5000);
        return () => clearTimeout(timer);
      }
    }
  }, [analysisResult, isUploading, uploadFailed, callStatus]);

  // Render call ended screen - just show upload status (analysis goes to admin)
  if (callStatus === 'ended') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.endedContent}>
          <Text style={styles.endedTitle}>Call Ended</Text>
          <Text style={styles.durationText}>Duration: {formatDuration(callDuration)}</Text>

          {isUploading && (
            <View style={styles.uploadingContainer}>
              <ActivityIndicator size="large" color="#5C9A9A" />
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

          {!isUploading && !analysisResult && !uploadFailed && (
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

  // Render active call screen
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Recording Indicator */}
        {isRecording && (
          <View style={styles.recordingIndicator}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingText}>Recording Your Voice</Text>
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
          
          {/* Instructions */}
          <View style={styles.instructionBox}>
            <Text style={styles.instructionTitle}>📱 Voice Call Instructions</Text>
            <Text style={styles.instructionText}>
              The admin will call your phone for voice chat.{"\n"}
              Your voice is being recorded for analysis.{"\n"}
              Speak naturally during the conversation.
            </Text>
          </View>
        </View>

        {/* Call Controls */}
        <View style={styles.controls}>
          {/* End Call Button */}
          <TouchableOpacity
            style={[styles.controlButton, styles.endCallButton]}
            onPress={handleEndCall}
            activeOpacity={0.7}
          >
            <Text style={styles.controlIcon}>📵</Text>
            <Text style={[styles.controlLabel, styles.endCallLabel]}>End Session</Text>
          </TouchableOpacity>
        </View>

        {/* Notice */}
        <View style={styles.noticeContainer}>
          <Text style={styles.noticeText}>
            🔴 Your voice is being recorded for intent analysis
          </Text>
        </View>
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
    backgroundColor: '#5C9A9A',
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
    color: '#5C9A9A',
  },
  instructionBox: {
    backgroundColor: 'rgba(92, 154, 154, 0.2)',
    borderRadius: 12,
    padding: 15,
    marginTop: 20,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: '#5C9A9A',
  },
  instructionTitle: {
    color: '#5C9A9A',
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
    color: '#5C9A9A',
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
    backgroundColor: '#5C9A9A',
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
