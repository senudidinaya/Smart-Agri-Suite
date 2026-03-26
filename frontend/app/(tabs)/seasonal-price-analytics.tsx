import { SafeAreaView } from "react-native-safe-area-context";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LineChart, BarChart, StackedBarChart } from "react-native-chart-kit";
import { AnimatedCircularProgress } from "react-native-circular-progress";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useLanguage } from "../../context/LanguageContext";
import { fetchWithTimeout, API_BASE_URL } from "../../lib/apiConfig";

const { width } = Dimensions.get("window");
export default function SeasonalAnalytics() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  /*  */ const fallbackData = {
    spice: "Cinnamon",
    seasonalTrend: [
      { season: "Maha", averagePrice: 2280 },
      { season: "Dry", averagePrice: 1850 },
      { season: "InterMonsoon", averagePrice: 2000 },
      { season: "Yala", averagePrice: 2180 },
    ],
    rainfallCorrelation: [
      /*  */ { x: 40, y: 1820 },
      { x: 90, y: 2000 },
      { x: 150, y: 2100 },
      { x: 250, y: 2250 },
      { x: 290, y: 2350 },
    ],
    tempImpact: [
      { temp: 26, price: 2300 },
      { temp: 28, price: 2100 },
      { temp: 30, price: 1900 },
      { temp: 32, price: 1800 },
    ],
    supplyDemandBalance: [
      { season: "Maha", supply: 0.4, demand: 0.88 },
      { season: "Yala", supply: 0.48, demand: 0.85 },
      { season: "Dry", supply: 0.74, demand: 0.73 },
    ],
    aiForecast: {
      forecastedPrice: 2470,
      percentChange: "+8%",
      predictionText:
        "Cinnamon price is forecasted to increase by 8% during the next Maha season due to expected heavy rainfall reducing supply.",
    },
    weatherImpact: { score: 78, severity: "High" },
  };
  useEffect(() => {
    // Attempt to fetch from real backend
    fetchWithTimeout(`${API_BASE_URL}/seasonal-analytics?spice=Cinnamon`)
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "success" && data.data) {
          setData(data.data.seasonal_metrics);
        } else {
          setData(fallbackData); // If fetch is successful but data is not valid, use fallback
        }
      })
      .catch((err) => {
        console.log("Using Seasonal fallback data", err.message);
        setData(fallbackData);
      })
      .finally(() => setLoading(false));
  }, []);
  if (loading || !data) {
    return (
      <SafeAreaView
        style={[
          styles.safeArea,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color="#10B981" />
        <Text
          style={{
            marginTop: 10,
            fontFamily: "Poppins_500Medium",
            color: "#64748B",
          }}
        >
          {t("loading" as any)}
        </Text>
      </SafeAreaView>
    );
  }
  const chartConfig = {
    backgroundColor: "#ffffff",
    backgroundGradientFrom: "#ffffff",
    backgroundGradientTo: "#ffffff",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
    style: { borderRadius: 16 },
    propsForDots: { r: "4", strokeWidth: "2", stroke: "#10B981" },
  };
  const trendData = {
    labels: data.seasonalTrend.map((s: any) => s.season.slice(0, 4)),
    datasets: [{ data: data.seasonalTrend.map((s: any) => s.averagePrice) }],
  };
  /*  */ const rainData = {
    labels: data.rainfallCorrelation
      .filter((_: any, i: number) => i % 2 === 0)
      .map((r: any) => `${r.x}mm`),
    datasets: [
      {
        data: data.rainfallCorrelation
          .filter((_: any, i: number) => i % 2 === 0)
          .map((r: any) => r.y),
      },
    ],
  };
  const stackedData = {
    labels: data.supplyDemandBalance.map((s: any) => s.season.slice(0, 4)),
    legend: ["Supply", "Demand"],
    data: data.supplyDemandBalance.map((s: any) => [
      s.supply * 100,
      s.demand * 100,
    ]),
    barColors: ["#F59E0B", "#3B82F6"],
  };
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        
        {/* HEADER */}
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          
          <Text style={styles.headerTitle}>
            {t("seasonalAnalytics" as any) || "Seasonal Analytics"}
          </Text>
          <Text style={styles.headerSub}>
            Weather & Price Correlations
          </Text>
        </Animated.View>
        {/* AI FORECAST PANEL & IMPACT SCORE */}
        <Animated.View
          style={styles.topRowGrid}
          entering={FadeInDown.delay(200).springify()}
        >
          
          <View
            style={[
              styles.card,
              { width: "58%", padding: 16, marginBottom: 0 },
            ]}
          >
            
            <View style={styles.rowAlign}>
              
              <Ionicons name="sparkles" size={18} color="#8B5CF6" />
              <Text style={styles.forecastTitle}>AI Forecast</Text>
            </View>
            <Text style={styles.forecastPrice}>
              LKR {data.aiForecast.forecastedPrice}
            </Text>
            <View style={styles.badgeRow}>
              
              <View style={styles.badgeGreen}>
                <Text style={styles.badgeTextGreen}>
                  {data.aiForecast.percentChange}
                </Text>
              </View>
              <Text style={styles.badgeSub}>Next Season</Text>
            </View>
            <Text style={styles.forecastDesc}>
              {data.aiForecast.predictionText}
            </Text>
          </View>
          <View
            style={[
              styles.card,
              {
                width: "38%",
                padding: 12,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 0,
              },
            ]}
          >
            
            <Text style={styles.gaugeTitle}>Weather Impact</Text>
            <AnimatedCircularProgress
              size={80}
              width={10}
              fill={data.weatherImpact.score}
              tintColor={
                data.weatherImpact.severity === "High" ? "#EF4444" : "#F59E0B"
              }
              backgroundColor="#E2E8F0"
              lineCap="round"
              rotation={220}
              arcSweepAngle={280}
              duration={1500}
            >
              
              {() => (
                <Text style={styles.gaugeNumber}>
                  {data.weatherImpact.score}
                </Text>
              )}
            </AnimatedCircularProgress>
            <Text style={styles.gaugeSub}>
              {data.weatherImpact.severity} Impact
            </Text>
          </View>
        </Animated.View>
        {/* TREND CHART */}
        <Animated.View
          style={styles.card}
          entering={FadeInDown.delay(300).springify()}
        >
          
          <Text style={styles.sectionTitle}>Seasonal Price Trend</Text>
          <Text style={styles.insightText}>
            Maha season rainfall reduces cinnamon supply, causing a ~12%
            increase in market price.
          </Text>
          <LineChart
            data={trendData}
            width={width - 56}
            height={180}
            bezier
            yAxisLabel=""
            yAxisSuffix=""
            chartConfig={chartConfig}
            style={styles.chartStyle}
          />
        </Animated.View>
        {/* RAINFALL CORRELATION */}
        <Animated.View
          style={styles.card}
          entering={FadeInDown.delay(400).springify()}
        >
          
          <Text style={styles.sectionTitle}>
            Rainfall vs Price Correlation
          </Text>
          <Text style={styles.insightText}>
            When rainfall exceeds 200mm, supply drops by 15% and prices surge.
          </Text>
          <LineChart
            data={rainData}
            width={width - 56}
            height={180}
            yAxisLabel=""
            yAxisSuffix=""
            chartConfig={{
              ...chartConfig,
              color: (o = 1) => `rgba(59, 130, 246, ${o})`,
            }}
            style={styles.chartStyle}
          />
        </Animated.View>
        {/* SUPPLY DEMAND STACKED */}
        <Animated.View
          style={styles.card}
          entering={FadeInDown.delay(500).springify()}
        >
          
          <Text style={styles.sectionTitle}>
            Seasonal Supply vs Demand
          </Text>
          <Text style={styles.insightText}>
            Demand vastly exceeds supply during Maha & Yala seasons creating
            highly favorable selling conditions.
          </Text>
          <StackedBarChart
            data={stackedData}
            width={width - 56}
            height={200}
            chartConfig={{
              ...chartConfig,
              color: (o = 1) => `rgba(15, 23, 42, ${o})`,
            }}
            style={styles.chartStyle}
            hideLegend={false}
          />
        </Animated.View>
        {/* RANKINGS OR CALENDAR */}
        <Animated.View
          style={styles.card}
          entering={FadeInDown.delay(600).springify()}
        >
          
          <Text style={styles.sectionTitle}>
            Spice Seasonal Ranking Growth
          </Text>
          <View style={styles.rankingRow}>
            
            <View style={[styles.rankCircle, { backgroundColor: "#10B981" }]}>
              <Text style={styles.rankNum}>1</Text>
            </View>
            <Text style={styles.rankName}>Cinnamon</Text>
            <Text style={styles.rankGrowth}>+9%</Text>
          </View>
          <View style={styles.rankingRow}>
            
            <View style={[styles.rankCircle, { backgroundColor: "#F59E0B" }]}>
              <Text style={styles.rankNum}>2</Text>
            </View>
            <Text style={styles.rankName}>Clove</Text>
            <Text style={styles.rankGrowth}>+8%</Text>
          </View>
          <View style={styles.rankingRow}>
            
            <View style={[styles.rankCircle, { backgroundColor: "#3B82F6" }]}>
              <Text style={styles.rankNum}>3</Text>
            </View>
            <Text style={styles.rankName}>Nutmeg</Text>
            <Text style={styles.rankGrowth}>+7%</Text>
          </View>
        </Animated.View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  container: { padding: 16, paddingTop: 24 },
  headerTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 26,
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  headerSub: {
    color: "#64748B",
    fontSize: 15,
    fontFamily: "Poppins_400Regular",
    marginBottom: 20,
  },
  topRowGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#64748b",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  rowAlign: { flexDirection: "row", alignItems: "center" },
  forecastTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: "#8B5CF6",
    marginLeft: 4,
  },
  forecastPrice: {
    fontFamily: "Poppins_700Bold",
    fontSize: 24,
    color: "#0F172A",
    marginTop: 4,
    letterSpacing: -0.5,
  },
  badgeRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  badgeGreen: {
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeTextGreen: {
    color: "#10B981",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11,
  },
  badgeSub: {
    marginLeft: 6,
    fontFamily: "Poppins_500Medium",
    color: "#64748B",
    fontSize: 11,
  },
  forecastDesc: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 10,
    lineHeight: 16,
  },
  gaugeTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: "#1E293B",
    marginBottom: 8,
    textAlign: "center",
  },
  gaugeNumber: {
    fontFamily: "Poppins_700Bold",
    fontSize: 18,
    color: "#0F172A",
  },
  gaugeSub: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11,
    color: "#64748B",
    marginTop: 8,
  },
  sectionTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    color: "#1E293B",
  },
  insightText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
    marginBottom: 12,
    lineHeight: 18,
  },
  chartStyle: { marginVertical: 4, borderRadius: 16, marginLeft: -16 },
  rankingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  rankCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  rankNum: { fontFamily: "Poppins_700Bold", fontSize: 12, color: "#fff" },
  rankName: {
    fontFamily: "Poppins_500Medium",
    fontSize: 15,
    color: "#1E293B",
    flex: 1,
  },
  rankGrowth: { fontFamily: "Poppins_700Bold", fontSize: 15, color: "#10B981" },
});
