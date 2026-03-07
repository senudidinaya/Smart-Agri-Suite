import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AnimatedCircularProgress } from 'react-native-circular-progress';
import { useLanguage } from '../context/LanguageContext';

export default function FarmerPerformance({ delay = 0 }: { delay?: number }) {
  const { t } = useLanguage();

  const farmerScore = useMemo(() => {
    // Arbitrary KPI calculation (mock data of existing app analytics)
    const margin = 80;
    const completion = 90;
    const success = 92;
    
    const aggregated = Math.round((margin + completion + success) / 3);
    return {
      total: aggregated,
      margin,
      completion,
      success
    };
  }, []);

  return (
    <Animated.View style={styles.card} entering={FadeInDown.delay(delay).springify()}>
      <View style={styles.header}>
        <Ionicons name="speedometer-outline" size={20} color="#16A34A" />
        <Text style={styles.title}>{t("farmerScoreTitle" as any) || "Farmer Score"}</Text>
      </View>

      <View style={styles.row}>
        <View style={styles.chartWrap}>
          <AnimatedCircularProgress
            size={110}
            width={12}
            fill={farmerScore.total}
            tintColor="#16A34A"
            backgroundColor="#DCFCE7"
            rotation={180}
            lineCap="round"
          >
            {() => (
              <View style={styles.scoreInner}>
                <Text style={styles.scoreBig}>{farmerScore.total}</Text>
                <Text style={styles.scoreSub}>/ 100</Text>
              </View>
            )}
          </AnimatedCircularProgress>
        </View>

        <View style={styles.kpiContainer}>
          <View style={styles.kpiItem}>
            <Text style={styles.kpiVal}>{farmerScore.margin}%</Text>
            <Text style={styles.kpiLabel}>{t("profitMarginKpi" as any) || "Profit Margin"}</Text>
          </View>
          <View style={styles.kpiItem}>
            <Text style={styles.kpiVal}>{farmerScore.success}%</Text>
            <Text style={styles.kpiLabel}>{t("successRateKpi" as any) || "Success Rate"}</Text>
          </View>
          <View style={styles.kpiItem}>
            <Text style={styles.kpiVal}>{farmerScore.completion}%</Text>
            <Text style={styles.kpiLabel}>{t("completionRateKpi" as any) || "Completion Rate"}</Text>
          </View>
        </View>
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
    marginBottom: 20,
  },
  title: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: '#0F172A',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  chartWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreInner: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  scoreBig: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 28,
    color: '#166534',
    lineHeight: 32,
  },
  scoreSub: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    color: '#16A34A',
  },
  kpiContainer: {
    flex: 1,
    gap: 12,
  },
  kpiItem: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 4,
  },
  kpiVal: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: '#0F172A',
  },
  kpiLabel: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: '#64748B',
  }
});
