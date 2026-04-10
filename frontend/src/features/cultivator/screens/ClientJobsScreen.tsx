/**
 * Client Jobs Screen - View my posted jobs
 */

import React, { useState, useCallback, useMemo } from 'react';
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
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api, Job } from '../services/api';

type FilterKey = 'total' | 'active' | 'rejected' | 'closed';

export default function ClientJobsScreen() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<FilterKey>('total');

  const loadJobs = useCallback(async () => {
    try {
      const result = await api.getMyJobs();
      setJobs(result.jobs);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }, []);

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

  const handleCloseJob = async (job: Job) => {
    Alert.alert(
      'Close Job',
      `Are you sure you want to close "${job.title}"?`,
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return '#1f9d55';
      case 'contacted':
        return '#1f6fe5';
      case 'rejected':
        return '#c9413b';
      case 'closed':
        return '#6b7280';
      default:
        return '#666';
    }
  };

  const getStatusLabel = (status: string) => {
    if (status === 'new') return 'Active';
    if (status === 'contacted') return 'Contacted';
    if (status === 'rejected') return 'Rejected';
    if (status === 'closed') return 'Closed';
    return status;
  };

  const getEffectiveFilterStatus = (status: string): Exclude<FilterKey, 'total'> => {
    const normalized = status.toLowerCase();
    if (normalized === 'closed') return 'closed';
    if (normalized === 'rejected') return 'rejected';
    return 'active';
  };

  const summary = useMemo(() => {
    const totals = {
      total: jobs.length,
      active: 0,
      rejected: 0,
      closed: 0,
    };

    jobs.forEach((job) => {
      const effective = getEffectiveFilterStatus(job.status);
      if (effective === 'active') totals.active += 1;
      if (effective === 'rejected') totals.rejected += 1;
      if (effective === 'closed') totals.closed += 1;
    });

    return totals;
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    if (selectedFilter === 'total') return jobs;
    return jobs.filter((job) => getEffectiveFilterStatus(job.status) === selectedFilter);
  }, [jobs, selectedFilter]);

  const filterDescriptions: Record<FilterKey, string> = {
    total: 'Shows all your job posts.',
    active: 'Shows job posts that are still ongoing and not yet closed or rejected.',
    rejected: 'Shows job posts that were rejected and are no longer moving forward.',
    closed: 'Shows job posts you closed or that are no longer active.',
  };

  const renderJob = ({ item }: { item: Job }) => (
    <View style={styles.jobCard}>
      <View style={styles.jobTopRow}>
        <Text style={styles.jobTitle} numberOfLines={2}>{item.title}</Text>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: `${getStatusColor(item.status)}18`,
              borderColor: `${getStatusColor(item.status)}55`,
            },
          ]}
        >
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{getStatusLabel(item.status)}</Text>
        </View>
      </View>

      <Text style={styles.cardSubtitle}>Job details</Text>

      <View style={styles.jobDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailIcon}>📍</Text>
          <Text style={styles.detailText}>{item.districtOrLocation}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailIcon}>📅</Text>
          <Text style={styles.detailText}>{item.startsOnText}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailIcon}>🌿</Text>
          <Text style={styles.detailText}>{item.priorExperience}</Text>
        </View>
      </View>

      {item.status !== 'closed' && (
        <View style={styles.actionRow}>
          <View style={styles.openStatusHint}>
            <Text style={styles.openStatusHintText}>Posting is currently active</Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={() => handleCloseJob(item)}>
            <Text style={styles.closeButtonText}>Close Job</Text>
          </TouchableOpacity>
        </View>
      )}

      {item.status === 'closed' && (
        <View style={styles.closedFooter}>
          <Text style={styles.closedFooterText}>This job post is closed</Text>
        </View>
      )}
    </View>
  );

  const renderSummary = () => (
    <View style={styles.summaryRow}>
      <TouchableOpacity
        style={[styles.summaryCard, selectedFilter === 'total' && styles.summaryCardActive]}
        onPress={() => setSelectedFilter('total')}
        activeOpacity={0.85}
      >
        <Text style={[styles.summaryLabel, selectedFilter === 'total' && styles.summaryLabelActive]}>Total</Text>
        <Text style={[styles.summaryValue, selectedFilter === 'total' && styles.summaryValueActive]}>{summary.total}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.summaryCard, selectedFilter === 'active' && styles.summaryCardActive]}
        onPress={() => setSelectedFilter('active')}
        activeOpacity={0.85}
      >
        <Text style={[styles.summaryLabel, selectedFilter === 'active' && styles.summaryLabelActive]}>Active</Text>
        <Text style={[styles.summaryValue, selectedFilter === 'active' && styles.summaryValueActive]}>{summary.active}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.summaryCard, selectedFilter === 'rejected' && styles.summaryCardActive]}
        onPress={() => setSelectedFilter('rejected')}
        activeOpacity={0.85}
      >
        <Text style={[styles.summaryLabel, selectedFilter === 'rejected' && styles.summaryLabelActive]}>Rejected</Text>
        <Text style={[styles.summaryValue, selectedFilter === 'rejected' && styles.summaryValueActive]}>{summary.rejected}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.summaryCard, selectedFilter === 'closed' && styles.summaryCardActive]}
        onPress={() => setSelectedFilter('closed')}
        activeOpacity={0.85}
      >
        <Text style={[styles.summaryLabel, selectedFilter === 'closed' && styles.summaryLabelActive]}>Closed</Text>
        <Text style={[styles.summaryValue, selectedFilter === 'closed' && styles.summaryValueActive]}>{summary.closed}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmpty = () => {
    const emptyTitle =
      selectedFilter === 'active'
        ? 'No active jobs'
        : selectedFilter === 'rejected'
          ? 'No rejected jobs'
          : selectedFilter === 'closed'
            ? 'No closed jobs'
            : 'You have not posted any jobs yet';

    const emptyHint =
      selectedFilter === 'total'
        ? 'Open My Job Posting to create your first job post.'
        : `Try switching to another filter to view other job posts.`;

    return (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📋</Text>
      <Text style={styles.emptyText}>{emptyTitle}</Text>
      <Text style={styles.emptySubtext}>{emptyHint}</Text>
    </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Job Posts</Text>
        <Text style={styles.headerSubtitle}>Manage your opportunities and track status</Text>
      </View>

      {renderSummary()}

      <Text style={styles.filterDescription}>{filterDescriptions[selectedFilter]}</Text>

      <Text style={styles.sectionTitle}>Your Job Postings</Text>

      <FlatList
        data={filteredJobs}
        renderItem={renderJob}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={!loading ? renderEmpty : null}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#27ae60']} />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f5f4',
  },
  header: {
    backgroundColor: '#1f8b4c',
    paddingHorizontal: 20,
    paddingVertical: 18,
    paddingTop: 14,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginTop: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e4e8e6',
    paddingVertical: 10,
    alignItems: 'center',
  },
  summaryCardActive: {
    backgroundColor: '#1f8b4c',
    borderColor: '#1f8b4c',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#64726a',
    marginBottom: 4,
  },
  summaryLabelActive: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1d2b24',
  },
  summaryValueActive: {
    color: '#fff',
  },
  filterDescription: {
    fontSize: 12,
    color: '#66766e',
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 2,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#26342d',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  jobCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e9e7',
    ...Platform.select({
      web: {
        boxShadow: '0px 6px 14px rgba(23, 33, 28, 0.06)',
      },
      default: {
        shadowColor: '#101a15',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
      },
    }),
  },
  jobTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  jobTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1f2d26',
    flex: 1,
    marginRight: 10,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#7a8881',
    marginBottom: 10,
    fontWeight: '600',
  },
  jobDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 7,
  },
  detailIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#4f5d56',
    flexShrink: 1,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  openStatusHint: {
    flex: 1,
    backgroundColor: '#eef6f1',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 10,
  },
  openStatusHintText: {
    color: '#3f6752',
    fontSize: 12,
    fontWeight: '500',
  },
  closeButton: {
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#de5b54',
    backgroundColor: '#fff',
  },
  closeButtonText: {
    color: '#c9413b',
    fontSize: 13,
    fontWeight: '700',
  },
  closedFooter: {
    marginTop: 2,
    backgroundColor: '#f2f4f3',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 10,
  },
  closedFooterText: {
    color: '#67756e',
    fontSize: 12,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 70,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    fontSize: 46,
    marginBottom: 14,
  },
  emptyText: {
    fontSize: 16,
    color: '#4f5d56',
    marginBottom: 6,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 13,
    color: '#7b8882',
    textAlign: 'center',
    lineHeight: 19,
  },
});
