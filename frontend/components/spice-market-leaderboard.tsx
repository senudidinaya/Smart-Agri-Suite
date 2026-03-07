import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useLanguage } from '../context/LanguageContext';

const MAX_WIDTH = Dimensions.get('window').width - 80;

export default function SpiceMarketLeaderboard({ delay = 0 }: { delay?: number }) {
  const { t } = useLanguage();

  const leaderboardData = useMemo(() => [
    { id: '1', spice: 'cinnamon', growth: 9, baseValue: 100 },
    { id: '2', spice: 'clove', growth: 7, baseValue: 80 },
    { id: '3', spice: 'nutmeg', growth: 6, baseValue: 65 },
    { id: '4', spice: 'pepper', growth: 5, baseValue: 50 },
  ], []);

  return (
    <Animated.View style={styles.card} entering={FadeInDown.delay(delay).springify()}>
      <View style={styles.header}>
        <Ionicons name="podium" size={20} color="#2563EB" />
        <Text style={styles.title}>{t("topSpicesToday" as any) || "Top Spices Today"}</Text>
      </View>

      <View style={styles.chartContainer}>
        {leaderboardData.map((item, index) => {
          const barWidth = (item.baseValue / 100) * MAX_WIDTH;
          
          return (
            <View key={item.id} style={styles.row}>
              <Text style={styles.rank}>{index + 1}</Text>
              
              <View style={styles.barArea}>
                <View style={[styles.bar, { width: barWidth }]} />
                <View style={styles.labelArea}>
                  <Text style={styles.spiceName}>{t(item.spice as any)}</Text>
                  <Text style={styles.growthText}>
                    <Ionicons name="arrow-up" size={12} color="#16A34A" /> +{item.growth}%
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
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
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#EFF6FF'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  title: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: '#0F172A',
  },
  chartContainer: {
    gap: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rank: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    color: '#94A3B8',
    width: 20,
  },
  barArea: {
    flex: 1,
    height: 40,
    justifyContent: 'center',
  },
  bar: {
    position: 'absolute',
    height: '100%',
    backgroundColor: '#DBEAFE',
    borderRadius: 8,
  },
  labelArea: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  spiceName: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    color: '#1E3A8A',
  },
  growthText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: '#16A34A',
  }
});
