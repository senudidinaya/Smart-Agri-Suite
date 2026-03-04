import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
    Dimensions,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import Animated, { FadeInDown } from "react-native-reanimated";

import { forecastDemandByRegion } from "../../lib/forecastEngine";

const screenWidth = Dimensions.get("window").width - 32;

export default function DemandPrediction() {
  const [selectedSpice, setSelectedSpice] = useState("Cinnamon");
  const spices = ["Cinnamon", "Pepper", "Cardamom", "Clove"];

  const demandForecast = useMemo(() => forecastDemandByRegion(selectedSpice), [selectedSpice]);
  const topRegions = demandForecast.slice(0, 5);

  const chartData = useMemo(() => ({
    labels: topRegions.map((r) => r.district.substring(0, 3)), 
    datasets: [
      {
        data: topRegions.map((r) => r.demand),
      },
    ],
  }), [topRegions]);

  const heatColor = (value: number) => {
    if (value > 80) return "#EF4444"; 
    if (value > 60) return "#F59E0B"; 
    if (value > 40) return "#10B981"; 
    return "#94A3B8"; 
  };

  const staggerDelay = 100;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.delay(staggerDelay * 1).springify()}>
            <Text style={styles.header}>Market Demand</Text>
            <Text style={styles.sub}>
              Regional forecasts & hotspots
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
                          <Text style={[styles.spiceText, isActive && styles.spiceTextActive]}>{spice}</Text>
                      </Pressable>
                  )
              })}
          </ScrollView>
        </Animated.View>

        {/* HEATMAP */}
        <Animated.View style={styles.card} entering={FadeInDown.delay(staggerDelay * 2).springify()}>
          <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 16}}>
              <View style={styles.iconWrap}>
                  <Ionicons name="map" size={18} color="#EF4444" />
              </View>
              <View>
                 <Text style={styles.sectionTitleWithoutMargin}>Market Heatmap</Text>
                 <Text style={styles.cardSub}>Live regional demand index</Text>
              </View>
          </View>

          <View style={styles.heatmapGrid}>
            {demandForecast.slice(0, 6).map((item) => (
              <View
                key={item.district}
                style={[
                  styles.heatCell,
                  { backgroundColor: heatColor(item.demand) },
                ]}
              >
                <Text style={styles.heatRegion}>{item.district}</Text>
                <Text style={styles.heatValue}>{item.demand}%</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* DEMAND CHART */}
        <Animated.View style={styles.card} entering={FadeInDown.delay(staggerDelay * 3).springify()}>
          <Text style={styles.sectionTitle}>Demand Trajectory</Text>
          <View style={{marginLeft: -16, marginTop: 10}}>
              <LineChart
                data={chartData}
                width={screenWidth - 8}
                height={220}
                yAxisLabel=""
                yAxisSuffix="%"
                withDots={true}
                withInnerLines={false}
                withOuterLines={false}
                bezier
                chartConfig={{
                  backgroundColor: "#ffffff",
                  backgroundGradientFrom: "#ffffff",
                  backgroundGradientTo: "#ffffff",
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(245, 158, 11, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
                  propsForDots: {
                      r: "4",
                      strokeWidth: "2",
                      stroke: "#F59E0B"
                  }
                }}
                style={{ borderRadius: 16 }}
              />
          </View>
        </Animated.View>

        {/* TOP REGIONS */}
        <Animated.View style={styles.card} entering={FadeInDown.delay(staggerDelay * 4).springify()}>
          <Text style={[styles.sectionTitle, {marginBottom: 16}]}>Top Demand Regions</Text>

          {topRegions.map((r, index) => (
            <View key={r.district} style={[styles.row, index === topRegions.length - 1 && { borderBottomWidth: 0, paddingBottom: 0 }]}>
              <View style={styles.rankBadge}>
                 <Text style={styles.rankText}>{index + 1}</Text>
              </View>

              <Text style={styles.region}>{r.district}</Text>

              <View style={styles.valueWrap}>
                 <Text style={styles.value}>{r.demand}%</Text>
                 {r.demand > 60 && <Ionicons name="trending-up" size={14} color="#EF4444" style={{marginLeft: 4}} />}
              </View>
            </View>
          ))}
        </Animated.View>

        {/* PREDICTION INSIGHTS */}
        <Animated.View style={styles.tipCard} entering={FadeInDown.delay(staggerDelay * 5).springify()}>
          <View style={styles.tipHeaderRow}>
             <Ionicons name="sparkles" size={20} color="#fff" />
             <Text style={styles.tipTitle}>AI Insights & Action</Text>
          </View>

          <View style={styles.tipRow}>
             <Ionicons name="checkmark-circle" size={16} color="rgba(255,255,255,0.8)" />
             <Text style={styles.tipText}>
                Highest demand expected in {topRegions[0]?.district} ({topRegions[0]?.demand}%).
             </Text>
          </View>
          
          <View style={styles.tipRow}>
             <Ionicons name="checkmark-circle" size={16} color="rgba(255,255,255,0.8)" />
             <Text style={styles.tipText}>
                Identify transport routes optimizing supply to {topRegions[0]?.district} and {topRegions[1]?.district}.
             </Text>
          </View>
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

  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#64748b",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
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

  iconWrap: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: '#FEF2F2',
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
    marginBottom: 12,
  },

  heatmapGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 8
  },
  heatCell: {
    width: "30%",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  heatRegion: {
    color: "white",
    fontFamily: "Poppins_500Medium",
    fontSize: 11
  },
  heatValue: {
    color: "white",
    fontSize: 18,
    fontFamily: "Poppins_700Bold",
    marginTop: 4
  },

  row: {
    flexDirection: "row",
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: "#F1F5F9",
  },

  rankBadge: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: '#F8FAFC',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
      borderWidth: 1,
      borderColor: '#F1F5F9'
  },
  rankText: {
     fontFamily: "Poppins_600SemiBold",
     color: "#64748B",
     fontSize: 14
  },

  region: {
    flex: 1,
    fontFamily: "Poppins_600SemiBold",
    color: "#334155",
    fontSize: 15
  },
  
  valueWrap: {
     flexDirection: 'row',
     alignItems: 'center'
  },

  value: {
    fontFamily: "Poppins_700Bold",
    fontSize: 16,
    color: "#0F172A"
  },

  tipCard: {
    backgroundColor: "#F59E0B", 
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#F59E0B",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },

  tipHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
  },

  tipTitle: {
    color: "white",
    fontFamily: "Poppins_700Bold",
    fontSize: 18,
    marginLeft: 10,
  },
  
  tipRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 10,
  },

  tipText: {
    color: "white",
    fontFamily: "Poppins_500Medium",
    fontSize: 14,
    marginLeft: 10,
    flex: 1,
    lineHeight: 22
  },
});
