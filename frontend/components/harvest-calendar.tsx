import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useLanguage } from '../context/LanguageContext';

export default function HarvestCalendar({ delay = 0 }: { delay?: number }) {
  const { t } = useLanguage();

  const schedules = useMemo(() => [
    { id: '1', spice: 'cinnamon', months: 'marMay', color: '#16A34A', bg: '#DCFCE7' },
    { id: '2', spice: 'pepper', months: 'augOct', color: '#2563EB', bg: '#DBEAFE' },
    { id: '3', spice: 'clove', months: 'julSep', color: '#F59E0B', bg: '#FEF3C7' },
  ], []);

  return (
    <Animated.View style={styles.card} entering={FadeInDown.delay(delay).springify()}>
      <View style={styles.header}>
        <Ionicons name="calendar" size={20} color="#16A34A" />
        <Text style={styles.title}>{t("harvestCalendar" as any) || "Harvest Calendar"}</Text>
      </View>

      <Text style={styles.subLabel}>{t("bestHarvestMonths" as any) || "Best Harvest Months"}</Text>

      <View style={styles.timelineContainer}>
        {schedules.map((schedule) => (
          <View key={schedule.id} style={styles.timelineItem}>
            <View style={[styles.iconWrap, { backgroundColor: schedule.bg }]}>
              <Ionicons name="leaf" size={16} color={schedule.color} />
            </View>
            <View style={styles.infoArea}>
              <Text style={styles.spiceText}>{t(schedule.spice as any)}</Text>
              <Text style={styles.monthsText}>{t(schedule.months as any)}</Text>
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
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#DCFCE7'
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
  timelineContainer: {
    gap: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 16,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoArea: {
    flex: 1,
  },
  spiceText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: '#1E293B',
  },
  monthsText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  }
});
