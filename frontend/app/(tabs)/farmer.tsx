import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BarChart, PieChart } from "react-native-chart-kit";
import { Ionicons } from "@expo/vector-icons";

import { useLanguage } from "../../context/LanguageContext";

const screenWidth = Dimensions.get("window").width;

export default function FarmerDashboard() {
  const { t } = useLanguage();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Real-time values for active pipeline
  const [transitCount, setTransitCount] = useState(12);
  const [deliveredToday, setDeliveredToday] = useState(8);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Subtle live updates
    const interval = setInterval(() => {
      setTransitCount((prev) => Math.max(5, Math.min(20, prev + (Math.random() > 0.5 ? 1 : -1))));
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // Updated Profit Trend Logic: Bar Chart by Spice Type
  const profitData = {
    labels: [t("cinnamon"), t("pepper"), t("cardamom"), t("clove"), t("nutmeg")],
    datasets: [
      {
        data: [450, 320, 580, 210, 390], // Profit in 1000s LKR
      },
    ],
  };

  // Updated Demand Map Logic: Percentage based
  const demandPieData = [
    {
      name: t("colombo"),
      population: 35,
      color: "#F59E0B",
      legendFontColor: "#475569",
      legendFontSize: 12,
    },
    {
      name: t("kandy"),
      population: 25,
      color: "#10B981",
      legendFontColor: "#475569",
      legendFontSize: 12,
    },
    {
      name: t("matale"),
      population: 20,
      color: "#3B82F6",
      legendFontColor: "#475569",
      legendFontSize: 12,
    },
    {
      name: t("other"),
      population: 20,
      color: "#94A3B8",
      legendFontColor: "#475569",
      legendFontSize: 12,
    },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          
          <Text style={styles.title}>{t("farmerDashboard")}</Text>
          <Text style={styles.subtitle}>{t("overviewTitle")}</Text>

          {/* ─── HIGHLIGHT CARDS ─── */}
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: "#FFF7ED" }]}>
              <View style={[styles.iconBox, { backgroundColor: "#FFEDD5" }]}>
                <Ionicons name="cash" size={20} color="#EA580C" />
              </View>
              <Text style={styles.statLabel}>{t("estimatedProfit")}</Text>
              <Text style={[styles.statValue, { color: "#9A3412" }]}>LKR 1.2M</Text>
              <Text style={styles.statTrend}>↑ 12% {t("vsLastMonth")}</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: "#F0FDF4" }]}>
              <View style={[styles.iconBox, { backgroundColor: "#DCFCE7" }]}>
                <Ionicons name="cube" size={20} color="#16A34A" />
              </View>
              <Text style={styles.statLabel}>{t("activeOrders")}</Text>
              <Text style={[styles.statValue, { color: "#166534" }]}>{transitCount + deliveredToday}</Text>
              <Text style={styles.statTrend}>{transitCount} {t("inTransit")}</Text>
            </View>
          </View>

          {/* ─── PROFIT BY SPICE (Bar Chart) ─── */}
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <Ionicons name="bar-chart" size={18} color="#0F172A" />
              <Text style={styles.chartTitle}>{t("profitTrend")}</Text>
            </View>
            <Text style={styles.chartSub}>{t("profitBySpiceDesc") || "Cumulative profit breakdown by spice type (LKR '000)"}</Text>
            
            <BarChart
              data={profitData}
              width={screenWidth - 64}
              height={220}
              yAxisLabel=""
              yAxisSuffix="k"
              chartConfig={{
                backgroundColor: "#ffffff",
                backgroundGradientFrom: "#ffffff",
                backgroundGradientTo: "#ffffff",
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
                style: { borderRadius: 16 },
                propsForBackgroundLines: {
                  strokeDasharray: "",
                  stroke: "#f1f5f9",
                }
              }}
              verticalLabelRotation={0}
              style={{
                marginVertical: 16,
                borderRadius: 16,
              }}
            />
          </View>

          {/* ─── DEMAND DISTRIBUTION (Pie Chart) ─── */}
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <Ionicons name="pie-chart" size={18} color="#0F172A" />
              <Text style={styles.chartTitle}>{t("demandMap")}</Text>
            </View>
            <Text style={styles.chartSub}>{t("regionalDemandDesc") || "Market demand percentage distribution across key regions"}</Text>

            <PieChart
              data={demandPieData}
              width={screenWidth - 64}
              height={200}
              chartConfig={{
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              }}
              accessor={"population"}
              backgroundColor={"transparent"}
              paddingLeft={"15"}
              center={[10, 0]}
              absolute={false} // Show as percentage
            />
          </View>

          {/* ─── ACTIVE PIPELINE ─── */}
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <Ionicons name="git-network" size={18} color="#0F172A" />
              <Text style={styles.chartTitle}>{t("activePipeline")}</Text>
            </View>
            
            <View style={styles.pipelineRow}>
              <PipelineStep label={t("harvested") || "Harvested"} count="450kg" icon="leaf" color="#10B981" active />
              <View style={styles.pipelineConnector} />
              <PipelineStep label={t("inTransit")} count={transitCount} icon="car" color="#3B82F6" active />
              <View style={styles.pipelineConnector} />
              <PipelineStep label={t("delivered") || "Delivered"} count={deliveredToday} icon="checkmark-circle" color="#F59E0B" />
            </View>
          </View>

        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

function PipelineStep({ label, count, icon, color, active }: any) {
  return (
    <View style={styles.pStep}>
      <View style={[styles.pIcon, { backgroundColor: active ? color : "#F1F5F9" }]}>
        <Ionicons name={icon} size={16} color={active ? "#fff" : "#94A3B8"} />
      </View>
      <Text style={styles.pCount}>{count}</Text>
      <Text style={styles.pLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8FAFC" },
  container: { flex: 1, paddingHorizontal: 20 },
  title: { fontSize: 28, fontFamily: "Poppins_700Bold", color: "#0F172A", marginTop: 10 },
  subtitle: { fontSize: 16, fontFamily: "Poppins_400Regular", color: "#64748B", marginBottom: 20 },
  
  statsGrid: { flexDirection: "row", gap: 12, marginBottom: 20 },
  statCard: { flex: 1, padding: 16, borderRadius: 20, borderWeight: 1, borderColor: "rgba(0,0,0,0.05)" },
  iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyCenter: "center", marginBottom: 12, paddingTop: 8, paddingLeft: 8 },
  statLabel: { fontSize: 12, fontFamily: "Poppins_500Medium", color: "#64748B" },
  statValue: { fontSize: 20, fontFamily: "Poppins_700Bold", marginVertical: 4 },
  statTrend: { fontSize: 11, fontFamily: "Poppins_600SemiBold", color: "#16A34A" },

  chartCard: { backgroundColor: "#fff", padding: 20, borderRadius: 24, marginBottom: 20, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  chartHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  chartTitle: { fontSize: 16, fontFamily: "Poppins_700Bold", color: "#0F172A" },
  chartSub: { fontSize: 12, fontFamily: "Poppins_400Regular", color: "#94A3B8", marginBottom: 10 },

  pipelineRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 16 },
  pStep: { alignItems: "center", flex: 1 },
  pIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  pCount: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#1E293B", marginTop: 8 },
  pLabel: { fontSize: 10, fontFamily: "Poppins_500Medium", color: "#64748B" },
  pipelineConnector: { height: 2, flex: 1, backgroundColor: "#F1F5F9", marginBottom: 40 },
});
