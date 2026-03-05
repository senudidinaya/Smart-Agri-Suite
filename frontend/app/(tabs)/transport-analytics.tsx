import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BarChart, PieChart, LineChart } from "react-native-chart-kit";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useLanguage } from "../../context/LanguageContext";

const { width } = Dimensions.get("window");

export default function TransportAnalytics() {
  const { t } = useLanguage();

  const chartConfig = {
    backgroundColor: "#ffffff",
    backgroundGradientFrom: "#ffffff",
    backgroundGradientTo: "#ffffff",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
    style: { borderRadius: 16 },
    propsForDots: { r: "4", strokeWidth: "2", stroke: "#3B82F6" },
  };

  const costDistributionData = {
    labels: ["Van", "Lorry", "Train", "TukTuk"],
    datasets: [{ data: [12000, 8000, 4500, 15000] }],
  };

  const deliveryTimeData = {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    datasets: [{ data: [2.5, 2.1, 3.4, 1.8, 2.2] }],
  };

  const pieChartData = [
    { name: "Van", population: 45, color: "#3B82F6", legendFontColor: "#64748B", legendFontSize: 12 },
    { name: "Lorry", population: 35, color: "#10B981", legendFontColor: "#64748B", legendFontSize: 12 },
    { name: "Train", population: 15, color: "#F59E0B", legendFontColor: "#64748B", legendFontSize: 12 },
    { name: "TukTuk", population: 5, color: "#EF4444", legendFontColor: "#64748B", legendFontSize: 12 },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* HEADER */}
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <Text style={styles.headerTitle}>Overview Analytics</Text>
          <Text style={styles.headerSub}>Transport Efficiency & Cost Analysis</Text>
        </Animated.View>

        {/* INSIGHT CARDS */}
        <Animated.View style={styles.insightGrid} entering={FadeInDown.delay(200).springify()}>
          <View style={styles.insightCard}>
            <View style={[styles.insightIconWrap, { backgroundColor: "#10B98115" }]}>
              <Ionicons name="flash" size={20} color="#10B981" />
            </View>
            <Text style={styles.insightTitle}>{t("fastestRoute")}</Text>
            <Text style={styles.insightValue}>Matale → Kandy</Text>
            <Text style={styles.insightSub}>Avg. 1h 15m (Van)</Text>
          </View>
          
          <View style={styles.insightCard}>
            <View style={[styles.insightIconWrap, { backgroundColor: "#3B82F615" }]}>
              <Ionicons name="cash" size={20} color="#3B82F6" />
            </View>
            <Text style={styles.insightTitle}>{t("cheapestRoute")}</Text>
            <Text style={styles.insightValue}>Matale → Colombo</Text>
            <Text style={styles.insightSub}>Rs. 24/kg (Train)</Text>
          </View>
        </Animated.View>

        {/* PIE CHART - MODE USAGE */}
        <Animated.View style={styles.card} entering={FadeInDown.delay(300).springify()}>
          <Text style={styles.sectionTitle}>{t("modeUsage")}</Text>
          <PieChart
            data={pieChartData}
            width={width - 72}
            height={160}
            chartConfig={chartConfig}
            accessor={"population"}
            backgroundColor={"transparent"}
            paddingLeft={"0"}
            center={[10, 0]}
            absolute
          />
        </Animated.View>

        {/* BAR CHART - COST DISTRIBUTION */}
        <Animated.View style={styles.card} entering={FadeInDown.delay(400).springify()}>
          <Text style={styles.sectionTitle}>Avg. Cost by Mode (Rs/Trip)</Text>
          <BarChart
            style={styles.chartStyle}
            data={costDistributionData}
            width={width - 56}
            height={200}
            yAxisLabel="Rs "
            yAxisSuffix=""
            chartConfig={{...chartConfig, color: (opacity = 1) => `rgba(245, 158, 11, ${opacity})`}}
            verticalLabelRotation={0}
            fromZero
          />
        </Animated.View>

        {/* LINE CHART - DELIVERY TIMES */}
        <Animated.View style={styles.card} entering={FadeInDown.delay(500).springify()}>
          <Text style={styles.sectionTitle}>Avg. Delivery Time (Hours)</Text>
          <LineChart
            style={styles.chartStyle}
            data={deliveryTimeData}
            width={width - 56}
            height={200}
            yAxisLabel=""
            yAxisSuffix="h"
            chartConfig={{...chartConfig, color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`}}
            bezier
          />
        </Animated.View>

        {/* SMART SUGGESTION */}
        <Animated.View style={styles.tipCard} entering={FadeInDown.delay(600).springify()}>
          <View style={styles.tipHeaderRow}>
            <Ionicons name="sparkles" size={20} color="#fff" />
            <Text style={styles.tipTitle}>AI Optimization</Text>
          </View>
          <Text style={styles.tipText}>
            Transporting cinnamon from Matale to Colombo using Van increases delivery efficiency by 32% compared to Lorry, resulting in a 14% higher preservation of spice quality.
          </Text>
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

  insightGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  insightCard: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#64748b",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  insightIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  insightTitle: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
    color: "#64748B",
  },
  insightValue: {
    fontFamily: "Poppins_700Bold",
    fontSize: 14,
    color: "#0F172A",
    marginTop: 2,
  },
  insightSub: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 4,
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
  sectionTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    color: "#1E293B",
    marginBottom: 16,
  },
  chartStyle: {
    marginVertical: 8,
    borderRadius: 16,
    marginLeft: -16,
  },

  tipCard: {
    backgroundColor: "#2563EB",
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
    shadowColor: "#2563EB",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  tipHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  tipTitle: {
    color: "white",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    marginLeft: 6,
  },
  tipText: {
    color: "rgba(255,255,255,0.9)",
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    lineHeight: 22,
  },
});
