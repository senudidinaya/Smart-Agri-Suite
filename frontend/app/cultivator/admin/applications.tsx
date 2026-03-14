/**
 * Admin Applications Screen - View all job posts from clients
 * Extended with interview workflow: Invite, Record, Analyze
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  Alert,
  Platform,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { cultivatorApi as api, Job, InterviewStatusResponse, InsightResponse } from '@/api/cultivatorApi';

type FilterStatus = 'all' | 'new' | 'contacted' | 'invited_interview' | 'approved' | 'rejected' | 'closed';

// Extended Job interface with interview status
interface ExtendedJob extends Job {
  interviewStatus?: InterviewStatusResponse;
  applicationStatus?: string;
}

const DECISION_LABELS: Record<string, string> = {
  APPROVE: 'Proceed',
  VERIFY: 'Needs Manual Review',
  REJECT: 'Do Not Proceed',
};

const TECHNICAL_SIGNAL_PATTERNS = [
  /model not loaded/i,
  /expected model at/i,
  /gate\s*2\s*ml/i,
  /model_path/i,
];

function sanitizeInterviewSignal(signal: string): string | null {
  const normalized = String(signal || '').trim();
  if (!normalized) return null;

  if (TECHNICAL_SIGNAL_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return null;
  }

  if (/manual\s+(verification|review)\s+required/i.test(normalized)) {
    return 'Automated interview scoring was limited, so manual review is recommended.';
  }

  if (/could not extract frames/i.test(normalized)) {
    return 'Video quality was too low for complete frame analysis.';
  }

  if (/video may be corrupted|unsupported format/i.test(normalized)) {
    return 'The interview video format or quality reduced analysis reliability.';
  }

  return normalized;
}

function getInterviewHighlights(interview: any): string[] {
  const rawSignals: string[] = Array.isArray(interview?.top_signals) ? interview.top_signals : [];
  const rawReasons: string[] = Array.isArray(interview?.reasons) ? interview.reasons : [];
  const merged = [...rawSignals, ...rawReasons]
    .map((item) => sanitizeInterviewSignal(item))
    .filter((item): item is string => Boolean(item));

  return Array.from(new Set(merged));
}

export default function AdminApplicationsScreen() {
  const router = useRouter();
  const [jobs, setJobs] = useState<ExtendedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterStatus>('all');
  
  // Analysis modal state
  const [analysisModalVisible, setAnalysisModalVisible] = useState(false);
  const [analysisData, setAnalysisData] = useState<InterviewStatusResponse | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [gate1Insight, setGate1Insight] = useState<string | null>(null);
  const [gate2Insight, setGate2Insight] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);

  const loadJobs = useCallback(async () => {
    try {
      const result = await api.getJobs();
      // Filter based on selected filter
      const filteredJobs = filter === 'all' 
        ? result.jobs 
        : result.jobs.filter((job: Job) => job.status === filter);

      // Show jobs immediately so UI is responsive even on slow networks.
      const baseJobs = filteredJobs.map((job) => ({ ...job } as ExtendedJob));
      setJobs(baseJobs);

      // Enrich interview status in background without blocking list rendering.
      Promise.allSettled(
        filteredJobs.map(async (job: Job) => {
          const interviewStatus = await api.getInterviewStatus(job.id, job.createdByUserId);
          return { jobId: job.id, interviewStatus };
        })
      ).then((results) => {
        const statusMap = new Map<string, InterviewStatusResponse>();
        results.forEach((result) => {
          if (result.status === 'fulfilled') {
            statusMap.set(result.value.jobId, result.value.interviewStatus);
          }
        });

        if (statusMap.size > 0) {
          setJobs((prev) =>
            prev.map((job) => ({
              ...job,
              interviewStatus: statusMap.get(job.id) ?? job.interviewStatus,
            }))
          );
        }
      });
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  // Reload jobs every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadJobs();
    }, [loadJobs])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadJobs();
    setRefreshing(false);
  };

  const handleContactClient = async (job: Job) => {
    Alert.alert(
      'Contact Client',
      `Mark this job as "Contacted"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Contacted',
          onPress: async () => {
            try {
              await api.updateJobStatus(job.id, 'contacted');
              Alert.alert('Success', 'Job marked as contacted');
              loadJobs();
            } catch (e: any) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ]
    );
  };

  const handleCloseJob = async (job: Job) => {
    Alert.alert(
      'Close Job',
      `Are you sure you want to close this job post?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Close Job',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.updateJobStatus(job.id, 'closed');
              Alert.alert('Success', 'Job has been closed');
              loadJobs();
            } catch (e: any) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ]
    );
  };

  const handleCallClient = async (job: Job) => {
    try {
      // Initiate call via API
      const response = await api.initiateCall(job.id);
      
      // PHASE 3: Frontend API response logging
      const token = response.agora.token;
      const startsWithOo6 = token.startsWith('006');
      console.log(`[AGORA-FRONTEND-RECEIVE] channel=${response.agora.channelName} uid=${response.agora.uid} prefix=${token.substring(0, 10)} length=${token.length} starts_with_006=${startsWithOo6}`);
      
      // PHASE 4: AsyncStorage save logging
      console.log(`[AGORA-FRONTEND-STORAGE-SAVE] prefix=${token.substring(0, 10)} length=${token.length}`);
      
      // Store Agora config in AsyncStorage to avoid URL encoding corruption
      // Agora tokens contain special chars (+, /, =) that get mangled in URL params
      await AsyncStorage.setItem(
        `call_config_${response.callId}`,
        JSON.stringify(response.agora)
      );
      
      // Navigate with only non-sensitive data in URL params
      router.push({
        pathname: '/cultivator/admin/call',
        params: {
          callId: response.callId,
          clientUsername: job.createdByUsername,
          jobTitle: job.title,
          priorExperience: job.priorExperience,
        },
      });
    } catch (e: any) {
      Alert.alert('Call Failed', e.message);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return '#4CAF50';
      case 'contacted':
        return '#2196F3';
      case 'invited_interview':
        return '#9C27B0';
      case 'interview_done':
        return '#FF9800';
      case 'approved':
        return '#27ae60';
      case 'rejected':
        return '#e74c3c';
      case 'verify_required':
        return '#f39c12';
      case 'closed':
        return '#9E9E9E';
      default:
        return '#666';
    }
  };

  const handleInviteForInterview = async (job: ExtendedJob) => {
    Alert.alert(
      'Invite for Interview',
      `Invite ${job.createdByUsername} for an in-person interview?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Invite',
          onPress: async () => {
            try {
              await api.inviteForInterview(job.id, job.createdByUserId);
              Alert.alert('Success', 'Client invited for interview');
              loadJobs();
            } catch (e: any) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ]
    );
  };

  const handleViewAllAnalyses = (job: Job) => {
    router.push({
      pathname: '/cultivator/analysis/view' as any,
      params: {
        jobId: job.id,
        jobTitle: job.title,
      },
    });
  };

  const handleStartInterview = (job: ExtendedJob) => {
    router.push({
      pathname: '/cultivator/admin/in-person-interview' as any,
      params: {
        jobId: job.id,
        clientId: job.createdByUserId,
        clientName: job.createdByUsername,
        jobTitle: job.title,
        priorExperience: job.priorExperience,
      },
    });
  };

  const handleRejectApplication = async (job: ExtendedJob) => {
    Alert.alert(
      'Reject Application',
      `Are you sure you want to reject this application from ${job.createdByUsername}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.rejectApplication(job.id, job.createdByUserId);
              Alert.alert('Success', 'Application rejected');
              loadJobs();
            } catch (e: any) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ]
    );
  };

  const handleViewCallAssessment = async (job: ExtendedJob) => {
    setAnalysisModalVisible(true);
    setAnalysisLoading(true);
    setAnalysisData(null);
    setGate1Insight(null);
    setGate2Insight(null);

    try {
      const status = await api.getInterviewStatus(job.id, job.createdByUserId);
      setAnalysisData(status);

      // Fetch DeepSeek insights in background
      setInsightLoading(true);
      const promises: Promise<void>[] = [];

      if (status.callAssessment) {
        const ca = status.callAssessment;
        const scores: Record<string, number> = {};
        if (ca.scores) {
          for (const [label, score] of Object.entries(ca.scores as Record<string, number>)) {
            scores[label] = score * 100;
          }
        }
        promises.push(
          api.getGate1Insight(ca.decision, ca.confidence * 100, scores)
            .then(res => { if (res.success) setGate1Insight(res.insight); })
            .catch(() => {})
        );
      }

      if (status.interview?.analysisDecision) {
        const iv = status.interview;
        promises.push(
          api.getGate2Insight(
            iv.analysisDecision!,
            (iv.confidence ?? 0) * 100,
            iv.dominant_emotion || 'neutral',
            iv.emotion_distribution || {},
            iv.top_signals || [],
            iv.stats,
          )
            .then(res => { if (res.success) setGate2Insight(res.insight); })
            .catch(() => {})
        );
      }

      await Promise.all(promises);
      setInsightLoading(false);
    } catch (e: any) {
      Alert.alert('Error', 'Failed to load analysis data');
      setAnalysisModalVisible(false);
    } finally {
      setAnalysisLoading(false);
    }
  };

  const getIntentColor = (label: string) => {
    switch (label) {
      case 'PROCEED': return '#27ae60';
      case 'REJECT': return '#e74c3c';
      case 'VERIFY': return '#f39c12';
      default: return '#666';
    }
  };

  const getDecisionColor = (label: string) => {
    switch (label) {
      case 'APPROVE': return '#27ae60';
      case 'REJECT': return '#e74c3c';
      case 'VERIFY': return '#f39c12';
      default: return '#666';
    }
  };

  const getDecisionText = (label?: string) => {
    if (!label) return 'Pending';
    return DECISION_LABELS[label] || label;
  };

  const filters: { key: FilterStatus; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'new', label: 'New' },
    { key: 'contacted', label: 'Contacted' },
    { key: 'invited_interview', label: 'Invited' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
    { key: 'closed', label: 'Closed' },
  ];

  const renderJob = ({ item }: { item: ExtendedJob }) => {
    const status = item.applicationStatus || item.status;
    const hasCallAssessment = item.interviewStatus?.callAssessment != null;
    const hasInterview = item.interviewStatus?.hasInterview;
    const interviewCompleted = item.interviewStatus?.interview?.status === 'completed';
    
    return (
    <View style={styles.jobCard}>
      <View style={styles.jobHeader}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>{item.title.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.jobInfo}>
          <Text style={styles.jobTitle}>{item.title}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) }]}>
            <Text style={styles.statusText}>{status.toUpperCase().replace('_', ' ')}</Text>
          </View>
        </View>
      </View>

      <View style={styles.jobDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Posted By:</Text>
          <Text style={styles.detailValue}>{item.createdByUsername}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Location:</Text>
          <Text style={styles.detailValue}>{item.districtOrLocation}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Starts On:</Text>
          <Text style={styles.detailValue}>{item.startsOnText}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Experience:</Text>
          <Text style={styles.detailValue}>{item.priorExperience}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Posted:</Text>
          <Text style={styles.detailValue}>{new Date(item.createdAt).toLocaleDateString()}</Text>
        </View>
        
        {/* Show call assessment result if available */}
        {hasCallAssessment && (
          <TouchableOpacity 
            style={styles.assessmentRow}
            onPress={() => handleViewCallAssessment(item)}
          >
            <Text style={styles.detailLabel}>Call Assessment:</Text>
            <View style={[
              styles.assessmentBadge, 
              { backgroundColor: 
                item.interviewStatus?.callAssessment?.decision === 'PROCEED' ? '#27ae60' :
                item.interviewStatus?.callAssessment?.decision === 'REJECT' ? '#e74c3c' : '#f39c12'
              }
            ]}>
              <Text style={styles.assessmentText}>
                {item.interviewStatus?.callAssessment?.decision} 
                ({((item.interviewStatus?.callAssessment?.confidence ?? 0) * 100).toFixed(0)}%)
              </Text>
            </View>
          </TouchableOpacity>
        )}
        
        {/* Show interview result if completed */}
        {interviewCompleted && item.interviewStatus?.interview && (
          <TouchableOpacity 
            style={styles.interviewResultRow}
            onPress={() => handleViewCallAssessment(item)}
          >
            <Text style={styles.detailLabel}>Interview Result:</Text>
            <View style={[
              styles.assessmentBadge,
              { backgroundColor: 
                item.interviewStatus.interview.analysisDecision === 'APPROVE' ? '#27ae60' :
                item.interviewStatus.interview.analysisDecision === 'REJECT' ? '#e74c3c' : '#f39c12'
              }
            ]}>
              <Text style={styles.assessmentText}>
                {item.interviewStatus.interview.analysisDecision}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* View Full Analysis button */}
        {(hasCallAssessment || interviewCompleted) && (
          <TouchableOpacity
            style={styles.viewAnalysisButton}
            onPress={() => handleViewCallAssessment(item)}
          >
            <Text style={styles.viewAnalysisButtonText}>📊 View Full Analysis</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.jobActions}>
        {/* NEW status: Call, Mark Contacted, Close */}
        {status === 'new' && (
          <>
            <TouchableOpacity
              style={styles.callClientButton}
              onPress={() => handleCallClient(item)}
            >
              <Text style={styles.callClientButtonText}>📞 Call</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.contactButton}
              onPress={() => handleContactClient(item)}
            >
              <Text style={styles.contactButtonText}>✓ Mark Contacted</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => handleCloseJob(item)}
            >
              <Text style={styles.closeButtonText}>✗ Close</Text>
            </TouchableOpacity>
          </>
        )}
        
        {/* CONTACTED status: Call, Invite Interview, Reject */}
        {status === 'contacted' && (
          <>
            <TouchableOpacity
              style={styles.callClientButton}
              onPress={() => handleCallClient(item)}
            >
              <Text style={styles.callClientButtonText}>📞 Call</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.inviteButton}
              onPress={() => handleInviteForInterview(item)}
            >
              <Text style={styles.inviteButtonText}>🎥 Invite Interview</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.analysisButton}
              onPress={() => handleViewAllAnalyses(item)}
            >
              <Text style={styles.analysisButtonText}>📊 View Analysis</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.rejectButton}
              onPress={() => handleRejectApplication(item)}
            >
              <Text style={styles.rejectButtonText}>✗ Reject</Text>
            </TouchableOpacity>
          </>
        )}
        
        {/* INVITED_INTERVIEW status: Start Interview, Reject */}
        {status === 'invited_interview' && (
          <>
            <TouchableOpacity
              style={styles.startInterviewButton}
              onPress={() => handleStartInterview(item)}
            >
              <Text style={styles.startInterviewButtonText}>🎬 Start Interview</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.analysisButton}
              onPress={() => handleViewAllAnalyses(item)}
            >
              <Text style={styles.analysisButtonText}>📊 View Analysis</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.rejectButton}
              onPress={() => handleRejectApplication(item)}
            >
              <Text style={styles.rejectButtonText}>✗ Reject</Text>
            </TouchableOpacity>
          </>
        )}
        
        {/* VERIFY_REQUIRED status: Re-interview option */}
        {status === 'verify_required' && (
          <>
            <TouchableOpacity
              style={styles.startInterviewButton}
              onPress={() => handleStartInterview(item)}
            >
              <Text style={styles.startInterviewButtonText}>🎬 Re-Interview</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.analysisButton}
              onPress={() => handleViewAllAnalyses(item)}
            >
              <Text style={styles.analysisButtonText}>📊 View Analysis</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.rejectButton}
              onPress={() => handleRejectApplication(item)}
            >
              <Text style={styles.rejectButtonText}>✗ Reject</Text>
            </TouchableOpacity>
          </>
        )}
        
        {/* APPROVED/REJECTED status: View only */}
        {(status === 'approved' || status === 'rejected') && (
          <View style={styles.finalStatusContainer}>
            <Text style={[
              styles.finalStatusText,
              { color: status === 'approved' ? '#27ae60' : '#e74c3c' }
            ]}>
              {status === 'approved' ? '✅ Application Approved' : '❌ Application Rejected'}
            </Text>
          </View>
        )}
        
        {/* CLOSED status */}
        {status === 'closed' && (
          <View style={styles.finalStatusContainer}>
            <Text style={styles.closedStatusText}>Job Closed</Text>
          </View>
        )}
      </View>
    </View>
  )};

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📋</Text>
      <Text style={styles.emptyText}>No job posts found</Text>
      <Text style={styles.emptySubtext}>
        {filter === 'all' ? 'No job posts yet' : `No ${filter} job posts`}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Jobs List */}
      <FlatList
        data={jobs}
        renderItem={renderJob}
        keyExtractor={(item) => item.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={!loading ? renderEmpty : null}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#27ae60']} />
        }
      />

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterTab, filter === f.key && styles.filterTabActive]}
            onPress={() => {
              setFilter(f.key);
              setLoading(true);
            }}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Full Analysis Modal ── */}
      <Modal
        visible={analysisModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setAnalysisModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {analysisLoading ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color="#8B5CF6" />
                <Text style={styles.modalLoadingText}>Loading analysis…</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>Full Analysis</Text>

                {/* ── Gate-1: Voice Analysis ── */}
                {analysisData?.callAssessment && (() => {
                  const ca = analysisData.callAssessment!;
                  return (
                    <View style={styles.modalSection}>
                      <Text style={styles.sectionTitle}>Gate-1: Voice Analysis</Text>

                      <View style={styles.decisionRow}>
                        <View style={[styles.decisionBadge, { backgroundColor: getIntentColor(ca.decision) }]}>
                          <Text style={styles.decisionBadgeText}>{ca.decision}</Text>
                        </View>
                        <Text style={styles.confidenceText}>
                          {(ca.confidence * 100).toFixed(1)}% confidence
                        </Text>
                      </View>

                      {/* Score bars */}
                      {ca.scores && Object.keys(ca.scores).length > 0 && (
                        <View style={styles.scoresContainer}>
                          <Text style={styles.scoresHeading}>Score Breakdown</Text>
                          {Object.entries(ca.scores as Record<string, number>)
                            .sort(([, a], [, b]) => b - a)
                            .map(([label, score]) => (
                              <View key={label} style={styles.scoreRow}>
                                <Text style={styles.scoreLabel}>{label}</Text>
                                <View style={styles.scoreBarBg}>
                                  <View
                                    style={[
                                      styles.scoreBarFill,
                                      {
                                        width: `${Math.min(score * 100, 100)}%`,
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

                      {/* DeepSeek Insight */}
                      {insightLoading && !gate1Insight && (
                        <ActivityIndicator size="small" color="#8B5CF6" style={{ marginTop: 8 }} />
                      )}
                      {gate1Insight && (
                        <View style={styles.insightCard}>
                          <Text style={styles.insightTitle}>AI Insight</Text>
                          <Text style={styles.insightText}>{gate1Insight}</Text>
                        </View>
                      )}

                      <View style={styles.sectionDivider} />
                    </View>
                  );
                })()}

                {/* ── Gate-2: Interview Analysis ── */}
                {analysisData?.interview?.analysisDecision && (() => {
                  const iv = analysisData.interview!;
                  const interviewHighlights = getInterviewHighlights(iv);
                  return (
                    <View style={styles.modalSection}>
                      <Text style={styles.sectionTitle}>Gate-2: Interview Analysis</Text>

                      <View style={styles.decisionRow}>
                        <View style={[styles.decisionBadge, { backgroundColor: getDecisionColor(iv.analysisDecision!) }]}>
                          <Text style={styles.decisionBadgeText}>{getDecisionText(iv.analysisDecision)}</Text>
                        </View>
                        <Text style={styles.confidenceText}>
                          {((iv.confidence ?? 0) * 100).toFixed(1)}% confidence
                        </Text>
                      </View>

                      {/* Dominant Emotion */}
                      {iv.dominant_emotion && iv.dominant_emotion !== 'unknown' && (
                        <Text style={styles.dominantEmotion}>
                          Dominant Emotion: <Text style={{ fontWeight: '700' }}>{iv.dominant_emotion}</Text>
                        </Text>
                      )}

                      {/* Emotion distribution bars */}
                      {iv.emotion_distribution && Object.keys(iv.emotion_distribution).length > 0 && (
                        <View style={styles.scoresContainer}>
                          <Text style={styles.scoresHeading}>Emotion Distribution</Text>
                          {Object.entries(iv.emotion_distribution as Record<string, number>)
                            .sort(([, a], [, b]) => b - a)
                            .map(([emotion, pct]) => (
                              <View key={emotion} style={styles.scoreRow}>
                                <Text style={styles.scoreLabel}>{emotion}</Text>
                                <View style={styles.scoreBarBg}>
                                  <View
                                    style={[
                                      styles.scoreBarFill,
                                      {
                                        width: `${Math.min(pct, 100)}%`,
                                        backgroundColor: '#8B5CF6',
                                      },
                                    ]}
                                  />
                                </View>
                                <Text style={styles.scoreValue}>{pct.toFixed(1)}%</Text>
                              </View>
                            ))}
                        </View>
                      )}

                      {/* Top Signals */}
                      {interviewHighlights.length > 0 && (
                        <View style={styles.signalsContainer}>
                          <Text style={styles.scoresHeading}>Interview Highlights</Text>
                          {interviewHighlights.map((sig: string, idx: number) => (
                            <View key={idx} style={styles.signalRow}>
                              <View style={styles.signalDot} />
                              <Text style={styles.signalItem}>{sig}</Text>
                            </View>
                          ))}
                        </View>
                      )}

                      {/* Stats */}
                      {iv.stats && (
                        <View style={styles.statsRow}>
                          <View style={styles.statBox}>
                            <Text style={styles.statValue}>{iv.stats.frames_used ?? '-'}</Text>
                            <Text style={styles.statLabel}>Frames</Text>
                          </View>
                          <View style={styles.statBox}>
                            <Text style={styles.statValue}>{iv.stats.predictions_count ?? '-'}</Text>
                            <Text style={styles.statLabel}>Predictions</Text>
                          </View>
                          <View style={styles.statBox}>
                            <Text style={styles.statValue}>{iv.stats.faces_detected ?? '-'}</Text>
                            <Text style={styles.statLabel}>Faces</Text>
                          </View>
                        </View>
                      )}

                      {/* DeepSeek Insight */}
                      {insightLoading && !gate2Insight && (
                        <ActivityIndicator size="small" color="#8B5CF6" style={{ marginTop: 8 }} />
                      )}
                      {gate2Insight && (
                        <View style={styles.insightCard}>
                          <Text style={styles.insightTitle}>AI Insight</Text>
                          <Text style={styles.insightText}>{gate2Insight}</Text>
                        </View>
                      )}

                      <View style={styles.sectionDivider} />
                    </View>
                  );
                })()}

                {/* No data fallback */}
                {!analysisData?.callAssessment && !analysisData?.interview?.analysisDecision && (
                  <Text style={styles.noDataText}>No analysis data available for this application.</Text>
                )}
              </ScrollView>
            )}

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setAnalysisModalVisible(false)}
            >
              <Text style={styles.modalCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 20,
    paddingVertical: 25,
    paddingTop: 15,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 20,
    marginHorizontal: 3,
  },
  filterTabActive: {
    backgroundColor: '#27ae60',
  },
  filterText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 15,
    paddingBottom: 20,
  },
  jobCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    position: 'relative',
    ...Platform.select({
      web: {
        boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
      },
    }),
  },
  recordIconButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#27ae60',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  recordIconText: {
    fontSize: 22,
  },
  jobHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarContainer: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#27ae60',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  jobInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  jobDetails: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 13,
    color: '#666',
    width: 90,
  },
  detailValue: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },
  jobActions: {
    flexDirection: 'row',
    gap: 10,
  },
  callClientButton: {
    backgroundColor: '#27ae60',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 15,
    alignItems: 'center',
  },
  callClientButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  contactButton: {
    flex: 1,
    backgroundColor: '#27ae60',
    borderRadius: 20,
    paddingVertical: 10,
    alignItems: 'center',
  },
  contactButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  closeButton: {
    flex: 1,
    backgroundColor: '#e74c3c',
    borderRadius: 20,
    paddingVertical: 10,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 50,
    marginBottom: 15,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  modalLoading: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  modalLoadingText: {
    marginTop: 10,
    color: '#666',
  },
  modalTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 18,
    color: '#333',
  },
  modalSection: {
    marginBottom: 16,
    padding: 14,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  decisionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  decisionBadge: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  decisionBadgeText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  confidenceText: {
    marginLeft: 15,
    color: '#475569',
    fontSize: 14,
  },
  scoresContainer: {
    marginTop: 12,
  },
  scoresHeading: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  scoreLabel: {
    fontSize: 12,
    color: '#666',
    width: 80,
  },
  scoreBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginHorizontal: 10,
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  scoreValue: {
    fontSize: 12,
    color: '#333',
    fontWeight: '600',
    width: 50,
    textAlign: 'right',
  },
  insightCard: {
    marginTop: 15,
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  insightTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  insightText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
  },
  signalsContainer: {
    marginTop: 12,
  },
  signalItem: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 19,
    flex: 1,
  },
  signalRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 7,
  },
  signalDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16a34a',
    marginTop: 7,
    marginRight: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 8,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  dominantEmotion: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  noDataText: {
    textAlign: 'center',
    color: '#999',
    paddingVertical: 20,
  },
  modalCloseButton: {
    backgroundColor: '#27ae60',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  modalCloseButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  assessmentRow: {
    marginTop: 8,
    alignItems: 'center',
  },
  assessmentBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  assessmentText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  interviewResultRow: {
    marginTop: 8,
  },
  viewAnalysisButton: {
    marginTop: 8,
    padding: 10,
    backgroundColor: '#8B5CF6',
    borderRadius: 8,
    alignItems: 'center',
  },
  viewAnalysisButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  inviteButton: {
    flex: 1,
    backgroundColor: '#9C27B0',
    borderRadius: 20,
    paddingVertical: 10,
    alignItems: 'center',
  },
  inviteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  analysisButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 15,
    alignItems: 'center',
  },
  analysisButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  rejectButton: {
    flex: 1,
    backgroundColor: '#e74c3c',
    borderRadius: 20,
    paddingVertical: 10,
    alignItems: 'center',
  },
  rejectButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  startInterviewButton: {
    flex: 1,
    backgroundColor: '#FF9800',
    borderRadius: 20,
    paddingVertical: 10,
    alignItems: 'center',
  },
  startInterviewButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  finalStatusContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  finalStatusText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  closedStatusText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#9E9E9E',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginTop: 14,
  },
});
