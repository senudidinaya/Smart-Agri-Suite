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
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { api, Job, InterviewStatusResponse, InsightResponse } from '../services/api';

type FilterStatus = 'all' | 'new' | 'contacted' | 'invited_interview' | 'approved' | 'rejected' | 'closed';

// Extended Job interface with interview status
interface ExtendedJob extends Job {
  interviewStatus?: InterviewStatusResponse;
  applicationStatus?: string;
}

export default function AdminApplicationsScreen() {
  const navigation = useNavigation<any>();
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
      
      // Navigate to AdminCallScreen with Agora call details
      navigation.navigate('AdminCall', {
        callId: response.callId,
        agora: response.agora,
        clientUsername: job.createdByUsername,
        jobTitle: job.title,
        // Legacy fields
        roomName: response.roomName,
        token: response.token,
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
    navigation.navigate('ViewAnalysis', {
      jobId: job.id,
      jobTitle: job.title,
    });
  };

  const handleStartInterview = (job: ExtendedJob) => {
    navigation.navigate('InPersonInterview', {
      jobId: job.id,
      clientId: job.createdByUserId,
      clientName: job.createdByUsername,
      jobTitle: job.title,
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
          for (const [label, score] of Object.entries(ca.scores)) {
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

      {/* Jobs List */}
      <FlatList
        data={jobs}
        renderItem={renderJob}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={!loading ? renderEmpty : null}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#5C9A9A']} />
        }
      />

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
                <Text style={styles.modalTitle}>📊 Full Analysis</Text>

                {/* ── Gate-1: Voice Analysis ── */}
                {analysisData?.callAssessment && (() => {
                  const ca = analysisData.callAssessment!;
                  return (
                    <View style={styles.modalSection}>
                      <Text style={styles.sectionTitle}>🎙️ Gate-1 — Voice Analysis</Text>

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
                          {Object.entries(ca.scores)
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
                          <Text style={styles.insightTitle}>🧠 AI Insight</Text>
                          <Text style={styles.insightText}>{gate1Insight}</Text>
                        </View>
                      )}
                    </View>
                  );
                })()}

                {/* ── Gate-2: Interview Analysis ── */}
                {analysisData?.interview?.analysisDecision && (() => {
                  const iv = analysisData.interview!;
                  return (
                    <View style={styles.modalSection}>
                      <Text style={styles.sectionTitle}>🎥 Gate-2 — Interview Analysis</Text>

                      <View style={styles.decisionRow}>
                        <View style={[styles.decisionBadge, { backgroundColor: getDecisionColor(iv.analysisDecision!) }]}>
                          <Text style={styles.decisionBadgeText}>{iv.analysisDecision}</Text>
                        </View>
                        <Text style={styles.confidenceText}>
                          {((iv.confidence ?? 0) * 100).toFixed(1)}% confidence
                        </Text>
                      </View>

                      {/* Dominant Emotion */}
                      {iv.dominant_emotion && (
                        <Text style={styles.dominantEmotion}>
                          Dominant Emotion: <Text style={{ fontWeight: '700' }}>{iv.dominant_emotion}</Text>
                        </Text>
                      )}

                      {/* Emotion distribution bars */}
                      {iv.emotion_distribution && Object.keys(iv.emotion_distribution).length > 0 && (
                        <View style={styles.scoresContainer}>
                          <Text style={styles.scoresHeading}>Emotion Distribution</Text>
                          {Object.entries(iv.emotion_distribution)
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
                      {iv.top_signals && iv.top_signals.length > 0 && (
                        <View style={styles.signalsContainer}>
                          <Text style={styles.scoresHeading}>Top Signals</Text>
                          {iv.top_signals.map((sig: string, idx: number) => (
                            <Text key={idx} style={styles.signalItem}>• {sig}</Text>
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
                          <Text style={styles.insightTitle}>🧠 AI Insight</Text>
                          <Text style={styles.insightText}>{gate2Insight}</Text>
                        </View>
                      )}
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
    backgroundColor: '#5C9A9A',
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
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 20,
    marginHorizontal: 3,
  },
  filterTabActive: {
    backgroundColor: '#5C9A9A',
  },
  filterText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
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
    backgroundColor: '#5C9A9A',
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
    backgroundColor: '#5C9A9A',
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
    backgroundColor: '#5C9A9A',
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
  // Interview workflow styles
  assessmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  assessmentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 10,
  },
  assessmentText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  interviewResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
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
    flex: 1,
    backgroundColor: '#3498db',
    borderRadius: 20,
    paddingVertical: 10,
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
    flex: 2,
    backgroundColor: '#FF9800',
    borderRadius: 20,
    paddingVertical: 12,
    alignItems: 'center',
  },
  startInterviewButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  finalStatusContainer: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  finalStatusText: {
    fontSize: 15,
    fontWeight: '600',
  },
  closedStatusText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#9E9E9E',
  },
  // View Analysis button
  viewAnalysisButton: {
    marginTop: 10,
    backgroundColor: '#8B5CF6',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  viewAnalysisButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // ── Modal styles ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: 18,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    maxHeight: '90%',
    padding: 20,
  },
  modalLoading: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  modalLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalSection: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#444',
    marginBottom: 10,
  },
  decisionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  decisionBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  decisionBadgeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  confidenceText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#555',
  },
  dominantEmotion: {
    fontSize: 14,
    color: '#555',
    marginBottom: 8,
  },
  scoresContainer: {
    marginTop: 8,
  },
  scoresHeading: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  scoreLabel: {
    width: 70,
    fontSize: 12,
    color: '#555',
    textTransform: 'capitalize',
  },
  scoreBarBg: {
    flex: 1,
    height: 10,
    backgroundColor: '#e0e0e0',
    borderRadius: 5,
    overflow: 'hidden',
    marginHorizontal: 6,
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  scoreValue: {
    width: 48,
    textAlign: 'right',
    fontSize: 12,
    color: '#555',
    fontWeight: '600',
  },
  signalsContainer: {
    marginTop: 8,
  },
  signalItem: {
    fontSize: 13,
    color: '#555',
    marginBottom: 3,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  statLabel: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  insightCard: {
    marginTop: 10,
    backgroundColor: '#EDE9FE',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#8B5CF6',
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6D28D9',
    marginBottom: 4,
  },
  insightText: {
    fontSize: 13,
    color: '#4C1D95',
    lineHeight: 19,
  },
  noDataText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    paddingVertical: 30,
  },
  modalCloseButton: {
    marginTop: 12,
    backgroundColor: '#8B5CF6',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
