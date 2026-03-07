import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, withSequence, withDelay } from 'react-native-reanimated';
import { useLanguage } from '../context/LanguageContext';

const RouteArrow = ({ delayMs }: { delayMs: number }) => {
  const position = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    position.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 0 }),
        withDelay(delayMs, withTiming(100, { duration: 2500, easing: Easing.linear }))
      ),
      -1,
      false
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 0 }),
        withDelay(delayMs, withTiming(1, { duration: 400 })),
        withTiming(1, { duration: 1700 }),
        withTiming(0, { duration: 400 })
      ),
      -1,
      false
    );
  }, [delayMs, position, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: position.value * 1.5 }],
  }));

  return (
    <Animated.View style={[styles.arrowBox, animatedStyle]}>
      <Ionicons name="arrow-forward" size={16} color="#3B82F6" />
    </Animated.View>
  );
};

export default function SupplyChainMap({ delay = 0 }: { delay?: number }) {
  const { t } = useLanguage();

  const routes = useMemo(() => [
    { id: '1', origin: 'matale', dest: 'colombo', load: '840kg' },
    { id: '2', origin: 'kandy', dest: 'dambulla', load: '210kg' },
    { id: '3', origin: 'galle', dest: 'colombo', load: '560kg' },
  ], []);

  return (
    <Animated.View style={styles.card} entering={FadeInDown.delay(delay).springify()}>
      <View style={styles.header}>
        <Ionicons name="map-outline" size={20} color="#3B82F6" />
        <Text style={styles.title}>{t("supplyChainFlow" as any) || "Supply Chain Flow"}</Text>
      </View>
      <Text style={styles.subLabel}>{t("activeRoutes" as any) || "Active Routes"}</Text>

      <View style={styles.routesContainer}>
        {routes.map((route, idx) => (
          <View key={route.id} style={styles.routeRow}>
            <View style={styles.cityBubble}>
              <Text style={styles.cityText}>{t(route.origin as any)}</Text>
            </View>
            
            <View style={styles.flowTrack}>
              <View style={styles.flowLine} />
              <RouteArrow delayMs={idx * 1200} />
              <Text style={styles.loadBadge}>{route.load}</Text>
            </View>

            <View style={[styles.cityBubble, styles.cityBubbleDest]}>
              <Text style={styles.cityTextDest}>{t(route.dest as any)}</Text>
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
    shadowColor: '#3B82F6',
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
  routesContainer: {
    gap: 16,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cityBubble: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    width: 90,
    alignItems: 'center',
  },
  cityBubbleDest: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  cityText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    color: '#475569',
  },
  cityTextDest: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: '#1E3A8A',
  },
  flowTrack: {
    flex: 1,
    height: 30,
    marginHorizontal: 12,
    justifyContent: 'center',
  },
  flowLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#E2E8F0',
    borderStyle: 'dashed',
    borderRadius: 1,
  },
  arrowBox: {
    position: 'absolute',
    left: 0,
  },
  loadBadge: {
    position: 'absolute',
    top: -8,
    alignSelf: 'center',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 10,
    color: '#64748B',
    backgroundColor: '#fff',
    paddingHorizontal: 4,
  }
});
