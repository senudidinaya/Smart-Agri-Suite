import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useLanguage } from '../context/LanguageContext';

export default function WeatherAlert({ delay = 0 }: { delay?: number }) {
  const { t } = useLanguage();

  return (
    <Animated.View style={styles.card} entering={FadeInDown.delay(delay).springify()}>
      <View style={styles.header}>
        <Ionicons name="thunderstorm" size={20} color="#F43F5E" />
        <Text style={styles.title}>{t("weatherAlert" as any) || "Weather Alert"}</Text>
      </View>

      <Text style={styles.alertText}>
        {t("heavyRainfallExpected" as any)}{t("matale" as any)} {t("nextWeek" as any)}
      </Text>

      <View style={styles.impactBox}>
        <Text style={styles.impactTitle}>{t("potentialImpact" as any) || "Potential Impact"}:</Text>
        <View style={styles.bulletRow}>
          <View style={styles.bullet} />
          <Text style={styles.bulletText}>{t("cinnamon" as any)} {t("supplyDecrease" as any)}</Text>
        </View>
        <View style={styles.bulletRow}>
          <View style={styles.bullet} />
          <Text style={styles.bulletText}>{t("priceIncrease" as any)}</Text>
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
    shadowColor: '#F43F5E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#FFE4E6'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  title: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: '#E11D48',
  },
  alertText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 16,
    lineHeight: 22,
  },
  impactBox: {
    backgroundColor: '#FFF1F2',
    padding: 16,
    borderRadius: 16,
    gap: 8,
  },
  impactTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: '#9F1239',
    marginBottom: 4,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F43F5E',
  },
  bulletText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: '#4C1D95',
  }
});
