/**
 * View Analysis Screen - Display all completed call and interview analyses for a job
 * Shows both Gate-1 (voice intent) and Gate-2 (video emotion) analyses
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { api, CallStatusResponse, Interview, DeceptionAnalysis } from '../services/api';

interface RouteParams {
  jobId: string;
  jobTitle: string;
}

export default function ViewAnalysisScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { jobId, jobTitle } = route.params as RouteParams;

  const [callAnalyses, setCallAnalyses] = useState<CallStatusResponse[]>([]);
  const [interviewAnalyses, setInterviewAnalyses] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all analyses for the job
  const fetchAnalyses = async () => {
    try {
      setError(null);
      const [callResult, interviewResult] = await Promise.all([
        api.getJobCallAnalyses(jobId).catch(() => ({ analyses: [] })),
        api.getJobInterviewAnalyses(jobId).catch(() => ({ analyses: [] })),
      ]);
      setCallAnalyses(callResult.analyses);
      setInterviewAnalyses(interviewResult.analyses);
    } catch (err: any) {
      setError(err.message || 'Failed to load analyses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyses();
  }, [jobId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAnalyses();
    setRefreshing(false);
  };

  const getIntentColor = (intent: string): string => {
    const normalized = intent.toUpperCase();
    switch (normalized) {
      case 'PROCEED':
      case 'HIGH_INTENT':
        return '#27ae60'; // Green
      case 'VERIFY':
      case 'MEDIUM_INTENT':
        return '#f39c12'; // Orange
      case 'REJECT':
      case 'LOW_INTENT':
      case 'NO_INTENT':
        return '#e74c3c'; // Red
      default:
        return '#95a5a6'; // Gray
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
        return intent;
    }
  };

  const getDecisionColor = (decision: string): string => {
    const normalized = decision.toUpperCase();
    switch (normalized) {
      case 'APPROVE':
        return '#27ae60'; // Green
      case 'VERIFY':
        return '#f39c12'; // Orange
      case 'REJECT':
        return '#e74c3c'; // Red
      default:
        return '#95a5a6'; // Gray
    }
  };

  const getDeceptionColor = (label: string): string => {
    const normalized = label.toLowerCase();
    if (normalized === 'truthful') {
      return '#27ae60'; // Green
    } else if (normalized === 'deceptive') {
      return '#e74c3c'; // Red
    }
    return '#95a5a6'; // Gray
  };

  const getDeceptionLabel = (label: string): string => {
    const normalized = label.toLowerCase();
    return normalized === 'truthful' ? 'Truthful' : normalized === 'deceptive' ? 'Deceptive' : label;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#27ae60" />
          <Text style={styles.loadingText}>Loading analyses...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const hasAnyAnalysis = callAnalyses.length > 0 || interviewAnalyses.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Analysis Results</Text>
          <Text style={styles.jobTitle}>{jobTitle}</Text>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {!hasAnyAnalysis && !error && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No analyses yet</Text>
            <Text style={styles.emptySubtext}>
              Analyses will appear here after calls and interviews are completed.
            </Text>
          </View>
        )}

        {/* Gate-1: Voice Intent Analyses */}
        {callAnalyses.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎙️ Voice Intent Analyses (Gate-1)</Text>
            {callAnalyses.map((call, index) => (
              call.analysis && (
                <View key={`call-${index}`} style={styles.analysisCard}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>Call {index + 1}</Text>
                    <View style={[styles.intentBadge, { backgroundColor: getIntentColor(call.analysis.intentLabel) }]}>
                      <Text style={styles.badgeText}>
                        {getIntentLabel(call.analysis.intentLabel)}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.confidenceText}>
                    Confidence: {(call.analysis.confidence * 100).toFixed(1)}%
                  </Text>

                  {call.analysis.scores && Object.keys(call.analysis.scores).length > 0 && (
                    <View style={styles.scoresContainer}>
                      <Text style={styles.scoresTitle}>Intent Scores:</Text>
                      {Object.entries(call.analysis.scores).map(([label, score]) => (
                        <View key={label} style={styles.scoreRow}>
                          <Text style={styles.scoreLabel}>{getIntentLabel(label)}:</Text>
                          <View style={styles.scoreBarContainer}>
                            <View
                              style={[
                                styles.scoreBar,
                                {
                                  width: `${score * 100}%`,
                                  backgroundColor: getIntentColor(label),
                                },
                              ]}
                            />
                          </View>
                          <Text style={styles.scoreValue}>{(score * 100).toFixed(1)}%</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )
            ))}
          </View>
        )}

        {/* Gate-2: Video Emotion Analyses */}
        {interviewAnalyses.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎥 Video Emotion Analyses (Gate-2)</Text>
            {interviewAnalyses.map((interview, index) => (
              <View key={`interview-${index}`} style={styles.analysisCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>Interview {index + 1}</Text>
                  {interview.analysisDecision && (
                    <View style={[styles.decisionBadge, { backgroundColor: getDecisionColor(interview.analysisDecision) }]}>
                      <Text style={styles.badgeText}>{interview.analysisDecision}</Text>
                    </View>
                  )}
                </View>

                {interview.confidence && (
                  <Text style={styles.confidenceText}>
                    Confidence: {(interview.confidence * 100).toFixed(1)}%
                  </Text>
                )}

                {interview.dominant_emotion && (
                  <View style={styles.emotionContainer}>
                    <Text style={styles.emotionLabel}>Dominant Emotion:</Text>
                    <Text style={styles.emotionValue}>{interview.dominant_emotion}</Text>
                  </View>
                )}

                {interview.emotion_distribution && Object.keys(interview.emotion_distribution).length > 0 && (
                  <View style={styles.scoresContainer}>
                    <Text style={styles.scoresTitle}>Emotion Distribution:</Text>
                    {Object.entries(interview.emotion_distribution).map(([emotion, score]) => (
                      <View key={emotion} style={styles.scoreRow}>
                        <Text style={styles.scoreLabel}>{emotion}:</Text>
                        <View style={styles.scoreBarContainer}>
                          <View
                            style={[
                              styles.scoreBar,
                              { width: `${score * 100}%`, backgroundColor: '#8B5CF6' },
                            ]}
                          />
                        </View>
                        <Text style={styles.scoreValue}>{(score * 100).toFixed(1)}%</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Gate-1 Deception Analysis */}
                {interview.gate1_deception && (
                  <View style={styles.deceptionContainer}>
                    <Text style={styles.deceptionTitle}>🔊 Audio Truth Analysis (Gate-1)</Text>
                    <View style={[styles.deceptionBadge, { backgroundColor: getDeceptionColor(interview.gate1_deception.deception_label) }]}>
                      <Text style={styles.deceptionBadgeText}>
                        {getDeceptionLabel(interview.gate1_deception.deception_label)}
                      </Text>
                    </View>
                    <Text style={styles.deceptionConfidence}>
                      Confidence: {(interview.gate1_deception.deception_confidence * 100).toFixed(1)}%
                    </Text>
                    {interview.gate1_deception.deception_model_type && (
                      <Text style={styles.modelTypeText}>Model: {interview.gate1_deception.deception_model_type.toUpperCase()}</Text>
                    )}
                    {interview.gate1_deception.deception_signals && interview.gate1_deception.deception_signals.length > 0 && (
                      <View style={styles.deceptionSignalsContainer}>
                        <Text style={styles.signalsTitle}>Vocal Cues:</Text>
                        {interview.gate1_deception.deception_signals.map((signal, i) => (
                          <Text key={i} style={styles.signalItem}>
                            • {signal}
                          </Text>
                        ))}
                      </View>
                    )}
                  </View>
                )}

                {/* Gate-2 Deception Analysis */}
                {interview.gate2_deception && (
                  <View style={styles.deceptionContainer}>
                    <Text style={styles.deceptionTitle}>👁️ Visual Truth Analysis (Gate-2)</Text>
                    <View style={[styles.deceptionBadge, { backgroundColor: getDeceptionColor(interview.gate2_deception.deception_label) }]}>
                      <Text style={styles.deceptionBadgeText}>
                        {getDeceptionLabel(interview.gate2_deception.deception_label)}
                      </Text>
                    </View>
                    <Text style={styles.deceptionConfidence}>
                      Confidence: {(interview.gate2_deception.deception_confidence * 100).toFixed(1)}%
                    </Text>
                    {interview.gate2_deception.deception_model_type && (
                      <Text style={styles.modelTypeText}>Model: {interview.gate2_deception.deception_model_type.toUpperCase()}</Text>
                    )}
                    {interview.gate2_deception.deception_signals && interview.gate2_deception.deception_signals.length > 0 && (
                      <View style={styles.deceptionSignalsContainer}>
                        <Text style={styles.signalsTitle}>Visual Cues:</Text>
                        {interview.gate2_deception.deception_signals.map((signal, i) => (
                          <Text key={i} style={styles.signalItem}>
                            • {signal}
                          </Text>
                        ))}
                      </View>
                    )}
                  </View>
                )}

                {interview.reasons && interview.reasons.length > 0 && (
                  <View style={styles.reasonsContainer}>
                    <Text style={styles.reasonsTitle}>Key Signals:</Text>
                    {interview.reasons.map((reason, i) => (
                      <Text key={i} style={styles.reasonItem}>
                        • {reason}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    flexGrow: 1,
    padding: 16,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 24,
  },
  backButton: {
    color: '#27ae60',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  jobTitle: {
    fontSize: 14,
    color: '#666',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#c62828',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bbb',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  analysisCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  intentBadge: {
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  decisionBadge: {
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  badgeText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  confidenceText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  emotionContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  emotionLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  emotionValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  scoresContainer: {
    marginTop: 12,
  },
  scoresTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  scoreLabel: {
    fontSize: 12,
    color: '#666',
    width: 100,
  },
  scoreBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  scoreBar: {
    height: '100%',
    borderRadius: 4,
  },
  scoreValue: {
    fontSize: 12,
    color: '#999',
    width: 40,
    textAlign: 'right',
  },
  reasonsContainer: {
    marginTop: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
  },
  reasonsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  reasonItem: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
    lineHeight: 18,
  },
  deceptionContainer: {
    marginTop: 12,
    backgroundColor: '#f9f3f0',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#e74c3c',
  },
  deceptionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  deceptionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  deceptionBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  deceptionConfidence: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  modelTypeText: {
    fontSize: 11,
    color: '#999',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  deceptionSignalsContainer: {
    marginTop: 8,
    backgroundColor: 'rgba(231, 76, 60, 0.05)',
    borderRadius: 6,
    padding: 8,
  },
  signalsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  signalItem: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
    lineHeight: 16,
  },
});
