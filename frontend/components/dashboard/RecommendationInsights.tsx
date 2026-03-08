import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, insights } from '@/data/dashboardData';

export default function RecommendationInsights() {
  const mainInsight = insights[0];

  return (
    <View style={styles.proTipCard}>
      <View style={styles.iconCol}>
        <Text style={styles.iconEm}>{mainInsight.icon}</Text>
      </View>
      <View style={styles.textCol}>
        <Text style={styles.proTipTitle}>Pro Tip</Text>
        <Text style={styles.proTipText}>{mainInsight.description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  proTipCard: {
    backgroundColor: COLORS.proTipBg,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    shadowColor: COLORS.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  iconCol: {
    marginRight: 16,
    marginTop: 2,
  },
  iconEm: {
    fontSize: 22,
  },
  textCol: {
    flex: 1,
  },
  proTipTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.proTipText,
    marginBottom: 6,
  },
  proTipText: {
    fontSize: 13,
    color: '#166534',
    lineHeight: 18,
    fontWeight: '500',
  },
});
