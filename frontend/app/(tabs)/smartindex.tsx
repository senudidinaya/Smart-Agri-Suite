import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  Animated,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { LineChart } from "react-native-chart-kit";
import { AnimatedCircularProgress } from "react-native-circular-progress";

import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useLanguage } from "../../context/LanguageContext";

const screenWidth = Dimensions.get("window").width - 32;

/* ─── Regions for ticker location labels ─── */
const REGIONS = ["Colombo", "Kandy", "Matale", "Kurunegala", "Dambulla"];

/* ─── All module routes for Smart Pricing & Logistics ─── */
const MODULES = [
  { icon: "calculator-outline" as const, labelKey: "simulateHarvest", route: "/(tabs)/order", color: "#F59E0B", descKey: "harvestScenario" },
  { icon: "analytics-outline" as const, labelKey: "simulator", route: "/(tabs)/simulator", color: "#8B5CF6", descKey: "profitProjectionSub" },
  { icon: "bar-chart-outline" as const, labelKey: "farmer", route: "/(tabs)/farmer", color: "#10B981", descKey: "farmerDashDesc" },
  { icon: "cash-outline" as const, labelKey: "prices", route: "/(tabs)/price-result", color: "#EF4444", descKey: "priceResultDesc" },
  { icon: "trending-up-outline" as const, labelKey: "demandPrediction", route: "/(tabs)/demand-prediction", color: "#3B82F6", descKey: "demandPredictionDesc" },
  { icon: "map-outline" as const, labelKey: "demand", route: "/(tabs)/srilanka-demand-map", color: "#0EA5E9", descKey: "demandMapDesc" },
  { icon: "calendar-outline" as const, labelKey: "seasonalAnalytics", route: "/(tabs)/seasonal-price-analytics", color: "#D97706", descKey: "seasonalAnalyticsDesc" },
  { icon: "navigate-outline" as const, labelKey: "routePlanner", route: "/(tabs)/route-planner", color: "#14B8A6", descKey: "routePlannerDesc" },
  { icon: "car-outline" as const, labelKey: "transport", route: "/(tabs)/transport", color: "#6366F1", descKey: "transportDesc" },
  { icon: "stats-chart-outline" as const, labelKey: "analytics", route: "/(tabs)/transport-analytics", color: "#EC4899", descKey: "transportAnalyticsDesc" },
  { icon: "flash-outline" as const, labelKey: "optimizeTransport", route: "/(tabs)/transport-optimizer", color: "#F97316", descKey: "transportOptimizerDesc" },
  { icon: "location-outline" as const, labelKey: "tracking", route: "/(tabs)/transport-tracking", color: "#06B6D4", descKey: "transportTrackingDesc" },
  { icon: "leaf-outline" as const, labelKey: "yieldAnalytics", route: "/(tabs)/yield-analytics", color: "#22C55E", descKey: "yieldAnalyticsDesc" },
];

/* ─── Live ticker spice data with regions ─── */
const SPICE_NAMES = ["Cinnamon", "Pepper", "Cardamom", "Clove", "Nutmeg"];
const SPICE_KEYS: Record<string, string> = {
  Cinnamon: "cinnamon",
  Pepper: "pepper",
  Cardamom: "cardamom",
  Clove: "clove",
  Nutmeg: "nutmeg",
};

interface TickerItem {
  spice: string;
  price: number;
  change: number;
  up: boolean;
  region: string;
}

