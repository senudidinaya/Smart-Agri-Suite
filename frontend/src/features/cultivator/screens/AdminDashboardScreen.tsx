/**
 * Admin Dashboard Screen — v1.1
 * Workflow-oriented landing page for cultivator admins.
 * Shows overview summary cards, needs-attention items, and quick-access navigation.
 * Uses only existing API endpoints — no backend changes required.
 *
 * v1.1 — Overview visual polish: refined stat cards, status-distribution bar
 * chart (react-native-chart-kit), subtle Reanimated entrance animations.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  ActivityIndicator,
  Platform,
  Dimensions,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { BarChart } from 'react-native-chart-kit';
import {
  api,
  Application,
  Job,
  InterviewStatusResponse,
} from '../services/api';

const SCREEN_WIDTH = Dimensions.get('window').width;

/* ── Derived types ── */

interface ExtendedJob extends Job {
  applicationId?: string;
  applicantUserId?: string;
  applicantName?: string;
  interviewStatus?: InterviewStatusResponse;
  applicationStatus?: string;
}

interface DashboardData {
  total: number;
  byStatus: Record<string, number>;
  needsAttention: ExtendedJob[];
  recentJobs: ExtendedJob[];
  aiNote: string | null;
}

const EMPTY_DASHBOARD: DashboardData = {
  total: 0,
  byStatus: {},
  needsAttention: [],
  recentJobs: [],
  aiNote: null,
};

/* ── Helpers ── */

const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  invited_interview: 'Interview Invited',
  approved: 'Approved',
  rejected: 'Rejected',
  closed: 'Closed',
};

const STATUS_COLORS: Record<string, string> = {
  new: '#4CAF50',
  contacted: '#2196F3',
  invited_interview: '#9C27B0',
  approved: '#27ae60',
  rejected: '#e74c3c',
  closed: '#9E9E9E',
};

const getStatusLabel = (status: string) =>
  STATUS_LABELS[status] ??
  status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());

const getStatusColor = (status: string) => STATUS_COLORS[status] ?? '#666';

/* ────────────────────────────────────────── */

