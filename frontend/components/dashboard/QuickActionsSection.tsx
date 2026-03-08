
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS } from '@/data/dashboardData';

interface QuickActionProps {
  icon: any;
  label: string;
  onPress: () => void;
  isPrimary?: boolean;
}

const QuickAction = ({ icon, label, onPress, isPrimary = false }: QuickActionProps) => (
  <TouchableOpacity
    style={[styles.actionButton, isPrimary ? styles.primaryButton : styles.secondaryButton]}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <View style={styles.leftContent}>
      <Ionicons name={icon} size={20} color={isPrimary ? COLORS.surface : COLORS.brandDark} style={styles.icon} />
      <Text style={[styles.label, isPrimary ? styles.primaryText : styles.secondaryText]}>{label}</Text>
    </View>
    <Ionicons
      name={isPrimary ? "arrow-forward" : "chevron-forward"}
      size={20}
      color={isPrimary ? COLORS.surface : COLORS.textSecondary}
    />
  </TouchableOpacity>
);

export default function QuickActionsSection() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quick Actions</Text>
      <QuickAction
        icon="sparkles-outline"
        label="View AI Insights"
        onPress={() => router.push('/ai-insights')}
        isPrimary
      />
      <QuickAction
        icon="cube-outline"
        label="Inventory & Restock"
        onPress={() => router.push('/inventory-restock')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: COLORS.cardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.brandDark,
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: COLORS.primaryGreen,
  },
  secondaryButton: {
    backgroundColor: COLORS.actionBg,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryText: {
    color: COLORS.surface,
  },
  secondaryText: {
    color: COLORS.brandDark,
  },
});
