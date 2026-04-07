/**
 * View Analysis Screen - Display all completed call and interview analyses for a job
 * Shows Gate-1 call analysis and Gate-2 combined interview assessments.
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
import {
  api,
  CallStatusResponse,
  Gate2CombinedAssessment,
  Gate2RawDeception,
  Gate2RawEmotion,
  Interview,
} from '../services/api';

interface RouteParams {
  jobId: string;
  jobTitle: string;
}

export default function ViewAnalysisScreen() {
  const route = useRoute();
  const navigation = useNavigation<any>();
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
        api.getJobCallAnalyses(jobId),
        api.getJobInterviewAnalyses(jobId),
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

  const formatGate2Percent = (value?: number | null): string => {
    if (typeof value !== 'number' || Number.isNaN(value)) return 'N/A';
    const normalized = value <= 1 ? value * 100 : value;
    return `${normalized.toFixed(1)}%`;
  };

  const renderBranchChip = (label: string, degraded?: boolean) => (
    <View style={[styles.branchChip, { backgroundColor: degraded ? '#e74c3c' : '#27ae60' }]}>
      <Text style={styles.branchChipText}>{label}</Text>
    </View>
  );

  const renderReasonList = (items?: string[], emptyText = 'No details reported.') => (
    <View style={styles.reasonsContainer}>
      {(items && items.length > 0 ? items : [emptyText]).map((item, index) => (
        <Text key={`${item}-${index}`} style={styles.reasonItem}>• {item}</Text>
      ))}
    </View>
  );

  const renderScoreBars = (scores?: Record<string, number>, color = '#8B5CF6') => {
    if (!scores || Object.keys(scores).length === 0) return null;

    return (
      <View style={styles.scoresContainer}>
        {Object.entries(scores).map(([label, value]) => {
          const normalized = value <= 1 ? value * 100 : value;
          return (
            <View key={label} style={styles.scoreRow}>
              <Text style={styles.scoreLabel}>{label}:</Text>
              <View style={styles.scoreBarContainer}>
                <View
                  style={[
                    styles.scoreBar,
                    { width: `${Math.min(normalized, 100)}%`, backgroundColor: color },
                  ]}
                />
              </View>
              <Text style={styles.scoreValue}>{normalized.toFixed(1)}%</Text>
            </View>
          );
        })}
      </View>
    );
  };

  const renderCombinedPanel = (combined: Gate2CombinedAssessment) => {
    const degradedBranches = combined.degradedBranches ?? [];

    return (
      <View style={[styles.evidencePanel, styles.combinedEvidencePanel]}>
        <Text style={styles.evidenceTitle}>Final Combined Gate-2 Assessment</Text>
        <View style={[styles.decisionBadge, { backgroundColor: getDecisionColor(combined.finalDecision), alignSelf: 'flex-start', marginBottom: 8 }]}>
          <Text style={styles.badgeText}>{combined.finalDecision}</Text>
        </View>
        <Text style={styles.confidenceText}>Overall confidence: {formatGate2Percent(combined.overallConfidence)}</Text>
        <Text style={styles.evidenceMeta}>Risk level: {combined.riskLevel}</Text>
        <Text style={styles.evidenceMeta}>Recommendation: {combined.recommendation}</Text>
        <View style={styles.branchChipRow}>
          {degradedBranches.length > 0
            ? degradedBranches.map((branch) => (
                <View key={branch}>{renderBranchChip(`${branch} degraded`, true)}</View>
              ))
            : renderBranchChip('all branches healthy', false)}
        </View>
        <Text style={styles.reasonsTitle}>Combined Reasoning:</Text>
        {renderReasonList(combined.reasoning)}
      </View>
    );
  };

  const renderRawEmotionPanel = (
    rawEmotion: Gate2RawEmotion | undefined,
    legacy: {
      dominantEmotion?: string;
      emotionDistribution?: Record<string, number>;
      topSignals?: string[];
      modelVersion?: string;
    },
  ) => {
    const degraded = rawEmotion ? rawEmotion.degraded : true;
    const distribution = rawEmotion?.emotionDistribution ?? legacy.emotionDistribution;
    const topSignals = rawEmotion?.topSignals ?? legacy.topSignals;

    return (
      <View style={[styles.evidencePanel, degraded && styles.degradedEvidencePanel]}>
        <View style={styles.evidenceHeaderRow}>
          <Text style={styles.evidenceTitle}>Raw Emotion Evidence</Text>
          {renderBranchChip(rawEmotion ? (degraded ? 'degraded' : 'healthy') : 'legacy only', degraded)}
        </View>
        <Text style={styles.evidenceMeta}>Raw emotion decision: {rawEmotion?.decision ?? 'unknown'}</Text>
        <Text style={styles.evidenceMeta}>Raw emotion confidence: {formatGate2Percent(rawEmotion?.confidence)}</Text>
        <Text style={styles.evidenceMeta}>Dominant emotion: {rawEmotion?.dominantEmotion ?? legacy.dominantEmotion ?? 'unknown'}</Text>
        {(rawEmotion?.modelVersion || legacy.modelVersion) && (
          <Text style={styles.evidenceMeta}>Model version: {rawEmotion?.modelVersion ?? legacy.modelVersion}</Text>
        )}
        {rawEmotion?.fallbackReason && <Text style={styles.fallbackText}>Fallback reason: {rawEmotion.fallbackReason}</Text>}
        {!rawEmotion && <Text style={styles.fallbackText}>Raw emotion health metadata was not returned; showing legacy emotion fields only.</Text>}
        <Text style={styles.scoresTitle}>Raw Emotion Distribution:</Text>
        {renderScoreBars(distribution, '#8B5CF6') ?? <Text style={styles.evidenceMeta}>No raw emotion distribution reported.</Text>}
        <Text style={styles.reasonsTitle}>Raw Emotion Signals:</Text>
        {renderReasonList(topSignals)}
      </View>
    );
  };

  const renderRawDeceptionPanel = (rawDeception?: Gate2RawDeception) => {
    if (!rawDeception) {
      return (
        <View style={[styles.evidencePanel, styles.degradedEvidencePanel]}>
          <View style={styles.evidenceHeaderRow}>
            <Text style={styles.evidenceTitle}>Raw Deception Evidence</Text>
            {renderBranchChip('not returned', true)}
          </View>
          <Text style={styles.fallbackText}>Raw Gate-2 deception evidence was not returned for this interview.</Text>
        </View>
      );
    }

    return (
      <View style={[styles.evidencePanel, rawDeception.degraded && styles.degradedEvidencePanel]}>
        <View style={styles.evidenceHeaderRow}>
          <Text style={styles.evidenceTitle}>Raw Deception Evidence</Text>
          {renderBranchChip(rawDeception.degraded ? 'degraded' : 'healthy', rawDeception.degraded)}
        </View>
        <Text style={styles.evidenceMeta}>Raw deception label: {rawDeception.label}</Text>
        <Text style={styles.evidenceMeta}>Raw deception confidence: {formatGate2Percent(rawDeception.confidence)}</Text>
        {rawDeception.modelType && <Text style={styles.evidenceMeta}>Model type: {rawDeception.modelType}</Text>}
        {rawDeception.modelVersion && <Text style={styles.evidenceMeta}>Model version: {rawDeception.modelVersion}</Text>}
        {rawDeception.fallbackReason && <Text style={styles.fallbackText}>Fallback reason: {rawDeception.fallbackReason}</Text>}
        <Text style={styles.scoresTitle}>Raw Deception Scores:</Text>
        {renderScoreBars(rawDeception.scores, '#e67e22') ?? <Text style={styles.evidenceMeta}>No raw deception score distribution reported.</Text>}
        <Text style={styles.reasonsTitle}>Raw Deception Signals:</Text>
        {renderReasonList(rawDeception.topSignals)}
      </View>
    );
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

        {/* Gate-1: Raw Voice Intent Analyses */}
        {callAnalyses.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎙️ Raw Voice Intent Analyses (Gate-1)</Text>
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
                    Intent confidence: {(call.analysis.confidence * 100).toFixed(1)}%
                  </Text>

                  {call.analysis.scores && Object.keys(call.analysis.scores).length > 0 && (
                    <View style={styles.scoresContainer}>
                      <Text style={styles.scoresTitle}>Raw Intent Scores:</Text>
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

        {/* Gate-2: Combined Interview Assessments */}
        {interviewAnalyses.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎥 Combined Interview Assessments (Gate-2)</Text>
            {interviewAnalyses.map((interview, index) => (
              <View key={`interview-${index}`} style={styles.analysisCard}>
                {(() => {
                  const combinedAssessment = interview.combinedAssessment ?? {
                    finalDecision: interview.analysisDecision ?? 'VERIFY',
                    recommendation: 'Review raw Gate-2 evidence before acting on this result.',
                    overallConfidence: interview.confidence ?? 0,
                    trustScore: interview.confidence ?? 0,
                    reasoning: interview.reasons ?? [],
                    riskLevel: 'unknown' as const,
                    degradedBranches: [],
                    rulePath: 'legacy_top_level_fallback',
                    aggregationVersion: 'legacy-compatible',
                  };
                  const rawDeception = interview.rawDeception ?? (interview.gate2_deception ? (() => {
                    const legacyDeceptionDegraded = interview.gate2_deception.deception_model_type === 'rules';
                    return {
                    label: interview.gate2_deception.deception_label,
                    confidence: interview.gate2_deception.deception_confidence,
                    scores: interview.gate2_deception.deception_scores ?? {},
                    topSignals: interview.gate2_deception.deception_signals ?? [],
                    stats: {},
                    modelType: interview.gate2_deception.deception_model_type,
                    fallbackReason: legacyDeceptionDegraded ? 'Legacy Gate-2 deception record used rules fallback' : undefined,
                    healthy: !legacyDeceptionDegraded,
                    degraded: legacyDeceptionDegraded,
                    };
                  })() : undefined);

                  return (
                    <>
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
                    Overall Gate-2 Confidence: {(interview.confidence * 100).toFixed(1)}%
                  </Text>
                )}

                {renderCombinedPanel(combinedAssessment)}
                {renderRawEmotionPanel(interview.rawEmotion, {
                  dominantEmotion: interview.dominant_emotion,
                  emotionDistribution: interview.emotion_distribution,
                  topSignals: interview.top_signals,
                  modelVersion: interview.model_version,
                })}
                {renderRawDeceptionPanel(rawDeception)}
                    </>
                  );
                })()}

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
  evidencePanel: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e6e0f2',
  },
  combinedEvidencePanel: {
    borderLeftWidth: 4,
    borderLeftColor: '#8B5CF6',
  },
  degradedEvidencePanel: {
    borderLeftWidth: 4,
    borderLeftColor: '#e74c3c',
    backgroundColor: '#fff8f6',
  },
  evidenceHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  evidenceTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  evidenceMeta: {
    fontSize: 12,
    color: '#555',
    lineHeight: 18,
    marginBottom: 4,
  },
  branchChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  branchChip: {
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  branchChipText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  fallbackText: {
    fontSize: 12,
    color: '#a33',
    lineHeight: 18,
    marginBottom: 8,
    fontWeight: '600',
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
