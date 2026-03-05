import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
    Dimensions,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    View
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LineChart } from "react-native-chart-kit";
import { AnimatedCircularProgress } from "react-native-circular-progress";
import Animated, {
    FadeInDown,
    useAnimatedStyle,
    useSharedValue,
    withSpring
} from "react-native-reanimated";
import { useLanguage } from "../../context/LanguageContext";
import AnimatedBackground from "../../components/AnimatedBackground";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const useScaleAnimation = () => {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const onPressIn = () => {
    scale.value = withSpring(0.95);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };
  const onPressOut = () => {
    scale.value = withSpring(1);
  };
  return { style, onPressIn, onPressOut };
};

export default function Dashboard() {
  const { t } = useLanguage();
  const [price, setPrice] = useState(2200);
  const [region, setRegion] = useState("Colombo");
  const [chartDataState, setChartDataState] = useState([
      2120, 2160, 2180, 2200, 2210, 2230,
  ]);
  
  const [tickerPrices, setTickerPrices] = useState([
    { spiceKey: "cinnamon", price: 2100, change: 2.1, up: true },
    { spiceKey: "pepper", price: 1600, change: 1.5, up: false },
    { spiceKey: "cardamom", price: 3200, change: 3.4, up: true },
    { spiceKey: "clove", price: 2600, change: 0.8, up: true },
    { spiceKey: "nutmeg", price: 2400, change: 1.2, up: false },
  ]);

  const marketVolatility = 65; 
  const demandPressure = 45; 
  const priceMomentum = 78;

  const screenWidth = Dimensions.get("window").width - 32;

  useEffect(() => {
    const interval = setInterval(() => {
      setPrice((p) => {
        const change = Math.floor(Math.random() * 40 - 20);
        const newPrice = p + change;
        setChartDataState(prev => [...prev.slice(1), newPrice]);
        return newPrice;
      });
      
      setTickerPrices((prev) => 
        prev.map(t => {
            const up = Math.random() > 0.5;
            const changeAmt = Math.random() * 20;
            return {
                ...t,
                price: Math.round(t.price + (up ? changeAmt : -changeAmt)),
                change: Number((Math.random() * 3).toFixed(1)),
                up
            }
        })
      );
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const chartData = {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Now"],
    datasets: [
      {
        data: chartDataState,
      },
    ],
  };

  const staggerDelay = 100;

  const quickLinks = [
      { titleKey: "simulateHarvest", route: "/order", icon: "calculator", color: "#10B981" },
      { titleKey: "harvestScenario", route: "/simulator", icon: "bar-chart", color: "#F59E0B" },
      { titleKey: "optimizeTransport", route: "/transport-optimizer", icon: "bus", color: "#3B82F6" },
      { titleKey: "seasonalAnalytics", route: "/seasonal-price-analytics", icon: "analytics-outline", color: "#8B5CF6" },
      { titleKey: "tracking", route: "/transport-tracking", icon: "location", color: "#6366F1" },
      { titleKey: "analytics", route: "/transport-analytics", icon: "pie-chart", color: "#0EA5E9" },
      { titleKey: "demand", route: "/srilanka-demand-map", icon: "map", color: "#EF4444" },
      { titleKey: "farmer", route: "/farmer", icon: "person", color: "#0F172A" },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      <AnimatedBackground />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* HEADER */}
        <Animated.View entering={FadeInDown.delay(staggerDelay * 1).springify()} style={styles.headerContainer}>
          <View>
              <Text style={styles.headerTitle}>{t("agriSuite")} 🌱</Text>
              <Text style={styles.headerSub}>Agritech Intelligence Platform</Text>
          </View>
        </Animated.View>
        
        {/* LIVE TICKER */}
        <Animated.View entering={FadeInDown.delay(staggerDelay * 2).springify()}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{overflow: 'visible', marginBottom: 20, marginTop: -8}}>
            {tickerPrices.map((item) => (
                <View key={item.spiceKey} style={styles.tickerCard}>
                    <Text style={styles.tickerSpice}>{t(item.spiceKey as any)}</Text>
                    <Text style={styles.tickerPrice}>{t("currencySymbol")} {item.price}</Text>

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
                                marginLeft: 4
                            }}
                        >
                            {item.change}%
                        </Text>
                    </View>
                </View>
            ))}
            </ScrollView>
        </Animated.View>

        {/* GAUGES */}
        <Animated.View style={styles.gaugeRow} entering={FadeInDown.delay(staggerDelay * 3).springify()}>
          <View style={styles.gaugeItem}>
            <AnimatedCircularProgress
              size={76}
              width={8}
              fill={marketVolatility}
              tintColor="#F59E0B"
              backgroundColor="#E2E8F0"
              lineCap="round"
              rotation={270}
              duration={1500}
            >
              {() => <Text style={styles.gaugeCenterText}>{marketVolatility}</Text>}
            </AnimatedCircularProgress>
            <Text style={styles.gaugeLabel}>{t("marketVolatility" as any) || "Volatility"}</Text>
          </View>

          <View style={styles.gaugeItem}>
            <AnimatedCircularProgress
              size={76}
              width={8}
              fill={demandPressure}
              tintColor="#3B82F6"
              backgroundColor="#E2E8F0"
              lineCap="round"
              rotation={270}
              duration={1500}
            >
              {() => <Text style={styles.gaugeCenterText}>{demandPressure}</Text>}
            </AnimatedCircularProgress>
            <Text style={styles.gaugeLabel}>{t("demandPressure" as any) || "Pressure"}</Text>
          </View>

          <View style={styles.gaugeItem}>
            <AnimatedCircularProgress
              size={76}
              width={8}
              fill={priceMomentum}
              tintColor="#10B981"
              backgroundColor="#E2E8F0"
              lineCap="round"
              rotation={270}
              duration={1500}
            >
              {() => <Text style={styles.gaugeCenterText}>{priceMomentum}</Text>}
            </AnimatedCircularProgress>
            <Text style={styles.gaugeLabel}>{t("priceMomentum" as any) || "Momentum"}</Text>
          </View>
        </Animated.View>

        {/* MARKET CARD */}
        <Animated.View style={styles.cardShadow} entering={FadeInDown.delay(staggerDelay * 4).springify()}>
          <View style={styles.marketHeaderRow}>
             <View>
               <Text style={styles.marketTitle}>{t("marketOverview" as any) || "Market Overview"}</Text>
               <Text style={styles.marketSub}>{t("cinnamon")} {t("priceMomentum" as any) || "Trend"}</Text>
             </View>
             <View style={styles.liveIndicator}>
               <View style={styles.liveDot} />
               <Text style={styles.liveText}>LIVE</Text>
             </View>
          </View>

          {/* Region Tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.regionScroll}>
             {["Colombo", "Kandy", "Matale", "Kurunegala", "Dambulla"].map(r => (
                 <Pressable
                     key={r}
                     style={[styles.regionChip, region === r && styles.regionChipActive]}
                     onPress={() => {
                         Haptics.selectionAsync();
                         setRegion(r);
                         const base = 2000 + Math.random() * 500;
                         setPrice(base);
                         setChartDataState([
                             Math.floor(base - 80), Math.floor(base - 40), Math.floor(base - 60), Math.floor(base - 20), Math.floor(base - 10), Math.floor(base + 30)
                         ]);
                     }}
                 >
                     <Text style={[styles.regionChipText, region === r && styles.regionChipTextActive]}>{r}</Text>
                 </Pressable>
             ))}
          </ScrollView>

          <View style={{flexDirection: 'row', alignItems: 'baseline', marginTop: 12}}>
            <Text style={styles.price}>{t("currencySymbol" as any) || "Rs"} {Math.floor(price).toLocaleString()}</Text>
            <Text style={styles.perKg}> /{t("kg" as any) || "kg"}</Text>
            <Text style={[styles.regionChipText, {marginLeft: 8, color: '#64748B'}]}>in {region}</Text>
          </View>

          <View style={{marginTop: 10, alignSelf: 'center'}}>
              <LineChart
                data={chartData}
                width={screenWidth - 8}
                height={160}
                bezier
                withDots={true}
                withInnerLines={false}
                withOuterLines={false}
                withVerticalLabels={true}
                yAxisLabel=""
                yAxisInterval={1}
                chartConfig={{
                  backgroundColor: "#ffffff",
                  backgroundGradientFrom: "#ffffff",
                  backgroundGradientTo: "#ffffff",
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`, 
                  labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`, 
                  style: {
                    borderRadius: 16
                  },
                  propsForDots: {
                  r: "4",
                  strokeWidth: "2",
                  stroke: "#10B981"
                }
              }}
              style={{
                marginVertical: 8,
                borderRadius: 16,
                marginLeft: -16
              }}
            />
          </View>
        </Animated.View>

        {/* NAVIGATION LINKS */}
        <Animated.View entering={FadeInDown.delay(staggerDelay * 6).springify()} style={{marginTop: 8}}>
            <Text style={styles.sectionTitle}>Intelligence Modules</Text>
            
            <View style={styles.moduleGrid}>
                {quickLinks.map((link) => {
                    const { style, onPressIn, onPressOut } = useScaleAnimation();
                    return (
                        <AnimatedPressable
                            key={link.titleKey}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                router.push(link.route as any);
                            }}
                            onPressIn={onPressIn}
                            onPressOut={onPressOut}
                            style={[styles.moduleCard, style]}
                        >
                            <View style={[styles.moduleIconWrap, {backgroundColor: `${link.color}15`}]}>
                                <Ionicons name={link.icon as any} size={24} color={link.color} />
                            </View>
                            <Text style={styles.moduleText}>{t(link.titleKey as any)}</Text>
                        </AnimatedPressable>
                    )
                })}
            </View>
        </Animated.View>

        <View style={{height: 40}} />
      </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingTop: 24 },
  
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20
  },

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
  },
  
  langToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    shadowColor: "#64748b",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  langText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: "#334155",
  },
  
  tickerCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginRight: 12,
    width: 140,
    shadowColor: "#64748b",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  tickerSpice: { fontFamily: "Poppins_500Medium", fontSize: 13, color: "#64748B" },
  tickerPrice: { fontSize: 18, fontFamily: "Poppins_700Bold", marginVertical: 4, letterSpacing: -0.5, color: "#0F172A" },
  tickerChangeRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  gaugeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingHorizontal: 4,
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
     fontSize: 15,
     color: "#334155"
  },
  gaugeLabel: {
    fontSize: 12,
    marginTop: 8,
    fontFamily: "Poppins_500Medium",
    color: "#64748B",
  },

  cardShadow: {
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

  marketHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  marketTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 18,
    color: "#0F172A",
  },

  marketSub: {
    fontFamily: "Poppins_500Medium",
    color: "#64748B",
    fontSize: 14,
  },

  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
    marginRight: 4,
  },
  liveText: {
    fontSize: 10,
    fontFamily: "Poppins_700Bold",
    color: '#EF4444',
  },

  price: {
    fontSize: 32,
    fontFamily: "Poppins_700Bold",
    color: "#10B981",
    marginTop: 8,
    letterSpacing: -1,
  },
  perKg: {
      fontSize: 16,
      color: "#94A3B8",
      fontFamily: "Poppins_500Medium",
  },
  
  regionScroll: {
      marginTop: 16,
      marginBottom: 8,
      flexDirection: 'row',
  },
  regionChip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: '#F1F5F9',
      marginRight: 8,
  },
  regionChipActive: {
      backgroundColor: '#10B981',
  },
  regionChipText: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 13,
      color: '#64748B',
  },
  regionChipTextActive: {
      color: '#FFFFFF',
  },
  
  sectionTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 18,
    color: "#1E293B",
    marginBottom: 12,
  },
  
  moduleGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: 12
  },
  
  moduleCard: {
      width: '48%',
      backgroundColor: '#fff',
      padding: 16,
      borderRadius: 20,
      shadowColor: "#64748b",
      shadowOpacity: 0.08,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
      alignItems: 'flex-start',
  },
  
  moduleIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12
  },
  
  moduleText: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 14,
      color: "#0F172A",
      lineHeight: 20
  }
});
