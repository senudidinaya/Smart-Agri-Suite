import React from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Platform,
} from 'react-native';
import { COLORS, stockPrediction } from '@/data/dashboardData';

import StockPredictionSummary from '@/components/dashboard/StockPredictionSummary';
import QuickActionsSection from '@/components/dashboard/QuickActionsSection';
import AlertNotifications from '@/components/dashboard/AlertNotifications';
import RecommendationInsights from '@/components/dashboard/RecommendationInsights';
import UserModeSwitcher from '@/components/common/UserModeSwitcher';

export default function DashboardScreen() {
  const data = stockPrediction;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Top OS-level App Header (Mocked for visual structure) */}
      <View style={styles.topBar}>
        <Text style={styles.topBarText}>Home</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Dashboard Header ─────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={styles.brandTitle}>Smart-Agri</Text>
            <UserModeSwitcher />
          </View>
          <Text style={styles.brandSubtitle}>
            Farmer Stock Prediction & Seasonal Recommendation
          </Text>
          <Text style={styles.brandDescription}>
            Model-powered insights for next month stock planning, seasonal risk detection, and proper stock handling.
          </Text>
        </View>

        {/* ── 1. Stock Prediction Summary ──────────────── */}
        <StockPredictionSummary />

        {/* ── 2. Quick Actions ─────────────────────────── */}
        <QuickActionsSection />

        {/* ── 3. Alert Notifications ───────────────────── */}
        <AlertNotifications />

        {/* ── 4. Recommendation Insights (Pro Tip) ─────── */}
        <RecommendationInsights />

        {/* Footer */}
        <View style={styles.footer}>
           <Text style={styles.footerText}>Smart Agriculture System v1.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  topBar: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 40 : 16,
    paddingBottom: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  topBarText: {
    fontSize: 18,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  scroll: {
    flex: 1,
    backgroundColor: COLORS.background, // Light gray body background
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  // Header
  header: {
    marginBottom: 20,
    marginTop: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.brandDark,
    letterSpacing: -0.5,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  timeIcon: {
    fontSize: 12,
    marginRight: 6,
    opacity: 0.6,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4b5563',
  },
  brandSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  brandDescription: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 18,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  footerText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});
