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
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system';
import { api, Question } from '../services/api';

type RouteParams = {
  InPersonInterview: {
    jobId: string;
    clientId: string;
    clientName: string;
    jobTitle: string;
    priorExperience?: string;
  };
};

export default function InPersonInterviewScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'InPersonInterview'>>();
  const { jobId, clientId, clientName, jobTitle, priorExperience } = route.params;

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  
  const [showConsent, setShowConsent] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  
  // Questions state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [questionsExpanded, setQuestionsExpanded] = useState(true);
  const [questionsError, setQuestionsError] = useState<string | null>(null);
  
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

  // Fetch AI-generated questions for Gate-2 interview
  useEffect(() => {
    const fetchQuestions = async () => {
      if (!jobTitle || !priorExperience) {
        console.log('Skipping questions fetch - missing job info');
        return;
      }
      
      setQuestionsLoading(true);
      setQuestionsError(null);
      
      try {
        const response = await api.generateQuestions(
          jobTitle,
          priorExperience,
          'gate2',  // Gate-2 is the formal interview
          5
        );
        
        if (response.success) {
          setQuestions(response.questions);
        }
      } catch (err: any) {
        console.error('Failed to fetch questions:', err);
        setQuestionsError(err.message || 'Failed to load questions');
      } finally {
        setQuestionsLoading(false);
      }
    };
    
    fetchQuestions();
  }, [jobTitle, priorExperience]);



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
    setAnalysisError(null);
    
    try {
      const durationSeconds = recordingTime;
      
      const result = await api.analyzeInterviewVideo(
        jobId,
        clientId,
        uri,
        durationSeconds
      );
      
      // Delete local video after successful analysis (privacy rule)
      try {
        await FileSystem.deleteAsync(uri, { idempotent: true });
        console.log('Local video deleted after successful analysis');
        setVideoUri(null);
      } catch (e) {
        console.warn('Failed to delete local video:', e);
      }
      
      // Navigate back after successful analysis
      navigation.goBack();
      
    } catch (error: any) {
      console.error('Analysis error:', error);
      setAnalysisError(error.message || 'Failed to analyze interview');
      // Keep videoUri for retry
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRetry = async () => {
    if (videoUri) {
      await analyzeVideo(videoUri);
    }
  };

  const handleDiscard = async () => {
    if (videoUri) {
      try {
        await FileSystem.deleteAsync(videoUri, { idempotent: true });
        console.log('Video discarded by user');
      } catch (e) {
        console.warn('Failed to delete discarded video:', e);
      }
    }
    setVideoUri(null);
    setAnalysisError(null);
    navigation.goBack();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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

  // Analyzing Screen
  if (isAnalyzing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.analyzingContainer}>
          <ActivityIndicator size="large" color="#27ae60" />
          <Text style={styles.analyzingText}>Analyzing Interview...</Text>
          <Text style={styles.analyzingSubtext}>
            Processing video with Gate 2 AI
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error Screen with Retry/Discard
  if (analysisError && videoUri) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Analysis Failed</Text>
          <Text style={styles.errorMessage}>{analysisError}</Text>
          <Text style={styles.errorSubtext}>
            The video is still saved. You can retry the analysis or discard it.
          </Text>
          
          <View style={styles.errorButtons}>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={handleRetry}
            >
              <Text style={styles.retryButtonText}>Retry Analysis</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.discardButton}
              onPress={handleDiscard}
            >
              <Text style={styles.discardButtonText}>Discard & Exit</Text>
            </TouchableOpacity>
          </View>
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

      {/* AI-Generated Questions Panel for Gate-2 Interview */}
      <View style={styles.questionsSection}>
        <TouchableOpacity 
          style={styles.questionsHeader}
          onPress={() => setQuestionsExpanded(!questionsExpanded)}
          activeOpacity={0.7}
        >
          <Text style={styles.questionsTitle}>📋 Interview Questions</Text>
          <Text style={styles.questionsToggle}>{questionsExpanded ? '▼' : '▶'}</Text>
        </TouchableOpacity>
        
        {questionsExpanded && (
          <ScrollView style={styles.questionsList} nestedScrollEnabled>
            {questionsLoading ? (
              <View style={styles.questionsLoadingContainer}>
                <ActivityIndicator size="small" color="#27ae60" />
                <Text style={styles.questionsLoadingText}>Generating questions...</Text>
              </View>
            ) : questionsError ? (
              <Text style={styles.questionsErrorText}>{questionsError}</Text>
            ) : questions.length > 0 ? (
              questions.map((q, index) => (
                <View key={index} style={styles.questionItem}>
                  <View style={styles.questionNumberBadge}>
                    <Text style={styles.questionNumber}>{index + 1}</Text>
                  </View>
                  <View style={styles.questionContent}>
                    <Text style={styles.questionText}>{q.question}</Text>
                    <Text style={styles.questionPurpose}>💡 {q.purpose}</Text>
                    {q.follow_up_hint && (
                      <Text style={styles.questionFollowUp}>↪ Follow-up: {q.follow_up_hint}</Text>
                    )}
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.noQuestionsText}>
                No questions available. Job details may be missing.
              </Text>
            )}
          </ScrollView>
        )}
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
    backgroundColor: '#27ae60',
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
    backgroundColor: '#27ae60',
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
  // Error Screen
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  errorIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#e74c3c',
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  errorButtons: {
    width: '100%',
    gap: 12,
  },
  retryButton: {
    backgroundColor: '#27ae60',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  discardButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e74c3c',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
  },
  discardButtonText: {
    color: '#e74c3c',
    fontSize: 16,
    fontWeight: '600',
  },

  // Questions panel styles
  questionsSection: {
    backgroundColor: 'rgba(92, 154, 154, 0.15)',
    borderRadius: 12,
    marginHorizontal: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(92, 154, 154, 0.3)',
    overflow: 'hidden',
  },
  questionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: 'rgba(92, 154, 154, 0.25)',
  },
  questionsTitle: {
    color: '#27ae60',
    fontSize: 13,
    fontWeight: 'bold',
  },
  questionsToggle: {
    color: '#27ae60',
    fontSize: 11,
  },
  questionsList: {
    maxHeight: 180,
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  questionsLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  questionsLoadingText: {
    color: '#27ae60',
    fontSize: 12,
    marginLeft: 8,
  },
  questionsErrorText: {
    color: '#e74c3c',
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 12,
  },
  questionItem: {
    flexDirection: 'row',
    marginTop: 8,
    alignItems: 'flex-start',
  },
  questionNumberBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#27ae60',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  questionNumber: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  questionContent: {
    flex: 1,
  },
  questionText: {
    color: '#fff',
    fontSize: 12,
    lineHeight: 16,
  },
  questionPurpose: {
    color: '#8BC4C4',
    fontSize: 10,
    marginTop: 3,
    fontStyle: 'italic',
  },
  questionFollowUp: {
    color: '#6BA3A3',
    fontSize: 10,
    marginTop: 2,
  },
  noQuestionsText: {
    color: '#999',
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 12,
  },
});
