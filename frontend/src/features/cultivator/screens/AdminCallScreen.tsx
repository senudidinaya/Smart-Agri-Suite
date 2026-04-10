/**
 * Admin Call Screen - Audio call interface with Agora RTC and analysis results
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
  ScrollView,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { api, AgoraTokenInfo, Question, QuestionGenerationResponse } from '../services/api';
import { useAgora, AgoraConfig } from '../hooks/useAgora';

interface RouteParams {
  callId: string;
  clientUsername?: string;
  jobTitle?: string;
  priorExperience?: string;
  // Agora connection info
  agora?: AgoraTokenInfo;
  // Legacy fields
  roomName?: string;
  livekitUrl?: string;
  token?: string;
}

export default function AdminCallScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { callId, clientUsername, jobTitle, priorExperience, agora } = route.params as RouteParams;

  const [callStatus, setCallStatus] = useState<'connecting' | 'ringing' | 'connected'>('connecting');
  const [callDuration, setCallDuration] = useState(0);
  const [isCloudRecording, setIsCloudRecording] = useState(false);
  
  // Questions state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [questionsExpanded, setQuestionsExpanded] = useState(true);
  const [questionsError, setQuestionsError] = useState<string | null>(null);
  
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
  } = useAgora(agoraConfig);

  // Join Agora channel and start polling
  useEffect(() => {
    const setup = async () => {
      if (!agoraConfig) {
        Alert.alert('Error', 'No call configuration received');
        navigation.goBack();
        return;
      }

      console.log('Admin joining Agora channel:', agoraConfig.channelName);
      
      const joined = await joinChannel();
      if (!joined) {
        Alert.alert('Error', 'Failed to start the call. Please try again.');
        navigation.goBack();
        return;
      }

      setCallStatus('ringing');
      startStatusPolling();
    };

    setup();

    return () => {
      cleanup();
    };
  }, []);

  // Update status when client joins
  useEffect(() => {
    if (agoraState.remoteUsers.length > 0 && callStatus === 'ringing') {
      setCallStatus('connected');
      // Optionally start cloud recording when call connects
      startCloudRecordingIfAvailable();
    }
  }, [agoraState.remoteUsers.length]);

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

  // Fetch AI-generated questions when call is initiated
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
          'gate1',  // Gate-1 is the introductory call
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

  const cleanup = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (pollRef.current) clearInterval(pollRef.current);
    await leaveChannel();
  };

  const startCloudRecordingIfAvailable = async () => {
    try {
      const result = await api.startCloudRecording(callId);
      if (result.success) {
        setIsCloudRecording(true);
        console.log('Cloud recording started');
      }
    } catch (error) {
      console.log('Cloud recording not available, using client-side recording');
    }
  };

  const stopCloudRecordingIfActive = async () => {
    if (!isCloudRecording) return;
    try {
      await api.stopCloudRecording(callId);
      setIsCloudRecording(false);
      console.log('Cloud recording stopped');
    } catch (error) {
      console.error('Failed to stop cloud recording:', error);
    }
  };

  const startStatusPolling = () => {
    pollRef.current = setInterval(async () => {
      try {
        const response = await api.getCallStatus(callId);
        
        if (response.status === 'accepted' && callStatus !== 'connected') {
          setCallStatus('connected');
        } else if (response.status === 'ended' || response.status === 'rejected') {
          await cleanup();
          navigation.goBack();
        }
      } catch (error) {
        console.debug('Status poll error:', error);
      }
    }, 2000);
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
    try {
      // Stop cloud recording if active
      await stopCloudRecordingIfActive();
      
      // Leave Agora channel
      await leaveChannel();
      
      // End the call on backend
      await api.endCall(callId);
      
      // Clean up timers and navigate back immediately
      // Analysis runs in background and is accessible later via View Analysis
      await cleanup();
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const getStatusText = () => {
    switch (callStatus) {
      case 'connecting': return 'Connecting...';
      case 'ringing': return 'Calling client...';
      case 'connected': return formatDuration(callDuration);
      default: return '';
    }
  };

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

        {/* Cloud Recording Indicator */}
        {isCloudRecording && (
          <View style={styles.recordingIndicator}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingText}>Cloud Recording</Text>
          </View>
        )}

        <View style={styles.callInfo}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>📞</Text>
          </View>
          <Text style={styles.jobTitle}>{jobTitle || 'Client Call'}</Text>
          <Text style={styles.clientName}>{clientUsername || 'Client'}</Text>
          <Text style={styles.statusText}>{getStatusText()}</Text>
          
          {callStatus === 'ringing' && (
            <Text style={styles.waitingText}>Waiting for client to accept...</Text>
          )}
          
          {callStatus === 'connected' && (
            <View style={styles.instructionBox}>
              <Text style={styles.instructionTitle}>🎙️ Voice Call Active</Text>
              <Text style={styles.instructionText}>
                You are now connected via voice.{"\n"}
                Client's voice is being recorded for analysis.
              </Text>
            </View>
          )}
        </View>

        {/* AI-Generated Questions Panel */}
        {(callStatus === 'ringing' || callStatus === 'connected') && (
          <View style={styles.questionsSection}>
            <TouchableOpacity 
              style={styles.questionsHeader}
              onPress={() => setQuestionsExpanded(!questionsExpanded)}
              activeOpacity={0.7}
            >
              <Text style={styles.questionsTitle}>📋 Suggested Questions</Text>
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
        )}

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
            activeOpacity={0.7}
          >
            <Text style={styles.controlIcon}>📵</Text>
            <Text style={[styles.controlLabel, styles.endCallLabel]}>End Call</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.noticeContainer}>
          <Text style={styles.noticeText}>🎙️ Client's voice is being recorded for intent analysis</Text>
        </View>

        {/* Error Display */}
        {agoraState.error && (
          <View style={styles.errorNotice}>
            <Text style={styles.errorNoticeText}>{agoraState.error}</Text>
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
  callInfo: {
    alignItems: 'center',
    paddingTop: 20,
  },
  connectionIndicator: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  connectionText: {
    fontSize: 12,
    fontWeight: '600',
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
    marginBottom: 5,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  clientName: {
    fontSize: 16,
    color: '#27ae60',
    marginBottom: 10,
  },
  statusText: {
    fontSize: 20,
    color: '#fff',
    marginTop: 10,
  },
  waitingText: {
    fontSize: 14,
    color: '#999',
    marginTop: 10,
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
    color: '#27ae60',
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
    alignItems: 'stretch',
    paddingHorizontal: 20,
    paddingTop: 36,
    paddingBottom: 28,
  },
  endedTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
    textAlign: 'center',
  },
  callerInfo: {
    fontSize: 16,
    color: '#27ae60',
    marginBottom: 5,
    textAlign: 'center',
  },
  durationText: {
    fontSize: 14,
    color: '#999',
    marginBottom: 30,
    textAlign: 'center',
  },
  waitingContainer: {
    alignItems: 'center',
    marginVertical: 30,
  },
  waitingSubtext: {
    color: '#666',
    fontSize: 12,
    marginTop: 5,
  },
  analysisContainer: {
    backgroundColor: 'rgba(255,255,255,0.11)',
    borderRadius: 18,
    padding: 18,
    alignItems: 'stretch',
    width: '100%',
    marginVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  analysisTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 18,
    textAlign: 'center',
  },
  intentBadge: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 24,
    marginBottom: 12,
    alignSelf: 'center',
  },
  intentText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  confidenceText: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: 20,
  },
  helperText: {
    color: '#b8b8b8',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  scoresContainer: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    padding: 14,
  },
  scoresTitle: {
    color: '#999',
    fontSize: 12,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
  },
  scoreLabel: {
    color: '#ccc',
    fontSize: 12,
    width: 100,
  },
  scoreBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    marginHorizontal: 10,
  },
  scoreBar: {
    height: '100%',
    borderRadius: 4,
  },
  scoreValue: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    width: 45,
    textAlign: 'right',
  },
  noAnalysisContainer: {
    alignItems: 'center',
    marginVertical: 30,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 20,
  },
  noAnalysisText: {
    color: '#999',
    fontSize: 16,
  },
  noAnalysisSubtext: {
    color: '#666',
    fontSize: 12,
    marginTop: 5,
  },
  closeButton: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 12,
    marginTop: 20,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
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
  errorNotice: {
    backgroundColor: 'rgba(231, 76, 60, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 15,
    marginHorizontal: 20,
    borderRadius: 8,
    marginTop: 10,
  },
  errorNoticeText: {
    color: '#e74c3c',
    fontSize: 12,
    textAlign: 'center',
  },
  // DeepSeek Insight styles
  insightContainer: {
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    borderRadius: 18,
    padding: 18,
    width: '100%',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#C4B5FD',
    marginBottom: 10,
  },
  insightText: {
    fontSize: 14,
    color: '#E0E0E0',
    lineHeight: 22,
  },
  insightLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  insightLoadingText: {
    color: '#C4B5FD',
    fontSize: 13,
    marginLeft: 10,
  },
  insightErrorText: {
    color: '#999',
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  // Questions panel styles
  questionsSection: {
    marginHorizontal: 15,
    marginVertical: 10,
    backgroundColor: 'rgba(92, 154, 154, 0.15)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(92, 154, 154, 0.3)',
    overflow: 'hidden',
  },
  questionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(92, 154, 154, 0.2)',
  },
  questionsTitle: {
    color: '#27ae60',
    fontSize: 14,
    fontWeight: 'bold',
  },
  questionsToggle: {
    color: '#27ae60',
    fontSize: 12,
  },
  questionsList: {
    maxHeight: 200,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  questionsLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
  },
  questionsLoadingText: {
    color: '#27ae60',
    fontSize: 13,
    marginLeft: 10,
  },
  questionsErrorText: {
    color: '#e74c3c',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 15,
  },
  questionItem: {
    flexDirection: 'row',
    marginTop: 10,
    alignItems: 'flex-start',
  },
  questionNumberBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#27ae60',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  questionNumber: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  questionContent: {
    flex: 1,
  },
  questionText: {
    color: '#fff',
    fontSize: 13,
    lineHeight: 18,
  },
  questionPurpose: {
    color: '#8BC4C4',
    fontSize: 11,
    marginTop: 4,
    fontStyle: 'italic',
  },
  questionFollowUp: {
    color: '#6BA3A3',
    fontSize: 11,
    marginTop: 3,
  },
  noQuestionsText: {
    color: '#999',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 15,
  },
});
