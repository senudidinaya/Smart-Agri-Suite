import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LineChart } from "react-native-chart-kit";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useLanguage } from "../../context/LanguageContext";

import { forecastPrice } from "../../lib/forecastEngine";
import { getBestMarketRecommendation } from "../../lib/marketRecommendationEngine";

const screenWidth = Dimensions.get("window").width - 32;

export default function ProfitAnalyzer() {
  const { t } = useLanguage();
  const [selectedSpice, setSelectedSpice] = useState("Cinnamon");
  const spices = ["Cinnamon", "Pepper", "Cardamom", "Clove"];
  
  const harvestOptions = [25, 50, 100, 150, 200];

  const priceForecast = useMemo(() => forecastPrice(selectedSpice), [selectedSpice]);

  const simulation = useMemo(() => {
    return harvestOptions.map((qty) => {
      const recommendation = getBestMarketRecommendation(selectedSpice, qty, 20000);

      return {
        quantity: qty,
        profit: recommendation?.projectedProfit || 0,
        market: recommendation?.district || 'Colombo',
        revenue: (priceForecast.predictedPrice * qty),
        cost: (priceForecast.predictedPrice * qty) - (recommendation?.projectedProfit || 0)
      };
    });
  }, [selectedSpice, priceForecast]);

  const chartData = useMemo(() => ({
    labels: harvestOptions.map((q) => `${q}kg`),
    datasets: [
      {
        data: simulation.map((s) => s.profit),
      },
    ],
  }), [simulation]);

  const staggerDelay = 100;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.delay(staggerDelay * 1).springify()}>
            <Text style={styles.header}>{t("simulator" as any) || "Profit Analyzer"}</Text>
            <Text style={styles.sub}>
              {t("harvestScenario" as any) || "Estimate returns across harvest scales"}
            </Text>
        </Animated.View>

        {/* SPICE SELECTOR */}
        <Animated.View entering={FadeInDown.delay(staggerDelay * 1.5).springify()} style={{marginBottom: 24}}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{overflow: 'visible'}}>
              {spices.map((spice) => {
                  const isActive = selectedSpice === spice;
                  return (
                      <Pressable 
                          key={spice}
                          onPress={() => setSelectedSpice(spice)}
                          style={[styles.spicePill, isActive && styles.spicePillActive]}
                      >
                          <Text style={[styles.spiceText, isActive && styles.spiceTextActive]}>{t(spice.toLowerCase() as any)}</Text>
                      </Pressable>
                  )
              })}
          </ScrollView>
        </Animated.View>

        <Animated.View style={styles.card} entering={FadeInDown.delay(staggerDelay * 2).springify()}>
          <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 16}}>
              <View style={styles.iconWrap}>
                  <Ionicons name="trending-up" size={18} color="#10B981" />
              </View>
              <View>
                 <Text style={styles.sectionTitleWithoutMargin}>{t("potentialProfit" as any) || "Profit Projection"}</Text>
                 <Text style={styles.cardSub}>Estimated LKR margin vs volume</Text>
              </View>
          </View>

          <View style={{marginLeft: -16}}>
              <LineChart
                key={selectedSpice} // Force remount on spice change
                data={chartData}
                width={screenWidth - 8}
                height={220}
                yAxisLabel=""
                yAxisSuffix=""
                withDots={true}
                withInnerLines={false}
                withOuterLines={false}
                bezier
                formatYLabel={(num) => `${(parseInt(num) / 1000).toFixed(0)}k`}
                chartConfig={{
                  backgroundColor: "#ffffff",
                  backgroundGradientFrom: "#ffffff",
                  backgroundGradientTo: "#ffffff",
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
                  propsForDots: {
                      r: "4",
                      strokeWidth: "2",
                      stroke: "#10B981"
                  }
                }}
                style={{ borderRadius: 16 }}
              />
          </View>
        </Animated.View>

        {/* RESULTS MATRIX */}
        <Animated.View entering={FadeInDown.delay(staggerDelay * 3).springify()}>
            <Text style={[styles.sectionTitle, {marginLeft: 4, marginBottom: 16}]}>{t("harvestScenario" as any) || "Harvest Scenarios"}</Text>
            {simulation.map((s, index) => (
                <Animated.View 
                    key={s.quantity} 
                    style={styles.scenarioCard}
                    entering={FadeInDown.delay(staggerDelay * (4 + index * 0.5)).springify()}
                >
                    <View style={styles.scenarioHeader}>
                        <View style={styles.qtyBadge}>
                            <Text style={styles.qtyText}>{s.quantity} {t("kg" as any) || "kg"}</Text>
                        </View>
                        <View style={styles.targetMarket}>
                            <Ionicons name="location" size={12} color="#4338CA" />
                            <Text style={styles.marketText}>{t("recommendedMarket" as any) || "Optimal"}: <Text style={{fontFamily: 'Poppins_600SemiBold', color: '#334155'}}>{s.market}</Text></Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.metricsRow}>
                        <View style={styles.metricBlock}>
                             <Text style={styles.metricLabel}>{t("revenue" as any) || "Gross Revenue"}</Text>
                             <Text style={styles.metricValue}>{t("currencySymbol" as any) || "LKR"} {Math.round(s.revenue).toLocaleString()}</Text>
                        </View>
                        
                        <View style={[styles.metricBlock, {alignItems: 'flex-end'}]}>
                             <Text style={styles.metricLabel}>{t("profit" as any) || "Net Profit"}</Text>
                             <Text style={styles.profitValue}>{t("currencySymbol" as any) || "LKR"} {Math.round(s.profit).toLocaleString()}</Text>
                        </View>
                    </View>
                </Animated.View>
            ))}
        </Animated.View>
        
        <View style={{height: 40}} />
      </ScrollView>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: { 
      padding: 16,
      paddingTop: 24,
  },

  header: {
    fontFamily: "Poppins_700Bold",
    fontSize: 26,
    color: "#0F172A",
    letterSpacing: -0.5,
  },

  sub: {
    color: "#64748B",
    fontSize: 15,
    fontFamily: "Poppins_400Regular",
    marginBottom: 20
  },

  spicePill: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 20,
      backgroundColor: '#fff',
      marginRight: 10,
      borderWidth: 1,
      borderColor: '#E2E8F0',
      shadowColor: "#64748b",
      shadowOpacity: 0.04,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
  },
  spicePillActive: {
      backgroundColor: '#1E293B',
      borderColor: '#1E293B'
  },
  spiceText: {
      fontFamily: "Poppins_500Medium",
      color: "#64748B",
      fontSize: 14
  },
  spiceTextActive: {
      color: '#fff',
      fontFamily: "Poppins_600SemiBold",
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#64748b",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },

  iconWrap: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: '#ECFDF5',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12
  },

  sectionTitleWithoutMargin: {
    fontSize: 18,
    fontFamily: "Poppins_600SemiBold",
    color: "#0F172A",
  },
  cardSub: {
      fontFamily: "Poppins_400Regular",
      fontSize: 12,
      color: "#64748B",
      marginTop: 2
  },

  sectionTitle: {
    fontSize: 18,
    fontFamily: "Poppins_600SemiBold",
    color: "#0F172A",
  },

  scenarioCard: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(241, 245, 249, 0.8)',
    shadowColor: "#64748b",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },

  scenarioHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center'
  },

  qtyBadge: {
      backgroundColor: '#F1F5F9',
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 12,
      alignItems: 'center'
  },

  qtyText: {
    fontFamily: "Poppins_700Bold",
    color: "#0F172A",
    fontSize: 14
  },

  targetMarket: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#EEF2FF',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
  },
  
  marketText: {
      fontFamily: "Poppins_400Regular",
      fontSize: 12,
      color: "#64748B",
      marginLeft: 6
  },

  divider: {
      height: 1,
      backgroundColor: '#F1F5F9',
      marginVertical: 16
  },
  
  metricsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between'
  },
  
  metricBlock: {
      flex: 1
  },

  metricLabel: {
      fontFamily: "Poppins_400Regular",
      color: "#64748B",
      fontSize: 12,
      marginBottom: 4
  },

  metricValue: {
    fontSize: 16,
    color: "#334155",
    fontFamily: "Poppins_600SemiBold",
  },
  
  profitValue: {
    fontSize: 18,
    color: "#10B981",
    fontFamily: "Poppins_700Bold",
  }
});
