/**
 * Admin Applications Screen - View all job posts from clients
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
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api, Job } from '../services/api';

type FilterStatus = 'all' | 'new' | 'contacted' | 'closed';

export default function AdminApplicationsScreen() {
  const [jobs, setJobs] = useState<Job[]>([]);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return '#4CAF50';
      case 'contacted':
        return '#2196F3';
      case 'closed':
        return '#9E9E9E';
      default:
        return '#666';
    }
  };

  const filters: { key: FilterStatus; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'new', label: 'New' },
    { key: 'contacted', label: 'Contacted' },
    { key: 'closed', label: 'Closed' },
  ];

  const renderJob = ({ item }: { item: Job }) => (
    <View style={styles.jobCard}>
      <View style={styles.jobHeader}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>{item.title.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.jobInfo}>
          <Text style={styles.jobTitle}>{item.title}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
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
      </View>

      <View style={styles.jobActions}>
        {item.status === 'new' && (
          <>
            <TouchableOpacity
              style={styles.contactButton}
              onPress={() => handleContactClient(item)}
            >
              <Text style={styles.contactButtonText}>📞 Contact Client</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => handleCloseJob(item)}
            >
              <Text style={styles.closeButtonText}>✗ Close</Text>
            </TouchableOpacity>
          </>
        )}
        {item.status === 'contacted' && (
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => handleCloseJob(item)}
          >
            <Text style={styles.closeButtonText}>✗ Close Job</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Job Posts</Text>
        <Text style={styles.headerSubtitle}>{jobs.length} total job posts</Text>
      </View>

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
});
