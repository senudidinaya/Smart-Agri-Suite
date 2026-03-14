import React, { useEffect, useState } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { cultivatorApi as api } from '@/api/cultivatorApi';

const DECISION_LABELS: Record<string, string> = {
  APPROVE: 'Proceed',
  VERIFY: 'Needs Manual Review',
  REJECT: 'Do Not Proceed',
};

export default function ViewAnalysisScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ jobId?: string; jobTitle?: string }>();
  const jobId = String(params.jobId || '');
  const jobTitle = String(params.jobTitle || 'Job');

  const [callAnalyses, setCallAnalyses] = useState<any[]>([]);
  const [interviewAnalyses, setInterviewAnalyses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalyses = async () => {
    if (!jobId) {
      setError('Missing job id');
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const [callResult, interviewResult] = await Promise.all([
        api.getJobCallAnalyses(jobId).catch(() => ({ analyses: [] } as any)),
        api.getJobInterviewAnalyses(jobId).catch(() => ({ analyses: [] } as any)),
      ]);
      setCallAnalyses(callResult.analyses || []);
      setInterviewAnalyses(interviewResult.analyses || []);
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
    switch (String(intent || '').toUpperCase()) {
      case 'PROCEED':
      case 'HIGH_INTENT':
        return '#27ae60';
      case 'VERIFY':
      case 'MEDIUM_INTENT':
        return '#f39c12';
      case 'REJECT':
      case 'LOW_INTENT':
      case 'NO_INTENT':
        return '#e74c3c';
      default:
        return '#95a5a6';
    }
  };

  const getDecisionText = (decision?: string): string => {
    if (!decision) return 'Pending';
    return DECISION_LABELS[decision] || decision;
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Analysis Results</Text>
          <Text style={styles.jobTitle}>{jobTitle}</Text>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {!hasAnyAnalysis && !error && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No analyses yet</Text>
            <Text style={styles.emptySubtext}>Analyses will appear after calls and interviews are completed.</Text>
          </View>
        )}

        {callAnalyses.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Voice Analyses (Gate-1)</Text>
            {callAnalyses.map((call, index) => (
              <View key={`call-${index}`} style={styles.card}>
                <Text style={styles.cardTitle}>Call {index + 1}</Text>
                {call.analysis ? (
                  <>
                    <Text style={[styles.badge, { color: getIntentColor(call.analysis.intentLabel) }]}>
                      {call.analysis.intentLabel}
                    </Text>
                    <Text style={styles.meta}>Confidence: {((call.analysis.confidence || 0) * 100).toFixed(1)}%</Text>
                  </>
                ) : (
                  <Text style={styles.meta}>No analysis payload</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {interviewAnalyses.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Interview Analyses (Gate-2)</Text>
            {interviewAnalyses.map((interview, index) => (
              <View key={`iv-${index}`} style={styles.card}>
                <Text style={styles.cardTitle}>Interview {index + 1}</Text>
                <Text style={styles.meta}>Recommendation: {getDecisionText(interview.analysisDecision)}</Text>
                <Text style={styles.meta}>Confidence: {interview.confidence != null ? `${(interview.confidence * 100).toFixed(1)}%` : 'N/A'}</Text>
                {!!interview.dominant_emotion && interview.dominant_emotion !== 'unknown' && (
                  <Text style={styles.meta}>Dominant emotion: {interview.dominant_emotion}</Text>
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
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16, paddingBottom: 40 },
  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 8, color: '#666' },
  header: { marginBottom: 16 },
  backButton: { color: '#2563eb', fontWeight: '700', marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827' },
  jobTitle: { color: '#6b7280', marginTop: 2 },
  errorContainer: { backgroundColor: '#fee2e2', borderRadius: 10, padding: 12, marginBottom: 12 },
  errorText: { color: '#b91c1c' },
  emptyContainer: { backgroundColor: '#fff', borderRadius: 12, padding: 20 },
  emptyText: { fontSize: 18, fontWeight: '700', color: '#111827' },
  emptySubtext: { marginTop: 6, color: '#6b7280' },
  section: { marginTop: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 8 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1f2937' },
  badge: { marginTop: 4, fontWeight: '700' },
  meta: { color: '#4b5563', marginTop: 3 },
});
