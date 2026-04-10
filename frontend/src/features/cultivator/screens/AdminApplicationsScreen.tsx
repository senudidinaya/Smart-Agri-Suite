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
import {
  api,
  Application,
  Gate2CombinedAssessment,
  Gate2RawDeception,
  Gate2RawEmotion,
  Job,
  InterviewStatusResponse,
} from '../services/api';

type FilterStatus = 'all' | 'new' | 'contacted' | 'invited_interview' | 'approved' | 'rejected' | 'closed';

// Extended Job interface with interview status
interface ExtendedJob extends Job {
  applicationId?: string;
  applicantUserId?: string;
  applicantName?: string;
  interviewStatus?: InterviewStatusResponse;
  applicationStatus?: string;
}

const DECISION_FILTERS = new Set<FilterStatus>(['invited_interview', 'approved', 'rejected']);

const getRowKey = (job: ExtendedJob) => job.applicationId || `${job.id}:${job.applicantUserId || 'unknown'}`;

const resolveFilterStatus = (job: ExtendedJob, activeFilter: FilterStatus): string => {
  if (DECISION_FILTERS.has(activeFilter)) {
    return job.applicationStatus || job.status;
  }

  return job.status;
};

const getDisplayStatusLabel = (status: string) => {
  switch (status) {
    case 'new':
      return 'New';
    case 'contacted':
      return 'Contacted';
    case 'invited_interview':
      return 'Interview Invited';
    case 'approved':
      return 'Approved';
    case 'rejected':
      return 'Rejected';
    case 'closed':
      return 'Closed';
    default:
      return String(status)
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
};

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
      const [jobResult, applicationResult] = await Promise.all([
        api.getJobs(),
        api.getApplications(),
      ]);

      // Keep jobs as the base list so the screen still renders when no applications
      // exist or when application rows do not join cleanly for some jobs.
      const applicationByJobId = new Map<string, Application>();
      applicationResult.applications.forEach((application: Application) => {
        if (!applicationByJobId.has(application.jobId)) {
          applicationByJobId.set(application.jobId, application);
        }
      });

      const mergedRows = jobResult.jobs.map((job) => {
        const application = applicationByJobId.get(job.id);
        if (!application) {
          return {
            ...job,
            applicationId: undefined,
            applicantUserId: undefined,
            applicantName: undefined,
            applicationStatus: undefined,
          } as ExtendedJob;
        }

        return {
          ...job,
          applicationId: application.id,
          applicantUserId: application.applicantUserId,
          applicantName: application.applicantName,
          applicationStatus: application.status,
        } as ExtendedJob;
      });

      const baseCandidates = filter === 'all'
        ? mergedRows
        : mergedRows.filter((job) => resolveFilterStatus(job, filter) === filter);

      setJobs(baseCandidates);

      // Enrich interview status in background without blocking list rendering.
      Promise.allSettled(
        baseCandidates.map(async (job) => {
            const interviewStatus = await api.getInterviewStatus(job.id, job.createdByUserId);
            return { rowKey: getRowKey(job), interviewStatus };
          })
      ).then((results) => {
        const statusMap = new Map<string, InterviewStatusResponse>();
        results.forEach((result) => {
          if (result.status === 'fulfilled') {
            statusMap.set(result.value.rowKey, result.value.interviewStatus);
          }
        });

        const enrichedJobs = baseCandidates.map((job) => {
          const interviewStatus = statusMap.get(getRowKey(job));
          return {
            ...job,
            interviewStatus: interviewStatus ?? undefined,
            applicationStatus: job.applicationStatus,
          } as ExtendedJob;
        });

        setJobs(enrichedJobs);
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

  const filters: { key: FilterStatus; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'new', label: 'New' },
    { key: 'contacted', label: 'Contacted' },
    { key: 'invited_interview', label: 'Interview Invited' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
    { key: 'closed', label: 'Closed' },
  ];

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

  const handleRejectJob = async (job: Job) => {
    Alert.alert(
      'Reject Job',
      `Are you sure you want to reject this job post from ${job.createdByUsername}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.updateJobStatus(job.id, 'rejected');
              Alert.alert('Success', 'Job has been rejected');
              loadJobs();
            } catch (e: any) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ]
    );
  };

  const handleApproveJob = async (job: Job) => {
    Alert.alert(
      'Approve Job',
      `Are you sure you want to approve this job post from ${job.createdByUsername}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              await api.updateJobStatus(job.id, 'approved');
              Alert.alert('Success', 'Job has been approved');
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
        priorExperience: job.priorExperience,
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
      priorExperience: job.priorExperience,
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
              await api.rejectApplication(job.id, job.applicantUserId || job.createdByUserId);
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
          api.getGate1Insight(ca.decision, ca.confidence * 100, scores, {
            recommendation: ca.recommendation,
            trustScore: ca.trustScore != null ? ca.trustScore * 100 : undefined,
            riskLevel: ca.riskLevel,
            reasoning: ca.reasoning,
            reasons: ca.reasons.length ? ca.reasons : undefined,
            deceptionLabel: ca.deceptionLabel,
            deceptionConfidence: ca.deceptionConfidence != null ? ca.deceptionConfidence * 100 : undefined,
          })
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
            {
              combinedReasoning: iv.combinedAssessment?.reasoning,
              trustScore: iv.combinedAssessment?.trustScore != null ? iv.combinedAssessment.trustScore * 100 : undefined,
              riskLevel: iv.combinedAssessment?.riskLevel,
              rawEmotion: iv.rawEmotion as Record<string, any> | undefined,
              rawDeception: iv.rawDeception as Record<string, any> | undefined,
              safetyAssessment: iv.safety_assessment as Record<string, any> | undefined,
            },
          )
            .then(res => { if (res.success) setGate2Insight(res.insight); })
            .catch(() => {})
        );
      }

      await Promise.all(promises);
      setInsightLoading(false);
    } catch {
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

  const formatGate2Percent = (value?: number | null) => {
    if (typeof value !== 'number' || Number.isNaN(value)) return 'N/A';
    const normalized = value <= 1 ? value * 100 : value;
    return `${normalized.toFixed(1)}%`;
  };

  const getBranchStatusColor = (degraded?: boolean) => degraded ? '#e74c3c' : '#27ae60';

  const renderGate2StatusChip = (label: string, degraded?: boolean, key?: string) => (
    <View key={key} style={[styles.evidenceChip, { backgroundColor: getBranchStatusColor(degraded) }]}>
      <Text style={styles.evidenceChipText}>{label}</Text>
    </View>
  );

  const renderGate2ScoreBars = (scores?: Record<string, number>, color = '#8B5CF6') => {
    if (!scores || Object.keys(scores).length === 0) return null;

    return (
      <View style={styles.scoresContainer}>
        {Object.entries(scores)
          .sort(([, a], [, b]) => b - a)
          .map(([label, value]) => {
            const normalized = value <= 1 ? value * 100 : value;
            return (
              <View key={label} style={styles.scoreRow}>
                <Text style={styles.scoreLabel}>{label}</Text>
                <View style={styles.scoreBarBg}>
                  <View
                    style={[
                      styles.scoreBarFill,
                      {
                        width: `${Math.min(normalized, 100)}%`,
                        backgroundColor: color,
                      },
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

  const renderGate2ReasonList = (items?: string[], emptyText = 'No details reported.') => (
    <View style={styles.signalsContainer}>
      {(items && items.length > 0 ? items : [emptyText]).map((item, index) => (
        <Text key={`${item}-${index}`} style={styles.signalItem}>• {item}</Text>
      ))}
    </View>
  );

  const renderCombinedEvidencePanel = (combined: Gate2CombinedAssessment) => {
    const degradedBranches = combined.degradedBranches ?? [];

    return (
      <View style={[styles.evidencePanel, styles.combinedEvidencePanel]}>
        <Text style={styles.evidenceTitle}>Final Combined Gate-2 Assessment</Text>
        <View style={styles.evidenceHeaderRow}>
          <View style={[styles.decisionBadge, { backgroundColor: getDecisionColor(combined.finalDecision) }]}>
            <Text style={styles.decisionBadgeText}>{combined.finalDecision}</Text>
          </View>
          <Text style={styles.confidenceText}>
            Overall confidence: {formatGate2Percent(combined.overallConfidence)}
          </Text>
        </View>
        <Text style={styles.evidenceMeta}>Risk level: {combined.riskLevel}</Text>
        <Text style={styles.evidenceMeta}>Recommendation: {combined.recommendation}</Text>
        <View style={styles.evidenceChipRow}>
          {degradedBranches.length > 0
            ? degradedBranches.map((branch) => renderGate2StatusChip(`${branch} degraded`, true, branch))
            : renderGate2StatusChip('all branches healthy', false)}
        </View>
        <Text style={styles.scoresHeading}>Combined Reasoning</Text>
        {renderGate2ReasonList(combined.reasoning)}
      </View>
    );
  };

  const renderRawEmotionPanel = (
    rawEmotion: Gate2RawEmotion | undefined,
    legacyEmotion: {
      decision?: string;
      confidence?: number;
      dominantEmotion?: string;
      emotionDistribution?: Record<string, number>;
      topSignals?: string[];
      stats?: Record<string, any>;
      modelVersion?: string;
    },
  ) => {
    const degraded = rawEmotion ? rawEmotion.degraded : true;
    const dominantEmotion = rawEmotion?.dominantEmotion ?? legacyEmotion.dominantEmotion ?? 'unknown';
    const distribution = rawEmotion?.emotionDistribution ?? legacyEmotion.emotionDistribution;
    const topSignals = rawEmotion?.topSignals ?? legacyEmotion.topSignals;
    const stats = rawEmotion?.stats ?? legacyEmotion.stats;

    return (
      <View style={[styles.evidencePanel, degraded && styles.degradedEvidencePanel]}>
        <View style={styles.evidenceHeaderRow}>
          <Text style={styles.evidenceTitle}>Raw Emotion Evidence</Text>
          {renderGate2StatusChip(rawEmotion ? (degraded ? 'degraded' : 'healthy') : 'legacy only', degraded)}
        </View>
        <Text style={styles.evidenceMeta}>Raw emotion decision: {rawEmotion?.decision ?? legacyEmotion.decision ?? 'unknown'}</Text>
        <Text style={styles.evidenceMeta}>Raw emotion confidence: {formatGate2Percent(rawEmotion?.confidence ?? legacyEmotion.confidence)}</Text>
        <Text style={styles.evidenceMeta}>Dominant emotion: {dominantEmotion}</Text>
        {(rawEmotion?.modelVersion || legacyEmotion.modelVersion) && (
          <Text style={styles.evidenceMeta}>Model version: {rawEmotion?.modelVersion ?? legacyEmotion.modelVersion}</Text>
        )}
        {rawEmotion?.fallbackReason && (
          <Text style={styles.fallbackText}>Fallback reason: {rawEmotion.fallbackReason}</Text>
        )}
        {!rawEmotion && (
          <Text style={styles.fallbackText}>Raw emotion health metadata was not returned; showing legacy emotion fields only.</Text>
        )}
        <Text style={styles.scoresHeading}>Raw Emotion Distribution</Text>
        {renderGate2ScoreBars(distribution, '#8B5CF6')}
        <Text style={styles.scoresHeading}>Raw Emotion Signals</Text>
        {renderGate2ReasonList(topSignals)}
        {stats && (
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.frames_used ?? stats.frames_analyzed ?? '-'}</Text>
              <Text style={styles.statLabel}>Frames</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.predictions_count ?? '-'}</Text>
              <Text style={styles.statLabel}>Predictions</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.faces_detected ?? stats.faces_detected_frames ?? '-'}</Text>
              <Text style={styles.statLabel}>Faces</Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderRawDeceptionPanel = (rawDeception?: Gate2RawDeception) => {
    if (!rawDeception) {
      return (
        <View style={[styles.evidencePanel, styles.degradedEvidencePanel]}>
          <View style={styles.evidenceHeaderRow}>
            <Text style={styles.evidenceTitle}>Raw Deception Evidence</Text>
            {renderGate2StatusChip('not returned', true)}
          </View>
          <Text style={styles.fallbackText}>Raw Gate-2 deception evidence was not returned for this interview.</Text>
        </View>
      );
    }

    return (
      <View style={[styles.evidencePanel, rawDeception.degraded && styles.degradedEvidencePanel]}>
        <View style={styles.evidenceHeaderRow}>
          <Text style={styles.evidenceTitle}>Raw Deception Evidence</Text>
          {renderGate2StatusChip(rawDeception.degraded ? 'degraded' : 'healthy', rawDeception.degraded)}
        </View>
        <Text style={styles.evidenceMeta}>Raw deception label: {rawDeception.label}</Text>
        <Text style={styles.evidenceMeta}>Raw deception confidence: {formatGate2Percent(rawDeception.confidence)}</Text>
        {rawDeception.modelType && <Text style={styles.evidenceMeta}>Model type: {rawDeception.modelType}</Text>}
        {rawDeception.modelVersion && <Text style={styles.evidenceMeta}>Model version: {rawDeception.modelVersion}</Text>}
        {rawDeception.fallbackReason && (
          <Text style={styles.fallbackText}>Fallback reason: {rawDeception.fallbackReason}</Text>
        )}
        <Text style={styles.scoresHeading}>Raw Deception Scores</Text>
        {renderGate2ScoreBars(rawDeception.scores, '#e67e22') ?? (
          <Text style={styles.evidenceMeta}>No score distribution reported.</Text>
        )}
        <Text style={styles.scoresHeading}>Raw Deception Signals</Text>
        {renderGate2ReasonList(rawDeception.topSignals)}
      </View>
    );
  };

  const renderJob = ({ item }: { item: ExtendedJob }) => {
    const status = resolveFilterStatus(item, filter);
    const displayStatusLabel = getDisplayStatusLabel(status);
    const hasCallAssessment = item.interviewStatus?.callAssessment != null;
    const interviewCompleted = item.interviewStatus?.interview?.status === 'completed';
    const hasApplication = Boolean(item.applicationId || item.applicantUserId || item.applicationStatus);

    return (
    <View style={styles.jobCard}>
      <View style={styles.jobHeader}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>{item.title.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.jobInfo}>
          <Text style={styles.jobTitle}>{item.title}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) }]}>
            <Text style={styles.statusText}>{displayStatusLabel}</Text>
          </View>
        </View>
      </View>

      <View style={styles.jobDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Posted By:</Text>
          <Text style={styles.detailValue}>{item.applicantName || item.createdByUsername}</Text>
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
            {hasApplication ? (
              <TouchableOpacity
                style={styles.rejectButton}
                onPress={() => handleRejectApplication(item)}
              >
                <Text style={styles.rejectButtonText}>✗ Reject</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.approveButton}
                  onPress={() => handleApproveJob(item)}
                >
                  <Text style={styles.approveButtonText}>✓ Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.rejectButton}
                  onPress={() => handleRejectJob(item)}
                >
                  <Text style={styles.rejectButtonText}>✗ Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => handleCloseJob(item)}
                >
                  <Text style={styles.closeButtonText}>✗ Close</Text>
                </TouchableOpacity>
              </>
            )}
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
            {hasApplication ? (
              <TouchableOpacity
                style={styles.rejectButton}
                onPress={() => handleRejectApplication(item)}
              >
                <Text style={styles.rejectButtonText}>✗ Reject</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.approveButton}
                  onPress={() => handleApproveJob(item)}
                >
                  <Text style={styles.approveButtonText}>✓ Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.rejectButton}
                  onPress={() => handleRejectJob(item)}
                >
                  <Text style={styles.rejectButtonText}>✗ Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => handleCloseJob(item)}
                >
                  <Text style={styles.closeButtonText}>✗ Close</Text>
                </TouchableOpacity>
              </>
            )}
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
            {hasApplication ? (
              <TouchableOpacity
                style={styles.rejectButton}
                onPress={() => handleRejectApplication(item)}
              >
                <Text style={styles.rejectButtonText}>✗ Reject</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.approveButton}
                  onPress={() => handleApproveJob(item)}
                >
                  <Text style={styles.approveButtonText}>✓ Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.rejectButton}
                  onPress={() => handleRejectJob(item)}
                >
                  <Text style={styles.rejectButtonText}>✗ Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => handleCloseJob(item)}
                >
                  <Text style={styles.closeButtonText}>✗ Close</Text>
                </TouchableOpacity>
              </>
            )}
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
        {filter === 'all'
          ? 'No job posts yet'
          : `No ${getDisplayStatusLabel(filter).toLowerCase()} job posts`}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.filtersPanel}>
        <Text style={styles.screenTitle}>Cultivator Intention Analyzer</Text>
        <Text style={styles.screenSubtitle}>
          Review client job applications with a cleaner filter bar and more readable screening cards.
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroll}
          contentContainerStyle={styles.chipScrollContent}
        >
          {filters.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
              onPress={() => {
                setFilter(f.key);
                setLoading(true);
              }}
            >
              <Text style={[styles.filterChipText, filter === f.key && styles.filterChipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.filterSummaryRow}>
          <Text style={styles.filterSummaryText}>
            Showing {jobs.length} {jobs.length === 1 ? 'job post' : 'job posts'}
          </Text>
          <Text style={styles.filterSummaryText}>
            {filters.find((item) => item.key === filter)?.label}
          </Text>
        </View>
      </View>

      <FlatList
        data={jobs}
        renderItem={renderJob}
        keyExtractor={(item) => getRowKey(item)}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={!loading ? renderEmpty : null}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#27ae60']} />
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
                      <Text style={styles.sectionTitle}>☎️ Final Gate-1 Combined Decision</Text>

                      <View style={styles.decisionRow}>
                        <View style={[styles.decisionBadge, { backgroundColor: getIntentColor(ca.decision) }]}>
                          <Text style={styles.decisionBadgeText}>{ca.decision}</Text>
                        </View>
                        <Text style={styles.confidenceText}>
                          Raw intent confidence: {(ca.confidence * 100).toFixed(1)}%
                        </Text>
                      </View>
                      <Text style={styles.summaryHintText}>
                        This is the final Gate-1 screening outcome after combining raw voice-intent output with truthfulness and risk signals.
                      </Text>

                      {(ca.deceptionLabel || ca.reasoning || typeof ca.trustScore === 'number' || ca.riskLevel) && (
                        <View style={styles.evidencePanel}>
                          <Text style={styles.evidenceTitle}>Why this decision was made</Text>
                          {ca.deceptionLabel && (
                            <Text style={styles.evidenceMeta}>
                              Audio truthfulness: {ca.deceptionLabel}
                              {typeof ca.deceptionConfidence === 'number' ? ` (${(ca.deceptionConfidence * 100).toFixed(1)}%)` : ''}
                            </Text>
                          )}
                          {typeof ca.trustScore === 'number' && (
                            <Text style={styles.evidenceMeta}>
                              Trust score: {(ca.trustScore * 100).toFixed(1)}%
                            </Text>
                          )}
                          {ca.riskLevel && (
                            <Text style={styles.evidenceMeta}>Risk level: {ca.riskLevel}</Text>
                          )}
                          {ca.reasoning && (
                            <Text style={styles.evidenceMeta}>{ca.reasoning}</Text>
                          )}
                        </View>
                      )}

                      {/* Score bars */}
                      {ca.scores && Object.keys(ca.scores).length > 0 && (
                        <View style={styles.scoresContainer}>
                          <Text style={styles.scoresHeading}>Raw Voice Intent Model Output</Text>
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
                  const combinedAssessment = iv.combinedAssessment ?? {
                    finalDecision: iv.analysisDecision!,
                    recommendation: 'Review the raw Gate-2 evidence before acting on this result.',
                    overallConfidence: iv.confidence ?? 0,
                    trustScore: iv.confidence ?? 0,
                    reasoning: iv.reasons ?? [],
                    riskLevel: 'unknown' as const,
                    degradedBranches: [],
                    rulePath: 'legacy_top_level_fallback',
                    aggregationVersion: 'legacy-compatible',
                  };
                  const rawDeception = iv.rawDeception ?? (iv.gate2_deception ? (() => {
                    const legacyDeceptionDegraded = iv.gate2_deception.deception_model_type === 'rules';
                    return {
                      label: iv.gate2_deception.deception_label,
                      confidence: iv.gate2_deception.deception_confidence,
                      scores: iv.gate2_deception.deception_scores ?? {},
                      topSignals: iv.gate2_deception.deception_signals ?? [],
                      stats: {},
                      modelType: iv.gate2_deception.deception_model_type,
                      fallbackReason: legacyDeceptionDegraded ? 'Legacy Gate-2 deception record used rules fallback' : undefined,
                      healthy: !legacyDeceptionDegraded,
                      degraded: legacyDeceptionDegraded,
                    };
                  })() : undefined);
                  return (
                    <View style={styles.modalSection}>
                      <Text style={styles.sectionTitle}>🎥 Gate-2 — Combined Interview Assessment</Text>

                      <Text style={styles.summaryHintText}>
                        Final assessment, raw emotion evidence, and raw deception evidence are shown separately to avoid mixing their meanings.
                      </Text>

                      {renderCombinedEvidencePanel(combinedAssessment)}
                      {renderRawEmotionPanel(iv.rawEmotion, {
                        dominantEmotion: iv.dominant_emotion,
                        emotionDistribution: iv.emotion_distribution,
                        topSignals: iv.top_signals,
                        stats: iv.stats,
                        modelVersion: iv.model_version,
                      })}
                      {renderRawDeceptionPanel(rawDeception)}

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
  filtersPanel: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e7ecef',
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2933',
  },
  screenSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: '#667085',
    marginTop: 4,
  },
  chipScroll: {
    marginTop: 12,
  },
  chipScrollContent: {
    paddingRight: 8,
  },
  filterChip: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#d7dde3',
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#e8f5ec',
    borderColor: '#27ae60',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#52606d',
  },
  filterChipTextActive: {
    color: '#1c7c45',
  },
  filterSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    gap: 12,
  },
  filterSummaryText: {
    fontSize: 12,
    color: '#667085',
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
  },
  jobCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    position: 'relative',
    borderWidth: 1,
    borderColor: '#edf1f3',
    ...Platform.select({
      web: {
        boxShadow: '0px 8px 20px rgba(15, 23, 42, 0.05)',
      },
      default: {
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
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
    alignItems: 'flex-start',
    marginBottom: 14,
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
    alignItems: 'flex-start',
  },
  jobTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#1f2933',
    marginRight: 10,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  jobDetails: {
    backgroundColor: '#f8fafb',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#eef2f4',
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 13,
    color: '#667085',
    width: 92,
  },
  detailValue: {
    fontSize: 13,
    color: '#1f2933',
    fontWeight: '600',
    flex: 1,
  },
  jobActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  callClientButton: {
    backgroundColor: '#1f8f4d',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    minWidth: 110,
  },
  callClientButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  contactButton: {
    flex: 1,
    minWidth: 140,
    backgroundColor: '#eef7f1',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cde8d6',
  },
  contactButtonText: {
    color: '#1c7c45',
    fontSize: 14,
    fontWeight: '600',
  },
  closeButton: {
    flex: 1,
    minWidth: 110,
    backgroundColor: '#fff5f4',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f3c8c3',
  },
  closeButtonText: {
    color: '#c0392b',
    fontSize: 14,
    fontWeight: '600',
  },
  approveButton: {
    flex: 1,
    minWidth: 110,
    backgroundColor: '#eef7f1',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: '#cde8d6',
  },
  approveButtonText: {
    color: '#1c7c45',
    fontSize: 14,
    fontWeight: '600' as const,
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
    paddingTop: 12,
    paddingBottom: 10,
    alignItems: 'stretch',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#edf1f3',
  },
  assessmentLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 8,
  },
  assessmentSummary: {
    alignItems: 'flex-start',
  },
  assessmentBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  assessmentText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  assessmentSubtext: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
    marginTop: 8,
  },
  interviewResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#edf1f3',
  },
  inviteButton: {
    flex: 1,
    minWidth: 150,
    backgroundColor: '#1f8f4d',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  inviteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  analysisButton: {
    flex: 1,
    minWidth: 120,
    backgroundColor: '#eff5fb',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cddff0',
  },
  analysisButtonText: {
    color: '#2f6ea8',
    fontSize: 14,
    fontWeight: '600',
  },
  rejectButton: {
    flex: 1,
    minWidth: 110,
    backgroundColor: '#fff5f4',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f3c8c3',
  },
  rejectButtonText: {
    color: '#c0392b',
    fontSize: 14,
    fontWeight: '600',
  },
  startInterviewButton: {
    flex: 2,
    minWidth: 170,
    backgroundColor: '#1f8f4d',
    borderRadius: 14,
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
    marginTop: 14,
    backgroundColor: '#f4f7fb',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dde6ef',
  },
  viewAnalysisButtonText: {
    color: '#2f6ea8',
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
    borderRadius: 18,
    maxHeight: '90%',
    padding: 18,
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
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ece7f7',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#444',
    marginBottom: 12,
  },
  decisionRow: {
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  decisionBadge: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
  },
  decisionBadgeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  confidenceText: {
    marginTop: 10,
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  summaryHintText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 19,
    marginBottom: 12,
    backgroundColor: '#f3effc',
    borderRadius: 10,
    padding: 10,
  },
  evidencePanel: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
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
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  evidenceTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
  },
  evidenceMeta: {
    fontSize: 12,
    color: '#555',
    lineHeight: 18,
    marginBottom: 4,
  },
  evidenceChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 8,
  },
  evidenceChip: {
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  evidenceChipText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  fallbackText: {
    fontSize: 12,
    color: '#a33',
    lineHeight: 18,
    marginVertical: 6,
    fontWeight: '600',
  },
  dominantEmotion: {
    fontSize: 14,
    color: '#555',
    marginBottom: 8,
  },
  scoresContainer: {
    marginTop: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
  },
  scoresHeading: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
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
