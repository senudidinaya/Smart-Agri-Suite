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
import { api, AnalysisResult, AgoraTokenInfo, InsightResponse } from '../services/api';
import { useAgora, AgoraConfig } from '../hooks/useAgora';

interface RouteParams {
  callId: string;
  clientUsername?: string;
  jobTitle?: string;
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
  const { callId, clientUsername, jobTitle, agora } = route.params as RouteParams;

  const [callStatus, setCallStatus] = useState<'connecting' | 'ringing' | 'connected' | 'ended'>('connecting');
  const [callDuration, setCallDuration] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [waitingForAnalysis, setWaitingForAnalysis] = useState(false);
  const [isCloudRecording, setIsCloudRecording] = useState(false);
  const [deepseekInsight, setDeepseekInsight] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

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

  // Fetch DeepSeek insight when analysis results arrive
  useEffect(() => {
    if (!analysisResult) return;
    const fetchInsight = async () => {
      setInsightLoading(true);
      try {
        const scores: Record<string, number> = {};
        if (analysisResult.scores) {
          for (const [label, score] of Object.entries(analysisResult.scores)) {
            scores[label] = score * 100;
          }
        }
        const res = await api.getGate1Insight(
          analysisResult.intentLabel,
          analysisResult.confidence * 100,
          scores,
        );
        if (res.success) {
          setDeepseekInsight(res.insight);
        }
      } catch (err) {
        console.error('Failed to fetch DeepSeek insight:', err);
      } finally {
        setInsightLoading(false);
      }
    };
    fetchInsight();
  }, [analysisResult]);

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
        
