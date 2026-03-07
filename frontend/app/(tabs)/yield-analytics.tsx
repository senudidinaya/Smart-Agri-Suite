import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    Dimensions,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import Animated, {
    Easing,
    FadeInDown,
    FadeInUp,
    useAnimatedProps,
    useSharedValue,
    withTiming
} from "react-native-reanimated";

import { loadMarketData } from "../../lib/dataLoader";
import {
    getTrendData,
} from "../../lib/marketAnalytics";
import { useLanguage } from "../../context/LanguageContext";

const screenWidth = Dimensions.get("window").width - 32;
const AnimatedText = Animated.createAnimatedComponent(Text);

// Custom hook to animate numbers smoothly
function AnimatedNumberText({ value, style, duration = 1500, formatter = (v: number) => v.toString() }: { value: number, style?: any, duration?: number, formatter?: (v: number) => string }) {
    const animValue = useSharedValue(0);

    useEffect(() => {
        animValue.value = withTiming(value, {
            duration,
            easing: Easing.out(Easing.poly(3))
        });
    }, [value]);

    const animatedProps = useAnimatedProps(() => {
        return {
            text: formatter(Math.round(animValue.value))
        } as any;
    });

    return <AnimatedText style={style} animatedProps={animatedProps} />;
}

export default function AnalyticsScreen() {
  const router = useRouter();
  const { t } = useLanguage();

  /* Params from price-result.tsx */
  const params = useLocalSearchParams();
  const spice = String(params.spice || "Cinnamon");
  const profit = Number(params.profit) || 0;
  const revenue = Number(params.revenue) || 0;
  const cost = Number(params.cost) || 0;
  const margin = Number(params.margin) || 0;

  const [marketData, setMarketData] = useState<any[]>([]);

  useEffect(() => {
    async function init() {
      const data = await loadMarketData();
      setMarketData(data);
    }
    init();
  }, []);

  const trend = getTrendData(spice, marketData);

  const staggerDelay = 120;

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Pressable 
           onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/(tabs)/smartindex" as any);
           }} 
           style={({pressed}) => [{ opacity: pressed ? 0.7 : 1, paddingBottom: 16 }]}
        >
          <Text style={styles.back}>← {t("cancel" as any) || "Back to Dashboard"}</Text>
        </Pressable>
        <Text style={styles.title}>{t("analytics" as any) || "Post-Order Analytics"}</Text>
        <Text style={styles.subtitle}>
          {t("marketOverview" as any) || "Financial breakdown"} - <Text style={{color: '#fff', fontFamily: 'Poppins_600SemiBold'}}>{t(spice.toLowerCase() as any)}</Text>
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* HERO CARD */}
          <Animated.View
            entering={FadeInDown.delay(staggerDelay * 1).springify()}
            style={styles.heroCard}
          >
            <View style={styles.heroHeader}>
                <Text style={styles.heroBadge}>{String(t("confirmedYield"))}</Text>
            </View>
            <Text style={styles.marketName}>{String(t("netProfitYield"))}</Text>
            
            <View style={styles.profitContainer}>
                <Text style={styles.currencyPrefix}>LKR</Text>
                <AnimatedNumberText 
                  value={profit} 
                  style={styles.boldProfit} 
                  formatter={(v) => v.toLocaleString()}
                />
            </View>
            <Text style={styles.heroFooter}>{String(t("margin"))}{margin}%</Text>
          </Animated.View>

          {/* FINANCIALS GRID */}
          <Animated.View entering={FadeInDown.delay(staggerDelay * 2).springify()} style={styles.metricsGrid}>
              <View style={[styles.metricCard, { backgroundColor: '#F0FDF4' }]}>
                  <Text style={styles.metricLabel}>{String(t("totalRevenueYield"))}</Text>
                  <AnimatedNumberText 
                      value={revenue} 
                      style={styles.metricValueNPV}
                      formatter={(v) => `Rs.${(v/1000).toFixed(1)}k`}
                  />
              </View>

              <View style={[styles.metricCard, { backgroundColor: '#FEF2F2' }]}>
                  <Text style={styles.metricLabel}>{String(t("totalCost"))}</Text>
                  <AnimatedNumberText 
                      value={cost} 
                      style={styles.metricValueCost}
                      formatter={(v) => `Rs.${(v/1000).toFixed(1)}k`}
                  />
              </View>
          </Animated.View>

          {/* CHART */}
          <Animated.View entering={FadeInDown.delay(staggerDelay * 3).springify()} style={styles.chartCard}>
            <Text style={styles.chartTitle}>{t("performance" as any) || "Historical Market Trend"}</Text>
            <Text style={styles.chartSubtitle}>
              {String(t("pricingPatternFor"))}{t(spice.toLowerCase() as any)}
            </Text>

            <LineChart
              data={{
                labels: trend.labels.length ? trend.labels : ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
                datasets: [{ data: trend.prices.length ? trend.prices : [2000, 2100, 2050, 2200, 2300, 2250] }],
              }}
              width={screenWidth - 40}
              height={220}
              yAxisSuffix=""
              yAxisLabel="Rs."
              withDots
              withInnerLines
              withOuterLines={false}
              fromZero={false}
              segments={4}
              bezier
              chartConfig={{
                backgroundColor: "#ffffff",
                backgroundGradientFrom: "#ffffff",
                backgroundGradientTo: "#ffffff",
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`, // Blue
                labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
                propsForDots: { r: "4", strokeWidth: "2", stroke: "#3B82F6" },
              }}
              style={{
                borderRadius: 16,
                marginTop: 16,
                marginLeft: -16
              }}
            />
          </Animated.View>

          {/* NEXT STEPS */}
          <Animated.View entering={FadeInUp.delay(staggerDelay * 5).springify()} style={{ paddingHorizontal: 16, marginTop: 24 }}>
              <Pressable
                style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push("/(tabs)/farmer");
                }}
              >
                <Text style={styles.primaryBtnText}>{String(t("trackOrderDash"))}</Text>
              </Pressable>
          </Animated.View>

          <View style={{height: 40}} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },

  header: {
    backgroundColor: "#1E293B", 
    padding: 24,
    paddingTop: 60,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: "#1E293B",
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
    zIndex: 10,
  },

  back: {
    color: "#94A3B8",
    fontFamily: "Poppins_500Medium",
    fontSize: 14,
  },

  title: {
    fontSize: 28,
    fontFamily: "Poppins_700Bold",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },

  subtitle: {
    color: "#CBD5E1",
    marginTop: 4,
    fontFamily: "Poppins_400Regular",
    fontSize: 15,
  },

  scrollContent: {
      paddingTop: 20,
      paddingBottom: 40,
  },

  heroCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    padding: 24,
    borderRadius: 24,
    elevation: 4,
    shadowColor: "#64748b",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  
  heroHeader: {
      flexDirection: 'row',
      marginBottom: 12
  },
  
  heroBadge: {
      backgroundColor: '#10B981',
      color: 'white',
      fontFamily: "Poppins_700Bold",
      fontSize: 10,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      letterSpacing: 0.5,
  },

  marketName: {
    fontSize: 22,
    fontFamily: "Poppins_600SemiBold",
    color: "#0F172A",
  },
  
  profitContainer: {
      flexDirection: 'row',
      alignItems: 'baseline',
      marginTop: 4,
  },
  
  currencyPrefix: {
      fontSize: 18,
      fontFamily: "Poppins_600SemiBold",
      color: "#94A3B8",
      marginRight: 6
  },

  boldProfit: {
    fontSize: 36,
    fontFamily: "Poppins_700Bold",
    color: "#10B981",
    letterSpacing: -1,
  },
  
  heroFooter: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderColor: "#F1F5F9",
      fontSize: 14,
      fontFamily: "Poppins_500Medium",
      color: "#64748B",
  },

  metricsGrid: {
      flexDirection: 'row',
      marginHorizontal: 16,
      marginTop: 16,
      justifyContent: 'space-between'
  },
  
  metricCard: {
      width: '48%',
      padding: 16,
      borderRadius: 20,
  },
  
  metricLabel: {
      fontFamily: "Poppins_500Medium",
      color: "#475569",
      fontSize: 13,
  },
  
  metricValueNPV: {
      fontFamily: "Poppins_700Bold",
      fontSize: 22,
      color: "#16A34A",
      marginTop: 8,
  },

  metricValueCost: {
      fontFamily: "Poppins_700Bold",
      fontSize: 22,
      color: "#DC2626",
      marginTop: 8,
  },

  chartCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    borderRadius: 24,
    shadowColor: "#64748b",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },

  chartTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 18,
    color: "#0F172A",
  },

  chartSubtitle: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
    color: "#64748B",
    marginTop: 4,
  },
  
  primaryBtn: {
    backgroundColor: "#0F172A",
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  
  primaryBtnText: {
    color: "white",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
  },
});
