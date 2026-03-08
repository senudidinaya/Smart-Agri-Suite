import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, handlingSteps, HandlingStep } from '@/data/dashboardData';

function GuidanceCard({
  step,
  onToggle,
}: {
  step: HandlingStep;
  onToggle: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.guidanceCard, step.checked && styles.guidanceCardChecked]}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <View style={styles.guidanceRow}>
        <View
          style={[
            styles.checkbox,
            step.checked && styles.checkboxChecked,
          ]}
        >
          {step.checked && <Text style={styles.checkmark}>✓</Text>}
        </View>

        <View style={styles.iconCircle}>
          <Text style={styles.icon}>{step.icon}</Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.guidanceTitle,
              step.checked && styles.titleChecked,
            ]}
          >
            {step.title}
          </Text>
          <Text style={styles.guidanceDesc}>{step.description}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function StockHandlingGuidance() {
  const [steps, setSteps] = useState<HandlingStep[]>(handlingSteps);

  const toggleStep = (id: string) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, checked: !s.checked } : s))
    );
  };

  const completed = steps.filter((s) => s.checked).length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.sectionIcon}>🛡️</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>Proper Stock Handling Guidance</Text>
          <Text style={styles.sectionSub}>Checklist for seasonal stock protection</Text>
        </View>
        <View style={styles.storageBadge}>
          <Text style={styles.storageBadgeText}>Storage Advice</Text>
        </View>
      </View>

      {/* Progress */}
      <View style={styles.progressRow}>
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${(completed / steps.length) * 100}%` },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {completed}/{steps.length} done
        </Text>
      </View>

      {/* Guidance Cards */}
      {steps.map((step) => (
        <GuidanceCard
          key={step.id}
          step={step}
          onToggle={() => toggleStep(step.id)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.charcoal,
  },
  sectionSub: {
    fontSize: 12,
    color: COLORS.mediumGray,
    marginTop: 2,
  },
  storageBadge: {
    backgroundColor: COLORS.warningLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  storageBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.warningAmber,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 10,
  },
  progressBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.lightGray,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.lightGreen,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.mediumGray,
  },
  guidanceCard: {
    backgroundColor: COLORS.offWhite,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  guidanceCardChecked: {
    backgroundColor: COLORS.paleGreen,
    borderColor: COLORS.softGreen,
  },
  guidanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.mediumGray,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: COLORS.primaryGreen,
    borderColor: COLORS.primaryGreen,
  },
  checkmark: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  icon: {
    fontSize: 18,
  },
  guidanceTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.charcoal,
    marginBottom: 2,
  },
  titleChecked: {
    textDecorationLine: 'line-through',
    color: COLORS.mediumGray,
  },
  guidanceDesc: {
    fontSize: 12,
    color: COLORS.darkGray,
    lineHeight: 17,
  },
});
