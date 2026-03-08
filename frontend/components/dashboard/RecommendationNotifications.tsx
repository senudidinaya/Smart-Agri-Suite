import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, recommendations, RecommendationItem } from '@/data/dashboardData';

function RecommendationRow({ item, index }: { item: RecommendationItem; index: number }) {
  // Highlight the highest priority item as the primary green action button
  const isPrimary = index === 0 && item.priority === 'High';

  return (
    <TouchableOpacity
      style={[
        styles.recRow,
        isPrimary ? styles.primaryRow : styles.secondaryRow,
      ]}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <Text style={styles.iconEm}>{item.icon}</Text>
      </View>
      <View style={styles.textContent}>
        <Text style={[styles.recTitle, isPrimary && styles.primaryText]}>
          {item.title}
        </Text>
        <Text
          style={[styles.recMessage, isPrimary && styles.primarySubtext]}
          numberOfLines={2}
        >
          {item.message}
        </Text>
      </View>
      <Text style={[styles.chevron, isPrimary && styles.primaryChevron]}>›</Text>
    </TouchableOpacity>
  );
}

export default function RecommendationNotifications() {
  return (
    <View style={styles.cardContainer}>
      <Text style={styles.cardTitle}>Suggested Actions</Text>
      
      {recommendations.map((item, index) => (
        <RecommendationRow key={item.id} item={item} index={index} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    shadowColor: COLORS.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.brandDark,
    marginBottom: 16,
  },
  recRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
  },
  primaryRow: {
    backgroundColor: COLORS.primaryGreen,
  },
  secondaryRow: {
    backgroundColor: COLORS.actionBg,
  },
  iconContainer: {
    marginRight: 14,
    justifyContent: 'center',
    width: 24,
  },
  iconEm: {
    fontSize: 20,
  },
  textContent: {
    flex: 1,
  },
  recTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.brandDark,
    marginBottom: 2,
  },
  primaryText: {
    color: COLORS.surface,
  },
  recMessage: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  primarySubtext: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  chevron: {
    fontSize: 24,
    color: '#94a3b8',
    marginLeft: 8,
  },
  primaryChevron: {
    color: COLORS.surface,
  },
});