        if (response.status === 'accepted' && callStatus !== 'connected' && callStatus !== 'ended') {
          setCallStatus('connected');
        } else if (response.status === 'ended' || response.status === 'rejected') {
          setCallStatus('ended');
          cleanup();
          
          if (response.analysis) {
            setAnalysisResult(response.analysis);
          } else if (response.status === 'ended') {
            setWaitingForAnalysis(true);
            pollForAnalysis();
          }
        }
      } catch (error) {
        console.debug('Status poll error:', error);
      }
    }, 2000);
  };

  const pollForAnalysis = () => {
    const analysisPoll = setInterval(async () => {
      try {
        const response = await api.getCallStatus(callId);
        if (response.analysis) {
          setAnalysisResult(response.analysis);
          setWaitingForAnalysis(false);
          clearInterval(analysisPoll);
        }
      } catch (error) {
        console.debug('Analysis poll error:', error);
      }
    }, 3000);

    // Wait up to 5 minutes (300 seconds) for analysis
    // Matches client-side upload timeout which can take time on slow networks
    setTimeout(() => {
      clearInterval(analysisPoll);
      setWaitingForAnalysis(false);
    }, 300000);
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
      setCallStatus('ended');
      cleanup();
      
      // Start polling for analysis but allow admin to leave
      // Analysis runs in background and will be available in "View Analysis" section
      setWaitingForAnalysis(true);
      pollForAnalysis();
      
      // Auto-close after 3 seconds
      // Admin can view analysis later in the job's "View Analysis" section
      setTimeout(() => {
        navigation.goBack();
      }, 3000);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleClose = () => {
    cleanup();
    navigation.goBack();
  };

  const getStatusText = () => {
    switch (callStatus) {
      case 'connecting': return 'Connecting...';
      case 'ringing': return 'Calling client...';
      case 'connected': return formatDuration(callDuration);
      case 'ended': return 'Call Ended';
      default: return '';
    }
  };

  const getIntentColor = (intent: string): string => {
    const normalized = intent.toUpperCase();
    switch (normalized) {
      case 'PROCEED':
      case 'HIGH_INTENT':
        return '#27ae60'; // Green - positive
      case 'VERIFY':
      case 'MEDIUM_INTENT':
        return '#f39c12'; // Orange - needs verification
      case 'REJECT':
      case 'LOW_INTENT':
      case 'NO_INTENT':
        return '#e74c3c'; // Red - negative
      default:
        return '#95a5a6'; // Gray - unknown
    }
  };

  const getIntentLabel = (intent: string): string => {
    const normalized = intent.toUpperCase();
    switch (normalized) {
      case 'PROCEED':
        return 'Proceed';
      case 'VERIFY':
        return 'Verify';
      case 'REJECT':
        return 'Reject';
      case 'HIGH_INTENT':
        return 'High Interest';
      case 'MEDIUM_INTENT':
        return 'Moderate Interest';
      case 'LOW_INTENT':
        return 'Low Interest';
      case 'NO_INTENT':
        return 'No Interest';
      default:
        return intent; // Return original if not mapped
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

  // Render ended screen with analysis
  if (callStatus === 'ended') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.endedContent}>
          <Text style={styles.endedTitle}>Call Ended</Text>
          <Text style={styles.callerInfo}>With: {clientUsername || 'Client'}</Text>
          <Text style={styles.durationText}>Duration: {formatDuration(callDuration)}</Text>

          {waitingForAnalysis && !analysisResult && (
            <View style={styles.waitingContainer}>
              <ActivityIndicator size="large" color="#5C9A9A" />
              <Text style={styles.waitingText}>Waiting for voice analysis...</Text>
              <Text style={styles.waitingSubtext}>Client is uploading the recording</Text>
            </View>
          )}

          {analysisResult && (
            <View style={styles.analysisContainer}>
              <Text style={styles.analysisTitle}>🎯 Voice Intent Analysis</Text>
              <View style={[styles.intentBadge, { backgroundColor: getIntentColor(analysisResult.intentLabel) }]}>
                <Text style={styles.intentText}>{getIntentLabel(analysisResult.intentLabel)}</Text>
              </View>
              <Text style={styles.confidenceText}>
                Confidence: {(analysisResult.confidence * 100).toFixed(1)}%
              </Text>
              {analysisResult.scores && Object.keys(analysisResult.scores).length > 0 && (
                <View style={styles.scoresContainer}>
                  <Text style={styles.scoresTitle}>All Scores:</Text>
                  {Object.entries(analysisResult.scores).map(([label, score]) => (
                    <View key={label} style={styles.scoreRow}>
                      <Text style={styles.scoreLabel}>{getIntentLabel(label)}:</Text>
                      <View style={styles.scoreBarContainer}>
                        <View style={[styles.scoreBar, { width: `${score * 100}%`, backgroundColor: getIntentColor(label) }]} />
                      </View>
                      <Text style={styles.scoreValue}>{(score * 100).toFixed(1)}%</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* DeepSeek Insight Card */}
          {analysisResult && (
            <View style={styles.insightContainer}>
              <Text style={styles.insightTitle}>🧠 Deepseek Insight</Text>
              {insightLoading ? (
                <View style={styles.insightLoadingContainer}>
                  <ActivityIndicator size="small" color="#8B5CF6" />
                  <Text style={styles.insightLoadingText}>Generating AI insight...</Text>
                </View>
              ) : deepseekInsight ? (
                <Text style={styles.insightText}>{deepseekInsight}</Text>
              ) : (
                <Text style={styles.insightErrorText}>Insight unavailable. Tap to retry.</Text>
              )}
            </View>
          )}

          {!waitingForAnalysis && !analysisResult && (
            <View style={styles.noAnalysisContainer}>
              <Text style={styles.noAnalysisText}>No analysis available</Text>
              <Text style={styles.noAnalysisSubtext}>Client may not have uploaded the recording</Text>
            </View>
          )}

          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

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
    marginBottom: 5,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  clientName: {
    fontSize: 16,
    color: '#5C9A9A',
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
    color: '#5C9A9A',
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
    marginBottom: 5,
  },
  callerInfo: {
    fontSize: 16,
    color: '#5C9A9A',
    marginBottom: 5,
  },
  durationText: {
    fontSize: 14,
    color: '#999',
    marginBottom: 30,
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
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    width: '100%',
    marginVertical: 20,
  },
  analysisTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  intentBadge: {
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 25,
    marginBottom: 10,
  },
  intentText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  confidenceText: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 15,
  },
  scoresContainer: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    paddingTop: 15,
  },
  scoresTitle: {
    color: '#999',
    fontSize: 12,
    marginBottom: 10,
    textAlign: 'center',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
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
    borderRadius: 15,
    padding: 18,
    width: '100%',
    marginBottom: 10,
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
});
