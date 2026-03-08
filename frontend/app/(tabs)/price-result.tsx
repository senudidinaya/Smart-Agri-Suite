import { useEffect, useRef, useState } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useLanguage } from "../../context/LanguageContext";

const { width: screenWidth } = Dimensions.get("window");

const REGIONS = ["Colombo", "Kandy", "Matale", "Kurunegala", "Dambulla"];

export default function PriceResult() {
  const { t } = useLanguage();
  const [selectedRegion, setSelectedRegion] = useState("Colombo");
  const [price, setPrice] = useState(2400);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    // Live price simulation
    const interval = setInterval(() => {
      setPrice(prev => prev + (Math.random() * 20 - 10));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const changeRegion = (r: string) => {
    Haptics.selectionAsync();
    setSelectedRegion(r);
    // Simulate region-based price change
    const basePrices: Record<string, number> = {
      Colombo: 2400,
      Kandy: 2250,
      Matale: 2100,
      Kurunegala: 2050,
      Dambulla: 2150,
    };
    setPrice(basePrices[r] || 2000);
  };

  const chartData = {
    labels: ["08:00", "10:00", "12:00", "14:00", "16:00", "Now"],
    datasets: [
      {
        data: [
          price - 40,
          price - 10,
          price + 20,
          price - 5,
          price + 15,
          price,
        ],
      },
    ],
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <Text style={styles.title}>{t("marketIntelligence") || "Live Market Analysis"}</Text>
        
        <View style={styles.priceCard}>
          <Text style={styles.regionLabel}>{t("currentPriceIn")} {selectedRegion}</Text>
          <Text style={styles.priceValue}>LKR {price.toLocaleString(undefined, { maximumFractionDigits: 0 })} /kg</Text>
          <View style={styles.trendBadge}>
            <Ionicons name="trending-up" size={14} color="#10B981" />
            <Text style={styles.trendText}>+4.2% {t("today")}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>{t("priceTrend")}</Text>
        <View style={styles.chartWrapper}>
          <LineChart
            data={chartData}
            width={screenWidth - 40}
            height={220}
            chartConfig={{
              backgroundColor: "#fff",
              backgroundGradientFrom: "#fff",
              backgroundGradientTo: "#fff",
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(245, 158, 11, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
              propsForDots: { r: "5", strokeWidth: "2", stroke: "#F59E0B" },
              propsForLabels: {
                fontSize: 10,
                fontFamily: "Poppins_400Regular"
              }
            }}
            bezier
            style={styles.chart}
          />
        </View>

        <Text style={styles.sectionTitle}>{t("selectRegion")}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.regionSelector}>
          {REGIONS.map((r) => (
            <Pressable
              key={r}
              onPress={() => changeRegion(r)}
              style={[styles.regionBtn, selectedRegion === r && styles.regionBtnActive]}
            >
              <Text style={[styles.regionBtnText, selectedRegion === r && styles.regionBtnTextActive]}>
                {r}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8FAFC" },
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, fontFamily: "Poppins_700Bold", color: "#0F172A", marginBottom: 20 },
  
  priceCard: { backgroundColor: "#fff", padding: 24, borderRadius: 24, alignItems: "center", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 15, elevation: 5, marginBottom: 24 },
  regionLabel: { fontSize: 14, fontFamily: "Poppins_500Medium", color: "#64748B", marginBottom: 8 },
  priceValue: { fontSize: 32, fontFamily: "Poppins_700Bold", color: "#0F172A" },
  trendBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "#F0FDF4", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginTop: 12, gap: 4 },
  trendText: { fontSize: 13, fontFamily: "Poppins_600SemiBold", color: "#10B981" },

  sectionTitle: { fontSize: 16, fontFamily: "Poppins_600SemiBold", color: "#475569", marginBottom: 12 },
  chartWrapper: { backgroundColor: "#fff", borderRadius: 24, padding: 10, marginBottom: 24 },
  chart: { borderRadius: 24 },

  regionSelector: { flexDirection: "row", marginBottom: 20 },
  regionBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 16, backgroundColor: "#fff", marginRight: 10, borderWidth: 1, borderColor: "#E2E8F0" },
  regionBtnActive: { backgroundColor: "#0F172A", borderColor: "#0F172A" },
  regionBtnText: { fontSize: 14, fontFamily: "Poppins_600SemiBold", color: "#64748B" },
  regionBtnTextActive: { color: "#fff" },
});
