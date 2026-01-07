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
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { api, Job, InterviewStatusResponse } from '../services/api';

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

  const loadJobs = useCallback(async () => {
    try {
      const result = await api.getJobs();
      // Filter based on selected filter
      const filteredJobs = filter === 'all' 
        ? result.jobs 
        : result.jobs.filter((job: Job) => job.status === filter);
      setJobs(filteredJobs);
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
      
      // Navigate to AdminCallScreen with call details
      navigation.navigate('AdminCall', {
        callId: response.callId,
        roomName: response.roomName,
        livekitUrl: response.livekitUrl,
        token: response.token,
        clientUsername: job.createdByUsername,
        jobTitle: job.title,
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

  const handleViewCallAssessment = (job: ExtendedJob) => {
    const assessment = job.interviewStatus?.callAssessment;
    if (!assessment) {
      Alert.alert('No Assessment', 'No call assessment available for this job.');
      return;
    }
    
    Alert.alert(
      'Call Assessment',
      `Decision: ${assessment.decision}\nConfidence: ${(assessment.confidence * 100).toFixed(1)}%\n\nReasons:\n${assessment.reasons.join('\n') || 'None recorded'}`,
      [{ text: 'OK' }]
    );
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
          <Text style={styles.detailLabel}>Rate/Day:</Text>
          <Text style={styles.detailValue}>Rs. {item.ratePerDay}</Text>
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
          <View style={styles.interviewResultRow}>
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
          </View>
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
});
