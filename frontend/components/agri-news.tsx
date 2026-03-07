import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useLanguage } from '../context/LanguageContext';

export default function AgriNews({ delay = 0 }: { delay?: number }) {
  const { t } = useLanguage();

  return (
    <Animated.View style={styles.card} entering={FadeInDown.delay(delay).springify()}>
      <View style={styles.header}>
        <Ionicons name="newspaper" size={20} color="#6366F1" />
        <Text style={styles.title}>{t("agriNews" as any) || "Agricultural News"}</Text>
      </View>

      <View style={styles.newsList}>
        <View style={styles.newsItem}>
          <View style={styles.dot} />
          <Text style={styles.newsText}>{t("newsInsight1" as any)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.newsItem}>
          <View style={[styles.dot, { backgroundColor: '#F59E0B' }]} />
          <Text style={styles.newsText}>{t("newsInsight2" as any)}</Text>
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
    marginBottom: 24,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E0E7FF'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  title: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: '#312E81',
  },
  newsList: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
  },
  newsItem: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6366F1',
    marginTop: 6,
  },
  newsText: {
    flex: 1,
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    color: '#334155',
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 12,
  }
});
