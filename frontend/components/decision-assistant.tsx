import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useLanguage } from '../context/LanguageContext';

export default function DecisionAssistant({ 
  delay = 0 
}: { 
  delay?: number 
}) {
  const { t } = useLanguage();

  // Mocking the recommendation logic (simulating engines)
  // Inside a real implementation, this would trigger `forecastEngine`, `demandEngine`, etc.
  const recommendation = useMemo(() => {
    return {
      action: "sellNow",
      spiceKey: "cinnamon",
      marketKey: "colombo",
      profit: 38200,
      transport: 5600,
      demandLvl: "high",
    };
  }, []);

  return (
    <Animated.View style={styles.card} entering={FadeInDown.delay(delay).springify()}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="bulb" size={20} color="#F59E0B" />
          <Text style={styles.title}>{t("smartDecisionAssistant" as any) || "Smart Decision Assistant"}</Text>
        </View>
        <View style={styles.pulseIndicator} />
      </View>

      <Text style={styles.recLabel}>{t("recommendedAction" as any) || "Recommended Action"}:</Text>
      <View style={styles.actionBox}>
        <Text style={styles.actionText}>
          {t(recommendation.action as any)} {t(recommendation.spiceKey as any)} {t("in" as any)} {t(recommendation.marketKey as any)}
        </Text>
        <Ionicons name="arrow-forward-circle" size={24} color="#16A34A" />
      </View>

      <View style={styles.metricsContainer}>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>{t("expectedProfit" as any) || "Expected Profit"}</Text>
          <Text style={styles.metricValuePos}>{t("currencySymbol" as any)} {recommendation.profit.toLocaleString()}</Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>{t("transportCostInt" as any) || "Transport Cost"}</Text>
          <Text style={styles.metricValueNeg}>{t("currencySymbol" as any)} {recommendation.transport.toLocaleString()}</Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>{t("demandStrength" as any) || "Demand Strength"}</Text>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{t(recommendation.demandLvl as any)}</Text>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: '#0F172A',
  },
  pulseIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  recLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    color: '#64748B',
    marginBottom: 8,
  },
  actionBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  actionText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: '#166534',
    flex: 1,
  },
  metricsContainer: {
    gap: 12,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricLabel: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: '#475569',
  },
  metricValuePos: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: '#10B981',
  },
  metricValueNeg: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: '#F43F5E',
  },
  tag: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: '#1E40AF',
  }
});
