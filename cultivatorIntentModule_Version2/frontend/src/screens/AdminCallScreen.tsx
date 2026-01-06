/**
 * Admin Call Screen - Audio call interface for admin with analysis results
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
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { api, AnalysisResult } from '../services/api';

interface RouteParams {
  callId: string;
  roomName: string;
  livekitUrl: string;
  token: string;
  clientUsername?: string;
  jobTitle?: string;
}

export default function AdminCallScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { callId, roomName, livekitUrl, token, clientUsername, jobTitle } = route.params as RouteParams;

  const [callStatus, setCallStatus] = useState<'connecting' | 'ringing' | 'connected' | 'ended'>('connecting');
  const [callDuration, setCallDuration] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [waitingForAnalysis, setWaitingForAnalysis] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Connect and start polling for status
  useEffect(() => {
    setCallStatus('ringing');
    console.log('Admin connecting to room:', roomName);
    startStatusPolling();

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

  const cleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (pollRef.current) clearInterval(pollRef.current);
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

    setTimeout(() => {
      clearInterval(analysisPoll);
      setWaitingForAnalysis(false);
    }, 60000);
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
      // End the call on backend
      await api.endCall(callId);
      setCallStatus('ended');
      cleanup();
      setWaitingForAnalysis(true);
      pollForAnalysis();
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
    switch (intent) {
      case 'high_intent': return '#27ae60';
      case 'medium_intent': return '#f39c12';
      case 'low_intent': return '#e67e22';
      case 'no_intent': return '#e74c3c';
      default: return '#95a5a6';
    }
  };

  const getIntentLabel = (intent: string): string => {
    switch (intent) {
      case 'high_intent': return 'High Interest';
      case 'medium_intent': return 'Moderate Interest';
      case 'low_intent': return 'Low Interest';
      case 'no_intent': return 'No Interest';
      default: return 'Unknown';
    }
  };

  // Render ended screen with analysis
  if (callStatus === 'ended') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.endedContent}>
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

          {!waitingForAnalysis && !analysisResult && (
            <View style={styles.noAnalysisContainer}>
              <Text style={styles.noAnalysisText}>No analysis available</Text>
              <Text style={styles.noAnalysisSubtext}>Client may not have uploaded the recording</Text>
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
              <Text style={styles.instructionTitle}>📱 Voice Call Instructions</Text>
              <Text style={styles.instructionText}>
                Call the client on their phone for voice chat.{"\n"}
                Their voice is being recorded for analysis.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.controlButton, styles.endCallButton]}
            onPress={handleEndCall}
            activeOpacity={0.7}
          >
            <Text style={styles.controlIcon}>📵</Text>
            <Text style={[styles.controlLabel, styles.endCallLabel]}>End Session</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.noticeContainer}>
          <Text style={styles.noticeText}>🎙️ Client's voice is being recorded for intent analysis</Text>
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
});
