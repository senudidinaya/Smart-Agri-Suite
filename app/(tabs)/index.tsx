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
  const [price, setPrice] = useState(2200);
  const [region, setRegion] = useState("Colombo");
  const [spice, setSpice] = useState("Cinnamon");
  const [chartDataState, setChartDataState] = useState([
      2120, 2160, 2180, 2200, 2210, 2230,
  ]);
  
  const [tickerPrices, setTickerPrices] = useState([
    { spice: "Cinnamon", price: 2100, change: 2.1, up: true },
    { spice: "Pepper", price: 1600, change: 1.5, up: false },
    { spice: "Cardamom", price: 3200, change: 3.4, up: true },
    { spice: "Clove", price: 2600, change: 0.8, up: true },
    { spice: "Nutmeg", price: 2400, change: 1.2, up: false },
  ]);

  const demand = 85; 
  const supply = 40; 
  const profit = 150000;

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
      { title: "Harvest Price Simulator", route: "/order", icon: "calculator", color: "#10B981" },
      { title: "Profit Scenario Simulator", route: "/simulator", icon: "bar-chart", color: "#F59E0B" },
      { title: "Transport Optimizer", route: "/transport-optimizer", icon: "bus", color: "#3B82F6" },
      { title: "Market Demand Prediction", route: "/demand-prediction", icon: "trending-up", color: "#8B5CF6" },
      { title: "Sri Lanka Demand Heatmap", route: "/demand-prediction", icon: "map", color: "#EF4444" },
      { title: "Farmer Dashboard", route: "/farmer", icon: "person", color: "#0F172A" },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* HEADER */}
        <Animated.View entering={FadeInDown.delay(staggerDelay * 1).springify()}>
          <Text style={styles.headerTitle}>Smart Agri-Suite 🌱</Text>
          <Text style={styles.headerSub}>Agritech Intelligence Platform</Text>
        </Animated.View>
        
        {/* LIVE TICKER */}
        <Animated.View entering={FadeInDown.delay(staggerDelay * 2).springify()}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{overflow: 'visible', marginBottom: 20, marginTop: -8}}>
            {tickerPrices.map((item) => (
                <View key={item.spice} style={styles.tickerCard}>
                    <Text style={styles.tickerSpice}>{item.spice}</Text>
                    <Text style={styles.tickerPrice}>LKR {item.price}</Text>

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
              fill={demand}
              tintColor="#10B981"
              backgroundColor="#E2E8F0"
              lineCap="round"
              rotation={270}
              duration={1500}
            >
              {() => <Text style={styles.gaugeCenterText}>{demand}%</Text>}
            </AnimatedCircularProgress>
            <Text style={styles.gaugeLabel}>Demand</Text>
          </View>

          <View style={styles.gaugeItem}>
            <AnimatedCircularProgress
              size={76}
              width={8}
              fill={supply}
              tintColor="#3B82F6"
              backgroundColor="#E2E8F0"
              lineCap="round"
              rotation={270}
              duration={1500}
            >
              {() => <Text style={styles.gaugeCenterText}>{supply}%</Text>}
            </AnimatedCircularProgress>
            <Text style={styles.gaugeLabel}>Supply</Text>
          </View>

          <View style={styles.gaugeItem}>
            <AnimatedCircularProgress
              size={76}
              width={8}
              fill={(profit % 100)} // Just visual rep
              tintColor="#F59E0B"
              backgroundColor="#E2E8F0"
              lineCap="round"
              rotation={270}
              duration={1500}
            >
              {() => <Text style={styles.gaugeCenterText}>{Math.floor(profit/1000)}k</Text>}
            </AnimatedCircularProgress>
            <Text style={styles.gaugeLabel}>Profit Index</Text>
          </View>
        </Animated.View>

        {/* MARKET CARD */}
        <Animated.View style={styles.cardShadow} entering={FadeInDown.delay(staggerDelay * 4).springify()}>
          <View style={styles.marketHeaderRow}>
             <View>
               <Text style={styles.marketTitle}>{region} Market</Text>
               <Text style={styles.marketSub}>{spice} Overview</Text>
             </View>
             <View style={styles.liveIndicator}>
               <View style={styles.liveDot} />
               <Text style={styles.liveText}>LIVE</Text>
             </View>
          </View>

          <Text style={styles.price}>LKR {Math.floor(price).toLocaleString()} <Text style={styles.perKg}>/kg</Text></Text>

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
                yAxisLabel="Rs."
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

        {/* HARVEST TIP */}
        <Animated.View style={styles.tipCard} entering={FadeInDown.delay(staggerDelay * 5).springify()}>
          <View style={styles.tipHeaderRow}>
             <Ionicons name="leaf" size={20} color="#fff" />
             <Text style={styles.tipTitle}>Harvest Tip</Text>
          </View>
          <Text style={styles.tipText}>
            Dry your spices in shade today to preserve aroma. Humidity levels
            are ideal for cinnamon and pepper drying. Avoid direct sunlight.
          </Text>
        </Animated.View>

        {/* NAVIGATION LINKS */}
        <Animated.View entering={FadeInDown.delay(staggerDelay * 6).springify()} style={{marginTop: 8}}>
            <Text style={styles.sectionTitle}>Intelligence Modules</Text>
            
            <View style={styles.moduleGrid}>
                {quickLinks.map((link) => {
                    const { style, onPressIn, onPressOut } = useScaleAnimation();
                    return (
                        <AnimatedPressable
                            key={link.title}
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
                            <Text style={styles.moduleText}>{link.title}</Text>
                        </AnimatedPressable>
                    )
                })}
            </View>
        </Animated.View>

        <View style={{height: 40}} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingTop: 24 },

  headerTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 26,
    color: "#0F172A",
    letterSpacing: -0.5,
  },

  headerSub: {
    marginBottom: 20,
    color: "#64748B",
    fontSize: 15,
    fontFamily: "Poppins_400Regular",
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

  tipCard: {
    backgroundColor: "#10B981",
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
    shadowColor: "#10B981",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  tipHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tipTitle: {
    color: "white",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    marginLeft: 6
  },
  tipText: {
    color: "rgba(255,255,255,0.9)",
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    lineHeight: 22,
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