export default function Dashboard() {
  const fade = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;
  const modulesRef = useRef<View>(null);
  const scrollRef = useRef<ScrollView>(null);

  const { t } = useLanguage();

  const [region, setRegion] = useState("Colombo");
  const [price, setPrice] = useState(2200);
  const [activeSpice, setActiveSpice] = useState("Cinnamon");

  const [volatility, setVolatility] = useState(35);
  const [demandPressure, setDemandPressure] = useState(60);
  const [momentum, setMomentum] = useState(55);

  const [tickerPrices, setTickerPrices] = useState<TickerItem[]>(
    SPICE_NAMES.map((s, i) => ({
      spice: s,
      price: [2100, 1600, 3200, 2600, 2400][i],
      change: [2.1, 1.5, 3.4, 0.8, 1.2][i],
      up: [true, false, true, true, false][i],
      region: REGIONS[i % REGIONS.length],
    }))
  );

  const regionKeys: Record<string, string> = {
    Colombo: "colombo",
    Kandy: "kandy",
    Matale: "matale",
    Kurunegala: "kurunegala",
    Dambulla: "dambulla",
  };

  /* Modules section Y offset for scroll-to */
  const [modulesY, setModulesY] = useState(0);

  /* Live welcome card state */
  const [trendingIdx, setTrendingIdx] = useState(0);
  const [tipIdx, setTipIdx] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const TIPS = [
    t("tip1") || "Sell when demand is high & supply is low for best prices",
    t("tip2") || "Choose the right vehicle — bikes save cost for short distances",
    t("tip3") || "Colombo & Kandy consistently offer the highest spice prices",
    t("tip4") || "Monitor seasonal trends to time your harvest sales perfectly",
  ];

  const GREETINGS = [
    { hour: 5, key: "goodMorning", fallback: "Good Morning" },
    { hour: 12, key: "goodAfternoon", fallback: "Good Afternoon" },
    { hour: 17, key: "goodEvening", fallback: "Good Evening" },
  ];

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return t("goodMorning" as any) || "Good Morning";
    if (h < 17) return t("goodAfternoon" as any) || "Good Afternoon";
    return t("goodEvening" as any) || "Good Evening";
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideUp, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    const interval = setInterval(() => {
      setVolatility((v) => Math.max(10, Math.min(100, v + Math.floor(Math.random() * 11 - 5))));
      setDemandPressure((v) => Math.max(10, Math.min(100, v + Math.floor(Math.random() * 11 - 5))));
      setMomentum((v) => Math.max(10, Math.min(100, v + Math.floor(Math.random() * 11 - 5))));
      setPrice((p) => p + Math.floor(Math.random() * 30 - 15));

      /* Rotate the active spice shown in the chart */
      setActiveSpice((prev) => {
        const idx = SPICE_NAMES.indexOf(prev);
        return SPICE_NAMES[(idx + 1) % SPICE_NAMES.length];
      });

      setTickerPrices((prev) =>
        prev.map((item) => {
          const up = Math.random() > 0.5;
          const changeAmt = Math.random() * 20;
          return {
            ...item,
            price: Math.round(item.price + (up ? changeAmt : -changeAmt)),
            change: Number((Math.random() * 3).toFixed(1)),
            up,
            region: REGIONS[Math.floor(Math.random() * REGIONS.length)],
          };
        })
      );

      // Rotate trending spice
      setTrendingIdx((i) => (i + 1) % SPICE_NAMES.length);
    }, 3000);

    // Rotate tips every 5s
    const tipInterval = setInterval(() => {
      setTipIdx((i) => (i + 1) % 4);
    }, 5000);

    // Pulse animation loop
    const pulse = () => {
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]).start(() => pulse());
    };
    pulse();

    return () => {
      clearInterval(interval);
      clearInterval(tipInterval);
    };
  }, []);

  const chartData = useMemo(() => {
    return {
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Now"],
      datasets: [
        {
          data: [
            price - 90,
            price - 50,
            price - 30,
            price,
            price + 10,
            price + Math.random() * 30,
          ],
        },
      ],
    };
  }, [price]);

  const changeRegion = (r: string) => {
    Haptics.selectionAsync();
    setRegion(r);
    setPrice(2000 + Math.random() * 400);
  };

  const handleStartExploring = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (scrollRef.current && modulesY > 0) {
      scrollRef.current.scrollTo({ y: modulesY, animated: true });
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F4F6F8" }}>
      <Animated.View style={{ flex: 1, opacity: fade }}>
        <ScrollView ref={scrollRef} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

          {/* ═══════════════ HEADER ═══════════════ */}
          <Text style={styles.headerTitle}>{t("ayubowanFarmer") || "Ayubowan, Farmer"} 🌿</Text>

          {/* ═══════════════ WELCOME CARD ═══════════════ */}
          <Animated.View style={[styles.welcomeCard, { transform: [{ translateY: slideUp }] }]}>
            {/* Decorative circles */}
            <View style={styles.welcomeAccent1} />
            <View style={styles.welcomeAccent2} />
            <View style={styles.welcomeAccent3} />

            {/* Live badge with pulsing dot */}
            <View style={styles.welcomeTopRow}>
              <View style={styles.welcomeBadge}>
                <Ionicons name="sparkles" size={12} color="#F59E0B" />
                <Text style={styles.welcomeBadgeText}>{t("smartPricingBadge") || "Smart Pricing & Logistics"}</Text>
              </View>
              <View style={styles.livePulse}>
                <Animated.View style={[styles.livePulseDot, { transform: [{ scale: pulseAnim }] }]} />
                <Text style={styles.livePulseText}>{t("live") || "LIVE"}</Text>
              </View>
            </View>

            {/* Dynamic greeting */}
            <Text style={styles.welcomeGreeting}>
              {getGreeting()}, {t("farmerTitle" as any) || "Farmer"} 👋
            </Text>

            <Text style={styles.welcomeTitle}>
              {t("welcome") || "Welcome to Smart Agri-Suite"} 🌱
            </Text>

            <Text style={styles.welcomeText}>
              {t("welcomeDescription") || "Smart Agri-Suite analyzes market demand, pricing trends, logistics costs, and seasonal conditions to help Sri Lankan spice farmers maximize profits."}
            </Text>

            {/* Live trending spice indicator */}
            <View style={styles.trendingRow}>
              <Ionicons name="trending-up" size={16} color="#4ADE80" />
              <Text style={styles.trendingText}>
                {t("trending" as any) || "Trending"}: {t(SPICE_KEYS[SPICE_NAMES[trendingIdx]] as any) || SPICE_NAMES[trendingIdx]}
                {" "}&bull;{" "}
                {t("currencySymbol")} {tickerPrices[trendingIdx]?.price || "—"}
                {" "}
                <Text style={{ color: tickerPrices[trendingIdx]?.up ? "#4ADE80" : "#FCA5A5" }}>
                  {tickerPrices[trendingIdx]?.up ? "▲" : "▼"} {tickerPrices[trendingIdx]?.change}%
                </Text>
              </Text>
            </View>

            {/* Rotating tip */}
            <View style={styles.tipRow}>
              <Ionicons name="bulb-outline" size={14} color="#FCD34D" />
              <Text style={styles.tipText}>{TIPS[tipIdx]}</Text>
            </View>

            {/* Feature pills */}
            <View style={styles.featureRow}>
              <Feature icon="analytics-outline" label={t("simulator")} />
              <Feature icon="cash-outline" label={t("profit")} />
              <Feature icon="car-outline" label={t("transport")} />
            </View>

            {/* Quick stats row */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>13</Text>
                <Text style={styles.statLabel}>{t("modules") || "Modules"}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>5</Text>
                <Text style={styles.statLabel}>{t("regions") || "Regions"}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>5</Text>
                <Text style={styles.statLabel}>{t("spices") || "Spices"}</Text>
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [styles.startButton, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
              onPress={handleStartExploring}
            >
              <Ionicons name="rocket-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.startText}>
                {t("startExploring") || "Start Exploring"}
              </Text>
            </Pressable>
          </Animated.View>

          {/* ═══════════════ LIVE SPICE TICKER (with region) ═══════════════ */}
          <Text style={styles.sectionTitle}>{t("livePrices") || "Live Spice Prices"}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ overflow: "visible", marginBottom: 20, marginTop: 4 }}
          >
            {tickerPrices.map((item) => (
              <View key={item.spice} style={styles.tickerCard}>
                <Text style={styles.tickerSpice}>
                  {t(SPICE_KEYS[item.spice] as any)}
                </Text>
                <Text style={styles.tickerRegionTag}>
                  📍 {t(regionKeys[item.region] as any) || item.region}
                </Text>
                <Text style={styles.tickerPrice}>
                  {t("currencySymbol")} {String(item.price)}
                </Text>
                <View style={styles.tickerChangeRow}>
                  <Ionicons
                    name={item.up ? "trending-up" : "trending-down"}
                    size={14}
                    color={item.up ? "#10B981" : "#EF4444"}
                  />
                  <Text
                    style={{
                      color: item.up ? "#10B981" : "#EF4444",
                      fontFamily: "Poppins_600SemiBold",
                      fontSize: 12,
                      marginLeft: 4,
                    }}
                  >
                    {String(item.change)}%
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* ═══════════════ LIVE MARKET ANALYSIS GAUGES ═══════════════ */}
          <Text style={styles.sectionTitle}>{t("liveMarketAnalysis") || "Live Market Analysis"}</Text>
          <View style={styles.gaugeRow}>
            <Gauge
              value={volatility}
              label={t("marketVolatility") || "Volatility"}
              color="#ef4444"
            />
            <Gauge
              value={demandPressure}
              label={t("demandPressure") || "Demand"}
              color="#16A34A"
            />
            <Gauge
              value={momentum}
              label={t("priceMomentum") || "Momentum"}
              color="#2563EB"
            />
          </View>

          {/* ═══════════════ MARKET CHART ═══════════════ */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.marketTitle}>
                  {t(SPICE_KEYS[activeSpice] as any) || activeSpice} — {t(regionKeys[region] as any) || region}
                </Text>
                <Text style={styles.price}>
                  {t("currencySymbol") || "LKR"} {Math.floor(price)} /{t("kg") || "kg"}
                </Text>
              </View>
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>{t("live") || "LIVE"}</Text>
              </View>
            </View>

            <LineChart
              data={chartData}
              width={screenWidth}
              height={160}
              withDots
              withInnerLines={false}
              withOuterLines={false}
              withVerticalLabels={true}
              withHorizontalLabels={true}
              bezier
              chartConfig={{
                backgroundGradientFrom: "#fff",
                backgroundGradientTo: "#fff",
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(22, 163, 74, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(71, 85, 105, ${opacity})`,
                propsForDots: {
                  r: "4",
                  strokeWidth: "2",
                  stroke: "#16A34A",
                },
              }}
              style={{ borderRadius: 12, marginTop: 8, marginLeft: -8 }}
            />
          </View>

          {/* ═══════════════ REGION SELECTOR ═══════════════ */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 20 }}
          >
            {REGIONS.map((r) => (
              <Pressable
                key={r}
                style={[
                  styles.regionButton,
                  region === r && styles.regionActive,
                ]}
                onPress={() => changeRegion(r)}
              >
                <Text
                  style={[
                    styles.regionText,
                    region === r && styles.regionTextActive,
                  ]}
                >
                  {t(regionKeys[r] as any) || r}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* ═══════════════ ALL MODULE NAVIGATION ═══════════════ */}
          <View onLayout={(e) => setModulesY(e.nativeEvent.layout.y)}>
            <Text style={styles.sectionTitle}>{t("exploreModules") || "Explore Modules"}</Text>
            <Text style={styles.sectionSub}>{t("exploreModulesSub") || "Tap any module to dive deeper into analytics, pricing, and logistics"}</Text>

            <View style={styles.moduleGrid}>
              {MODULES.map((mod) => (
                <ModuleCard
                  key={mod.route}
                  icon={mod.icon}
                  label={t(mod.labelKey as any) || mod.labelKey}
                  route={mod.route}
                  color={mod.color}
                  desc={t(mod.descKey as any) || mod.descKey}
                />
              ))}
            </View>
          </View>

          <View style={{ height: 30 }} />
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

/* ─── Sub-components ─── */

function Feature({ icon, label }: any) {
  return (
    <View style={styles.featureItem}>
      <View style={styles.featureIconWrap}>
        <Ionicons name={icon} size={16} color="#16A34A" />
      </View>
      <Text style={styles.featureText}>{label}</Text>
    </View>
  );
}

function Gauge({ value, label, color }: any) {
  return (
    <View style={styles.gaugeItem}>
      <AnimatedCircularProgress
        size={70}
        width={8}
        fill={value}
        tintColor={color}
        backgroundColor="#E2E8F0"
        lineCap="round"
        rotation={270}
        duration={1200}
      >
        {() => (
          <Text style={styles.gaugeCenterText}>{value}%</Text>
        )}
      </AnimatedCircularProgress>
      <Text style={styles.gaugeLabel}>{label}</Text>
    </View>
  );
}

function ModuleCard({ icon, label, route, color, desc }: any) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.moduleCard,
        { borderLeftColor: color, backgroundColor: color + "08" },
        pressed && { transform: [{ scale: 0.96 }], opacity: 0.9 },
      ]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(route as any);
      }}
    >
      <View style={[styles.moduleIconWrap, { backgroundColor: color + "20" }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.moduleText}>{label}</Text>
      <Text style={styles.moduleDesc}>{desc}</Text>
      <View style={[styles.moduleArrow, { backgroundColor: color + "15" }]}>
        <Ionicons name="arrow-forward" size={14} color={color} />
      </View>
    </Pressable>
  );
}

/* ─── Styles ─── */
const styles = StyleSheet.create({
  container: {
    padding: 16,
  },

  headerTitle: {
    fontSize: 26,
    fontFamily: "Poppins_700Bold",
    color: "#0F172A",
    marginBottom: 16,
    letterSpacing: -0.5,
  },

  sectionTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 18,
    color: "#0F172A",
    marginBottom: 4,
  },

  sectionSub: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: "#64748B",
    marginBottom: 16,
    lineHeight: 20,
  },

  /* ─── Welcome Card ─── */
  welcomeCard: {
    backgroundColor: "#14532d",
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    overflow: "hidden",
    shadowColor: "#14532d",
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  welcomeAccent1: {
    position: "absolute",
    top: -50,
    right: -50,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  welcomeAccent2: {
    position: "absolute",
    bottom: -35,
    left: -35,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  welcomeAccent3: {
    position: "absolute",
    top: 40,
    right: 80,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(245, 158, 11, 0.12)",
  },
  welcomeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
  },
  welcomeTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  livePulse: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4ADE80",
  },
  livePulseText: {
    fontFamily: "Poppins_700Bold",
    fontSize: 10,
    color: "#4ADE80",
    letterSpacing: 1,
  },
  welcomeGreeting: {
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
    color: "rgba(255,255,255,0.7)",
    marginBottom: 4,
  },
  welcomeBadgeText: {
    color: "#F59E0B",
    fontSize: 11,
    fontFamily: "Poppins_600SemiBold",
    letterSpacing: 0.5,
  },
  welcomeTitle: {
    fontSize: 24,
    fontFamily: "Poppins_700Bold",
    color: "#fff",
    marginBottom: 8,
  },
  welcomeText: {
    marginTop: 4,
    color: "rgba(255,255,255,0.75)",
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    lineHeight: 22,
  },
  featureRow: {
    flexDirection: "row",
    marginTop: 16,
    gap: 8,
  },
  trendingRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(74, 222, 128, 0.12)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  trendingText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
    color: "#fff",
    flex: 1,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(252, 211, 77, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginTop: 10,
    gap: 8,
  },
  tipText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.8)",
    flex: 1,
    lineHeight: 16,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  featureIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: "rgba(22, 163, 74, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    fontSize: 11,
    fontFamily: "Poppins_500Medium",
    color: "rgba(255,255,255,0.9)",
  },

  /* Stats row inside welcome card */
  statsRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: 14,
    marginTop: 18,
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontFamily: "Poppins_700Bold",
    fontSize: 18,
    color: "#fff",
  },
  statLabel: {
    fontFamily: "Poppins_400Regular",
    fontSize: 10,
    color: "rgba(255,255,255,0.6)",
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.15)",
  },

  startButton: {
    backgroundColor: "#16A34A",
    marginTop: 18,
    padding: 14,
    borderRadius: 16,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    shadowColor: "#16A34A",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  startText: {
    color: "white",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15,
  },

  /* ─── Live Ticker ─── */
  tickerCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginRight: 12,
    width: 150,
    shadowColor: "#64748b",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  tickerSpice: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: "#0F172A",
  },
  tickerRegionTag: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
    marginBottom: 4,
  },
  tickerPrice: {
    fontSize: 18,
    fontFamily: "Poppins_700Bold",
    marginVertical: 4,
    letterSpacing: -0.5,
    color: "#0F172A",
  },
  tickerChangeRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  /* ─── Gauges ─── */
  gaugeRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 12,
    marginBottom: 20,
  },
  gaugeItem: {
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 20,
    width: "31%",
    shadowColor: "#64748b",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  gaugeCenterText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: "#334155",
  },
  gaugeLabel: {
    fontSize: 11,
    marginTop: 6,
    fontFamily: "Poppins_500Medium",
    color: "#64748B",
    textAlign: "center",
  },

  /* ─── Market Chart ─── */
  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  marketTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    color: "#0F172A",
  },
  price: {
    fontSize: 24,
    fontFamily: "Poppins_700Bold",
    color: "#1B5E20",
    marginTop: 2,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#DC2626",
  },
  liveText: {
    fontFamily: "Poppins_700Bold",
    fontSize: 10,
    color: "#DC2626",
    letterSpacing: 1,
  },

  /* ─── Region Selector ─── */
  regionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "#fff",
    marginRight: 10,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
  },
  regionActive: {
    backgroundColor: "#16A34A",
    borderColor: "#16A34A",
  },
  regionText: {
    fontSize: 13,
    fontFamily: "Poppins_500Medium",
    color: "#475569",
  },
  regionTextActive: {
    color: "#fff",
    fontFamily: "Poppins_600SemiBold",
  },

  /* ─── Module Grid ─── */
  moduleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  moduleCard: {
    width: "48%",
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    alignItems: "center",
    shadowColor: "#334155",
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    borderLeftWidth: 4,
  },
  moduleIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  moduleText: {
    fontFamily: "Poppins_700Bold",
    fontSize: 13,
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 4,
  },
  moduleDesc: {
    fontFamily: "Poppins_400Regular",
    fontSize: 10,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 15,
    marginBottom: 8,
  },
  moduleArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});
