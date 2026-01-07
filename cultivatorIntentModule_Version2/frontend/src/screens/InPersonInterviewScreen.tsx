/**
 * In-Person Interview Screen
 * 
 * Admin records a video interview with consent, uploads for analysis,
 * and receives APPROVE/VERIFY/REJECT decision.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system';
import { api, InterviewAnalyzeResponse } from '../services/api';

type RouteParams = {
  InPersonInterview: {
    jobId: string;
    clientId: string;
    clientName: string;
    jobTitle: string;
  };
};

export default function InPersonInterviewScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'InPersonInterview'>>();
  const { jobId, clientId, clientName, jobTitle } = route.params;

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  
  const [showConsent, setShowConsent] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<InterviewAnalyzeResponse | null>(null);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  
  const cameraRef = useRef<CameraView>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingStartTime = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const requestPermissions = async () => {
    if (!cameraPermission?.granted) {
      await requestCameraPermission();
    }
    if (!micPermission?.granted) {
      await requestMicPermission();
    }
  };

  useEffect(() => {
    requestPermissions();
  }, []);

  const handleConsentAgree = () => {
    if (!cameraPermission?.granted || !micPermission?.granted) {
      Alert.alert(
        'Permissions Required',
        'Camera and microphone permissions are required to record the interview.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Grant Permissions', onPress: requestPermissions },
        ]
      );
      return;
    }
    setShowConsent(false);
  };

  const handleConsentDecline = () => {
    Alert.alert(
      'Interview Cancelled',
      'You must agree to the recording consent to proceed with the interview.',
      [{ text: 'OK', onPress: () => navigation.goBack() }]
    );
  };

  const startRecording = async () => {
    if (!cameraRef.current) return;

    try {
      setIsRecording(true);
      recordingStartTime.current = Date.now();
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(Math.floor((Date.now() - recordingStartTime.current) / 1000));
      }, 1000);

      const video = await cameraRef.current.recordAsync({
        maxDuration: 300, // 5 minutes max
      });

      if (video?.uri) {
        setVideoUri(video.uri);
        await analyzeVideo(video.uri);
      }
    } catch (error: any) {
      console.error('Recording error:', error);
      Alert.alert('Recording Error', error.message || 'Failed to record video');
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (cameraRef.current) {
      cameraRef.current.stopRecording();
    }
    
    setIsRecording(false);
  };

  const analyzeVideo = async (uri: string) => {
    setIsAnalyzing(true);
    
    try {
      const durationSeconds = recordingTime;
      
      const result = await api.analyzeInterviewVideo(
        jobId,
        clientId,
        uri,
        durationSeconds
      );
      
      setAnalysisResult(result);
      
      // Delete local video after successful analysis
      try {
        await FileSystem.deleteAsync(uri, { idempotent: true });
        console.log('Local video deleted after analysis');
      } catch (e) {
        console.warn('Failed to delete local video:', e);
      }
      
    } catch (error: any) {
      console.error('Analysis error:', error);
      Alert.alert('Analysis Error', error.message || 'Failed to analyze interview');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getDecisionColor = (decision: string) => {
    switch (decision) {
      case 'APPROVE':
        return '#27ae60';
      case 'REJECT':
        return '#e74c3c';
      case 'VERIFY':
        return '#f39c12';
      default:
        return '#666';
    }
  };

  const getDecisionIcon = (decision: string) => {
    switch (decision) {
      case 'APPROVE':
        return '✅';
      case 'REJECT':
        return '❌';
      case 'VERIFY':
        return '⚠️';
      default:
        return '❓';
    }
  };

  const handleDone = () => {
    navigation.goBack();
  };

  // Consent Modal
  if (showConsent) {
    return (
      <SafeAreaView style={styles.container}>
        <Modal visible={true} transparent animationType="fade">
          <View style={styles.consentOverlay}>
            <View style={styles.consentCard}>
              <Text style={styles.consentIcon}>🎥</Text>
              <Text style={styles.consentTitle}>Recording Consent</Text>
              
              <View style={styles.consentContent}>
                <Text style={styles.consentText}>
                  This interview will be recorded for verification and safety analysis.
                </Text>
                <Text style={styles.consentSubtext}>
                  The video will be analyzed automatically and will not be stored permanently.
                  Only the analysis results will be saved.
                </Text>
              </View>
              
              <View style={styles.interviewInfo}>
                <Text style={styles.infoLabel}>Client:</Text>
                <Text style={styles.infoValue}>{clientName}</Text>
                <Text style={styles.infoLabel}>Job:</Text>
                <Text style={styles.infoValue}>{jobTitle}</Text>
              </View>
              
              <View style={styles.consentButtons}>
                <TouchableOpacity 
                  style={styles.declineButton}
                  onPress={handleConsentDecline}
                >
                  <Text style={styles.declineButtonText}>Decline</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.agreeButton}
                  onPress={handleConsentAgree}
                >
                  <Text style={styles.agreeButtonText}>I Agree & Start Recording</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // Analysis Result Screen
  if (analysisResult) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.resultContainer}>
          <Text style={styles.resultIcon}>
            {getDecisionIcon(analysisResult.decision)}
          </Text>
          
          <Text style={[
            styles.resultDecision,
            { color: getDecisionColor(analysisResult.decision) }
          ]}>
            {analysisResult.decision}
          </Text>
          
          <View style={styles.confidenceContainer}>
            <Text style={styles.confidenceLabel}>Confidence</Text>
            <Text style={styles.confidenceValue}>
              {(analysisResult.confidence * 100).toFixed(1)}%
            </Text>
          </View>
          
          <View style={styles.reasonsContainer}>
            <Text style={styles.reasonsTitle}>Analysis Reasons:</Text>
            {analysisResult.reasons.map((reason, index) => (
              <View key={index} style={styles.reasonItem}>
                <Text style={styles.reasonBullet}>•</Text>
                <Text style={styles.reasonText}>{reason}</Text>
              </View>
            ))}
          </View>
          
          <View style={styles.statusContainer}>
            <Text style={styles.statusLabel}>Application Status:</Text>
            <Text style={styles.statusValue}>
              {analysisResult.applicationStatus.toUpperCase().replace('_', ' ')}
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.doneButton}
            onPress={handleDone}
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Analyzing Screen
  if (isAnalyzing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.analyzingContainer}>
          <ActivityIndicator size="large" color="#5C9A9A" />
          <Text style={styles.analyzingText}>Analyzing Interview...</Text>
          <Text style={styles.analyzingSubtext}>
            Please wait while we process the video
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Recording Screen
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          disabled={isRecording}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>In-Person Interview</Text>
      </View>
      
      <View style={styles.cameraContainer}>
        {cameraPermission?.granted && micPermission?.granted ? (
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing="front"
            mode="video"
          />
        ) : (
          <View style={styles.noCameraContainer}>
            <Text style={styles.noCameraText}>
              Camera permissions required
            </Text>
            <TouchableOpacity 
              style={styles.grantButton}
              onPress={requestPermissions}
            >
              <Text style={styles.grantButtonText}>Grant Permissions</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {isRecording && (
          <View style={styles.recordingOverlay}>
            <View style={styles.recordingIndicator}>
              <View style={styles.recordingDot} />
              <Text style={styles.recordingText}>REC</Text>
            </View>
            <Text style={styles.timerText}>{formatTime(recordingTime)}</Text>
          </View>
        )}
      </View>
      
      <View style={styles.interviewDetails}>
        <Text style={styles.detailLabel}>Interviewing:</Text>
        <Text style={styles.detailValue}>{clientName}</Text>
        <Text style={styles.detailLabel}>For Job:</Text>
        <Text style={styles.detailValue}>{jobTitle}</Text>
      </View>
      
      <View style={styles.controls}>
        {!isRecording ? (
          <TouchableOpacity 
            style={styles.recordButton}
            onPress={startRecording}
          >
            <View style={styles.recordButtonInner} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={styles.stopButton}
            onPress={stopRecording}
          >
            <View style={styles.stopButtonInner} />
          </TouchableOpacity>
        )}
        
        <Text style={styles.recordHint}>
          {isRecording ? 'Tap to stop recording' : 'Tap to start recording'}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#1a1a1a',
  },
  backButton: {
    padding: 5,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  headerTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginRight: 50,
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  noCameraContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#333',
  },
  noCameraText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 15,
  },
  grantButton: {
    backgroundColor: '#5C9A9A',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  grantButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  recordingOverlay: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#e74c3c',
    marginRight: 5,
  },
  recordingText: {
    color: '#e74c3c',
    fontSize: 14,
    fontWeight: '600',
  },
  timerText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 15,
  },
  interviewDetails: {
    backgroundColor: '#1a1a1a',
    padding: 15,
  },
  detailLabel: {
    color: '#999',
    fontSize: 12,
    marginBottom: 2,
  },
  detailValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 10,
  },
  controls: {
    backgroundColor: '#1a1a1a',
    paddingVertical: 30,
    alignItems: 'center',
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#e74c3c',
  },
  stopButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopButtonInner: {
    width: 30,
    height: 30,
    borderRadius: 4,
    backgroundColor: '#e74c3c',
  },
  recordHint: {
    color: '#999',
    fontSize: 14,
    marginTop: 15,
  },
  // Consent Modal
  consentOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  consentCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 25,
    width: '100%',
    maxWidth: 400,
  },
  consentIcon: {
    fontSize: 50,
    textAlign: 'center',
    marginBottom: 15,
  },
  consentTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  consentContent: {
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  consentText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    marginBottom: 10,
  },
  consentSubtext: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  interviewInfo: {
    marginBottom: 20,
  },
  infoLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    marginBottom: 10,
  },
  consentButtons: {
    flexDirection: 'column',
    gap: 10,
  },
  declineButton: {
    backgroundColor: '#f5f5f5',
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
  },
  declineButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  agreeButton: {
    backgroundColor: '#5C9A9A',
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
  },
  agreeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Analyzing Screen
  analyzingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  analyzingText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 20,
  },
  analyzingSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
  },
  // Result Screen
  resultContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  resultDecision: {
    fontSize: 36,
    fontWeight: '700',
    marginBottom: 20,
  },
  confidenceContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  confidenceLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  confidenceValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
  },
  reasonsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    width: '100%',
    marginBottom: 20,
  },
  reasonsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  reasonItem: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  reasonBullet: {
    fontSize: 14,
    color: '#5C9A9A',
    marginRight: 8,
  },
  reasonText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  statusContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    width: '100%',
    alignItems: 'center',
    marginBottom: 30,
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  statusValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#5C9A9A',
  },
  doneButton: {
    backgroundColor: '#5C9A9A',
    paddingVertical: 15,
    paddingHorizontal: 50,
    borderRadius: 25,
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
