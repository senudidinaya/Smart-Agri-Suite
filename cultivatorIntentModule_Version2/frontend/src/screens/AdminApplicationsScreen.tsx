/**
 * Admin Applications Screen - Manage job applications
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { api, Application } from '../services/api';

type FilterStatus = 'all' | 'new' | 'contacted' | 'accepted' | 'rejected';

export default function AdminApplicationsScreen() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterStatus>('all');

  const loadApplications = useCallback(async () => {
    try {
      const statusParam = filter === 'all' ? undefined : filter;
      const result = await api.getApplications(statusParam);
      setApplications(result.applications);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadApplications();
    setRefreshing(false);
  };

  const handleStatusUpdate = async (app: Application, newStatus: string) => {
    try {
      await api.updateApplicationStatus(app.id, { status: newStatus });
      Alert.alert('Success', `Application marked as ${newStatus}`);
      loadApplications();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleCallFarmer = (app: Application) => {
    // In real app, would get phone from profile
    Alert.alert(
      'Contact Farmer',
      `Would you like to contact ${app.applicantName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark as Contacted',
          onPress: () => handleStatusUpdate(app, 'contacted'),
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
      case 'accepted':
        return '#8BC34A';
      case 'rejected':
        return '#F44336';
      default:
        return '#666';
    }
  };

  const filters: { key: FilterStatus; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'new', label: 'New' },
    { key: 'contacted', label: 'Contacted' },
    { key: 'accepted', label: 'Verified' },
  ];

  const renderApplication = ({ item }: { item: Application }) => (
    <View style={styles.appCard}>
      <View style={styles.appHeader}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>{item.applicantName.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.appInfo}>
          <Text style={styles.appName}>{item.applicantName}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
          </View>
        </View>
      </View>

      <View style={styles.appDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>District:</Text>
          <Text style={styles.detailValue}>{item.applicantDistrict}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Work Type:</Text>
          <Text style={styles.detailValue}>{item.workType}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Availability:</Text>
          <Text style={styles.detailValue}>{item.availability}</Text>
        </View>
      </View>

      <View style={styles.appActions}>
        {item.status === 'new' && (
          <>
            <TouchableOpacity
              style={styles.callButton}
              onPress={() => handleCallFarmer(item)}
            >
              <Text style={styles.callButtonText}>📞 Call Farmer</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={() => handleStatusUpdate(item, 'accepted')}
            >
              <Text style={styles.acceptButtonText}>✓ Accept</Text>
            </TouchableOpacity>
          </>
        )}
        {item.status === 'contacted' && (
          <>
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={() => handleStatusUpdate(item, 'accepted')}
            >
              <Text style={styles.acceptButtonText}>✓ Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.rejectButton}
              onPress={() => handleStatusUpdate(item, 'rejected')}
            >
              <Text style={styles.rejectButtonText}>✗ Reject</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📋</Text>
      <Text style={styles.emptyText}>No applications found</Text>
      <Text style={styles.emptySubtext}>
        {filter === 'all' ? 'No applications yet' : `No ${filter} applications`}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Job Applications</Text>
        <Text style={styles.headerSubtitle}>{applications.length} total applications</Text>
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

      {/* Applications List */}
      <FlatList
        data={applications}
        renderItem={renderApplication}
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
  appCard: {
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
  appHeader: {
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
  appInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  appName: {
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
  appDetails: {
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
  appActions: {
    flexDirection: 'row',
    gap: 10,
  },
  callButton: {
    flex: 1,
    backgroundColor: '#5C9A9A',
    borderRadius: 20,
    paddingVertical: 10,
    alignItems: 'center',
  },
  callButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#8BC34A',
    borderRadius: 20,
    paddingVertical: 10,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  rejectButton: {
    flex: 1,
    backgroundColor: '#F44336',
    borderRadius: 20,
    paddingVertical: 10,
    alignItems: 'center',
  },
  rejectButtonText: {
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