export default function AdminDashboardScreen() {
  const navigation = useNavigation<any>();
  const [data, setData] = useState<DashboardData>(EMPTY_DASHBOARD);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = useCallback(async () => {
    try {
      const [jobResult, appResult] = await Promise.all([
        api.getJobs(),
        api.getApplications(),
      ]);

      // Merge applications onto jobs (same logic as AdminApplicationsScreen)
      const appByJobId = new Map<string, Application>();
      appResult.applications.forEach((a: Application) => {
        if (!appByJobId.has(a.jobId)) appByJobId.set(a.jobId, a);
      });

      const merged: ExtendedJob[] = jobResult.jobs.map((job) => {
        const app = appByJobId.get(job.id);
        return {
          ...job,
          applicationId: app?.id,
          applicantUserId: app?.applicantUserId,
          applicantName: app?.applicantName,
          applicationStatus: app?.status,
        } as ExtendedJob;
      });

      // Status counts
      const byStatus: Record<string, number> = {};
      merged.forEach((j) => {
        const s = j.applicationStatus || j.status;
        byStatus[s] = (byStatus[s] || 0) + 1;
      });

      // Needs-attention: new, contacted (no interview yet), or verify_required
      const attentionStatuses = new Set(['new', 'contacted', 'verify_required']);

      // Background-enrich interview status for attention candidates only
      const attentionCandidates = merged.filter(
        (j) => attentionStatuses.has(j.applicationStatus || j.status),
      );

      let needsAttention = attentionCandidates;

      // Enrich interview statuses to detect VERIFY outcomes and low confidence
      if (attentionCandidates.length > 0) {
        const results = await Promise.allSettled(
          attentionCandidates.map(async (j) => {
            const status = await api.getInterviewStatus(j.id, j.createdByUserId);
            return { id: j.id, status };
          }),
        );
        const statusMap = new Map<string, InterviewStatusResponse>();
        results.forEach((r) => {
          if (r.status === 'fulfilled') statusMap.set(r.value.id, r.value.status);
        });

        needsAttention = attentionCandidates.map((j) => ({
          ...j,
          interviewStatus: statusMap.get(j.id) ?? undefined,
        }));
      }

      // Also include any job whose interview resulted in VERIFY
      const verifyFromInterviews = merged.filter((j) => {
        if (attentionStatuses.has(j.applicationStatus || j.status)) return false;
        // Check application status for verify_required
        return j.applicationStatus === 'verify_required';
      });
      needsAttention = [...needsAttention, ...verifyFromInterviews];

      // Recent: last 5 by createdAt
      const recentJobs = [...merged]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);

      // AI note
      const verifyCount = byStatus['verify_required'] || 0;
      const newCount = byStatus['new'] || 0;
      let aiNote: string | null = null;
      if (verifyCount > 0) {
        aiNote = `${verifyCount} application${verifyCount > 1 ? 's' : ''} flagged VERIFY — review recommended before final decision.`;
      } else if (newCount > 3) {
        aiNote = `${newCount} new applications waiting — consider screening the oldest ones first.`;
      }

      setData({
        total: merged.length,
        byStatus,
        needsAttention,
        recentJobs,
        aiNote,
      });
    } catch {
      // Fail silently — dashboard is non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [loadDashboard]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  };

  const goToApplications = () => {
    navigation.navigate('Applications');
  };

  const statusOrder = ['new', 'contacted', 'invited_interview', 'approved', 'rejected', 'closed'];
  const displayStatuses = statusOrder.filter((s) => (data.byStatus[s] ?? 0) > 0);

  /* Bar chart data — derived from existing counts only */
  const chartData = useMemo(() => {
    const labels = displayStatuses.map(
      (s) => (STATUS_LABELS[s] ?? s).split(' ')[0], // short label for mobile
    );
    const values = displayStatuses.map((s) => data.byStatus[s] ?? 0);
    const colors = displayStatuses.map((s) => getStatusColor(s));
    return { labels, values, colors };
  }, [displayStatuses, data.byStatus]);

  const chartWidth = Math.max(SCREEN_WIDTH - 64, 220);

  /* Identify the "hero" stat — the largest non-total bucket */
  const heroStatus = useMemo(() => {
    let max = 0;
    let hero = '';
    displayStatuses.forEach((s) => {
      if ((data.byStatus[s] ?? 0) > max) {
        max = data.byStatus[s];
        hero = s;
      }
    });
    return hero;
  }, [displayStatuses, data.byStatus]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#27ae60" />
          <Text style={styles.loadingText}>Loading dashboard…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#27ae60']} />
        }
      >
        {/* ── Overview container ── */}
        <Animated.View entering={FadeInDown.duration(500).delay(80)} style={styles.overviewContainer}>
          <Text style={styles.overviewHeading}>Overview</Text>

          {/* Hero total card */}
          <View style={styles.heroCard}>
            <View style={styles.heroLeft}>
              <Text style={styles.heroNumber}>{data.total}</Text>
              <Text style={styles.heroLabel}>Total Applications</Text>
            </View>
            {heroStatus !== '' && (
              <View style={styles.heroRight}>
                <View style={[styles.heroBadge, { backgroundColor: getStatusColor(heroStatus) + '18' }]}>
                  <View style={[styles.heroBadgeDot, { backgroundColor: getStatusColor(heroStatus) }]} />
                  <Text style={[styles.heroBadgeText, { color: getStatusColor(heroStatus) }]}>
                    {data.byStatus[heroStatus]} {getStatusLabel(heroStatus)}
                  </Text>
                </View>
                <Text style={styles.heroHint}>Largest group</Text>
              </View>
            )}
          </View>

          {/* Status stat cards — 2-column grid */}
          <View style={styles.statsGrid}>
            {displayStatuses.map((s, i) => (
              <Animated.View
                key={s}
                entering={FadeInDown.duration(350).delay(150 + i * 60)}
              >
                <TouchableOpacity
                  style={styles.statCard}
                  onPress={goToApplications}
                  activeOpacity={0.75}
                >
                  <View style={[styles.statAccent, { backgroundColor: getStatusColor(s) }]} />
                  <View style={styles.statBody}>
                    <Text style={styles.statNumber}>{data.byStatus[s]}</Text>
                    <Text style={styles.statLabel}>{getStatusLabel(s)}</Text>
                  </View>
                  <View style={[styles.statPercentBg, { backgroundColor: getStatusColor(s) + '14' }]}>
                    <Text style={[styles.statPercent, { color: getStatusColor(s) }]}>
                      {data.total > 0 ? Math.round(((data.byStatus[s] ?? 0) / data.total) * 100) : 0}%
                    </Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>

          {/* Compact status-distribution bar chart */}
          {displayStatuses.length > 0 && (
            <Animated.View entering={FadeInDown.duration(450).delay(400)} style={styles.chartCard}>
              <Text style={styles.chartTitle}>Status Distribution</Text>
              <Text style={styles.chartSubtitle}>Application status mix across the current queue</Text>
              <BarChart
                data={{
                  labels: chartData.labels,
                  datasets: [{ data: chartData.values }],
                }}
                width={chartWidth}
                height={160}
                yAxisLabel=""
                yAxisSuffix=""
                fromZero
                showValuesOnTopOfBars={false}
                withInnerLines={false}
                withHorizontalLabels
                withVerticalLabels={false}
                segments={3}
                chartConfig={{
                  backgroundColor: '#fdfefe',
                  backgroundGradientFrom: '#fdfefe',
                  backgroundGradientTo: '#fdfefe',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(28, 124, 69, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(95, 111, 125, ${opacity})`,
                  barPercentage: 0.5,
                  propsForLabels: { fontSize: 11, fontWeight: '600' },
                  propsForBackgroundLines: {
                    stroke: '#edf2f6',
                    strokeDasharray: '0',
                  },
                }}
                style={styles.chart}
              />
              <View style={styles.chartLegendRow}>
                {displayStatuses.map((status) => (
                  <View key={status} style={styles.chartLegendItem}>
                    <View style={[styles.chartLegendDot, { backgroundColor: getStatusColor(status) }]} />
                    <Text style={styles.chartLegendLabel}>{getStatusLabel(status)}</Text>
                  </View>
                ))}
              </View>
            </Animated.View>
          )}
        </Animated.View>

        {/* ── AI note ── */}
        {data.aiNote && (
          <Animated.View entering={FadeInDown.duration(400).delay(500)} style={styles.aiNoteCard}>
            <Text style={styles.aiNoteIcon}>🧠</Text>
            <Text style={styles.aiNoteText}>{data.aiNote}</Text>
          </Animated.View>
        )}

        {/* ── Needs attention ── */}
        {data.needsAttention.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Needs Attention</Text>
            {data.needsAttention.slice(0, 6).map((job) => {
              const status = job.applicationStatus || job.status;
              const callDecision = job.interviewStatus?.callAssessment?.decision;
              const interviewDecision = job.interviewStatus?.interview?.analysisDecision;
              const confidence = job.interviewStatus?.callAssessment?.confidence;

              return (
                <TouchableOpacity
                  key={job.id}
                  style={styles.attentionCard}
                  onPress={goToApplications}
                  activeOpacity={0.7}
                >
                  <View style={styles.attentionHeader}>
                    <Text style={styles.attentionTitle} numberOfLines={1}>
                      {job.title}
                    </Text>
                    <View style={[styles.attentionBadge, { backgroundColor: getStatusColor(status) }]}>
                      <Text style={styles.attentionBadgeText}>{getStatusLabel(status)}</Text>
                    </View>
                  </View>
                  <Text style={styles.attentionMeta}>
                    {job.applicantName || job.createdByUsername} · {job.districtOrLocation}
                  </Text>
                  {(callDecision || interviewDecision) && (
                    <View style={styles.attentionSignals}>
                      {callDecision && (
                        <Text style={styles.signalChip}>
                          Gate-1: {callDecision}
                          {confidence != null ? ` (${(confidence * 100).toFixed(0)}%)` : ''}
                        </Text>
                      )}
                      {interviewDecision && (
                        <Text style={styles.signalChip}>Gate-2: {interviewDecision}</Text>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {/* ── Recent items / quick access ── */}
        <Text style={styles.sectionTitle}>Recent Job Posts</Text>
        {data.recentJobs.map((job) => {
          const status = job.applicationStatus || job.status;
          return (
            <TouchableOpacity
              key={job.id}
              style={styles.recentCard}
              onPress={goToApplications}
              activeOpacity={0.7}
            >
              <View style={styles.recentLeft}>
                <View style={[styles.recentDot, { backgroundColor: getStatusColor(status) }]} />
                <View style={styles.recentInfo}>
                  <Text style={styles.recentTitle} numberOfLines={1}>
                    {job.title}
                  </Text>
                  <Text style={styles.recentMeta}>
                    {job.applicantName || job.createdByUsername} · {new Date(job.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              </View>
              <Text style={[styles.recentStatus, { color: getStatusColor(status) }]}>
                {getStatusLabel(status)}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* ── Quick actions ── */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <TouchableOpacity style={styles.quickAction} onPress={goToApplications} activeOpacity={0.7}>
          <Text style={styles.quickActionIcon}>📋</Text>
          <View style={styles.quickActionContent}>
            <Text style={styles.quickActionLabel}>View All Applications</Text>
            <Text style={styles.quickActionHint}>Full list with filters and actions</Text>
          </View>
          <Text style={styles.quickActionArrow}>›</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ── Styles ── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 14,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2933',
    marginTop: 20,
    marginBottom: 10,
  },

  /* ── Overview container ── */
  overviewContainer: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#edf1f3',
    ...Platform.select({
      web: { boxShadow: '0px 6px 20px rgba(15,23,42,0.06)' },
      default: {
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
      },
    }),
  },
  overviewHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: '#3e4c59',
    marginBottom: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  /* Hero card */
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f0faf4',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#d5edd9',
  },
  heroLeft: {},
  heroNumber: {
    fontSize: 36,
    fontWeight: '800',
    color: '#1c7c45',
    letterSpacing: -1,
  },
  heroLabel: {
    fontSize: 13,
    color: '#3e7c54',
    fontWeight: '600',
    marginTop: 2,
  },
  heroRight: {
    alignItems: 'flex-end',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  heroBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  heroHint: {
    fontSize: 10,
    color: '#8fa3a0',
    marginTop: 4,
  },

  /* Stats 2-column grid */
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fafbfc',
    borderRadius: 12,
    padding: 12,
    width: (SCREEN_WIDTH - 32 - 16 - 10) / 2, // account for container padding + gap
    borderWidth: 1,
    borderColor: '#eef2f4',
    ...Platform.select({
      web: { boxShadow: '0px 2px 8px rgba(15,23,42,0.03)' },
      default: {
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
      },
    }),
  },
  statAccent: {
    width: 4,
    height: 36,
    borderRadius: 2,
    marginRight: 10,
  },
  statBody: {
    flex: 1,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2933',
  },
  statLabel: {
    fontSize: 11,
    color: '#667085',
    marginTop: 1,
    fontWeight: '500',
  },
  statPercentBg: {
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  statPercent: {
    fontSize: 11,
    fontWeight: '700',
  },

  /* Chart card */
  chartCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e8edf1',
    ...Platform.select({
      web: { boxShadow: '0px 4px 14px rgba(15,23,42,0.04)' },
      default: {
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 6,
        elevation: 1,
      },
    }),
  },
  chartTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475467',
    marginBottom: 2,
  },
  chartSubtitle: {
    fontSize: 11,
    color: '#667085',
    marginBottom: 8,
  },
  chart: {
    borderRadius: 10,
    marginLeft: -8,
  },
  chartLegendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  chartLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7f9fb',
    borderWidth: 1,
    borderColor: '#eef2f6',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chartLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  chartLegendLabel: {
    fontSize: 11,
    color: '#475467',
    fontWeight: '600',
  },

  /* AI note */
  aiNoteCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f3effc',
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#e0d6f5',
  },
  aiNoteIcon: {
    fontSize: 18,
    marginRight: 10,
    marginTop: 1,
  },
  aiNoteText: {
    flex: 1,
    fontSize: 13,
    color: '#5b3da5',
    lineHeight: 19,
  },

  /* Needs attention */
  attentionCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#edf1f3',
    ...Platform.select({
      web: { boxShadow: '0px 4px 12px rgba(15,23,42,0.04)' },
      default: {
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 5,
        elevation: 1,
      },
    }),
  },
  attentionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  attentionTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2933',
    marginRight: 8,
  },
  attentionBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  attentionBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  attentionMeta: {
    fontSize: 12,
    color: '#667085',
    marginBottom: 6,
  },
  attentionSignals: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  signalChip: {
    fontSize: 11,
    fontWeight: '600',
    color: '#5b3da5',
    backgroundColor: '#f3effc',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    overflow: 'hidden',
  },

  /* Recent items */
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#edf1f3',
  },
  recentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  recentDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  recentInfo: {
    flex: 1,
  },
  recentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2933',
  },
  recentMeta: {
    fontSize: 12,
    color: '#667085',
    marginTop: 2,
  },
  recentStatus: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
  },

  /* Quick actions */
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#edf1f3',
    ...Platform.select({
      web: { boxShadow: '0px 4px 12px rgba(15,23,42,0.04)' },
      default: {
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 5,
        elevation: 1,
      },
    }),
  },
  quickActionIcon: {
    fontSize: 22,
    marginRight: 12,
  },
  quickActionContent: {
    flex: 1,
  },
  quickActionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2933',
  },
  quickActionHint: {
    fontSize: 12,
    color: '#667085',
    marginTop: 2,
  },
  quickActionArrow: {
    fontSize: 22,
    color: '#999',
    fontWeight: '300',
  },
});
