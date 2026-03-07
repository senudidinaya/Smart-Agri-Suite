import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useLanguage } from '../context/LanguageContext';

export default function MarketVolatility({ delay = 0 }: { delay?: number }) {
  const { t } = useLanguage();

  const regions = useMemo(() => [
    { id: '1', city: 'colombo', level: 'high', color: '#F43F5E', bgColor: '#FFE4E6' },
    { id: '2', city: 'kandy', level: 'medium', color: '#F59E0B', bgColor: '#FEF3C7' },
    { id: '3', city: 'dambulla', level: 'low', color: '#10B981', bgColor: '#D1FAE5' },
  ], []);

  return (
    <Animated.View style={styles.card} entering={FadeInDown.delay(delay).springify()}>
      <View style={styles.header}>
        <Ionicons name="pulse" size={20} color="#F59E0B" />
        <Text style={styles.title}>{t("marketVolatilityInt" as any) || "Market Volatility"}</Text>
      </View>

      <Text style={styles.subLabel}>{t("volatilityStatus" as any) || "Volatility Status"}</Text>

      <View style={styles.gridContainer}>
        {regions.map((region) => (
          <View key={region.id} style={styles.regionRow}>
            <View style={styles.cityInfo}>
              <Ionicons name="location" size={16} color="#475569" />
              <Text style={styles.cityText}>{t(region.city as any)}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: region.bgColor }]}>
              <View style={[styles.dot, { backgroundColor: region.color }]} />
              <Text style={[styles.badgeText, { color: region.color }]}>
                {t(region.level as any)}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#FEF3C7'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  title: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: '#0F172A',
  },
  subLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
  },
  gridContainer: {
    gap: 12,
  },
  regionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  cityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cityText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    color: '#1E293B',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    textTransform: 'capitalize',
  }
});
