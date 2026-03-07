import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LineChart, PieChart } from "react-native-chart-kit";
import { AnimatedCircularProgress } from "react-native-circular-progress";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useLanguage } from "../../context/LanguageContext";
import { OrderStatus, useOrders } from "../../context/OrderContext";
import {
  forecastDemandByRegion,
  forecastPrice,
  forecastProfitTrend,
} from "../../lib/forecastEngine";
import { getBestMarketRecommendation } from "../../lib/marketRecommendationEngine";
const screenWidth = Dimensions.get("window").width - 32;
export default function FarmerDashboard() {
  const { t } = useLanguage();
  const { orders, totalRevenue, totalProfit, updateStatus } = useOrders();
  /* ---------------- LIVE PRICE TICKER ---------------- */ const [
    tickerPrices,
    setTickerPrices,
  ] = useState([
    { spice: "Cinnamon", price: 2200 },
    { spice: "Pepper", price: 1800 },
    { spice: "Cardamom", price: 3400 },
    { spice: "Clove", price: 2800 },
    { spice: "Nutmeg", price: 2500 },
  ]);
  useEffect(() => {
    const interval = setInterval(() => {
      setTickerPrices((prev) =>
        prev.map((item) => ({
          ...item,
          price: item.price + Math.floor(Math.random() * 60 - 30),
        })),
      );
    }, 2500);
    return () => clearInterval(interval);
  }, []);
  /* ---------------- ORDER STATS ---------------- */ const activeOrders =
    useMemo(() => orders.filter((o) => o.status !== "DELIVERED"), [orders]);
  const completedOrders = useMemo(
    () => orders.filter((o) => o.status === "DELIVERED"),
    [orders],
  );
  const pending = orders.filter((o) => o.status === "PENDING").length;
  /* ---------------- CHART DATA ---------------- */ const profitTrend =
    useMemo(() => {
      const labels = orders.map((_, i) => `O${i + 1}`);
      const profits = orders.map((o) => Math.round(o.profit));
      return { labels, datasets: [{ data: profits.length ? profits : [0] }] };
    }, [orders]);
  const demandData = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach((o) => {
      counts[o.spice] = (counts[o.spice] || 0) + 1;
    });
    const colors = ["#10B981", "#3B82F6", "#F59E0B", "#8B5CF6", "#EF4444"];
    return Object.keys(counts).map((spice, index) => ({
      name: spice,
      population: counts[spice],
      color: colors[index % colors.length],
      legendFontColor: "#475569",
      legendFontSize: 13,
    }));
  }, [orders]);
  /* ---------------- FORECASTING ---------------- */ const selectedSpice =
    "Cinnamon";
  const priceForecast = useMemo(
    () => forecastPrice(selectedSpice),
    [selectedSpice],
  );
  const demandForecast = useMemo(
    () => forecastDemandByRegion(selectedSpice),
    [selectedSpice],
  );
  const profitForecast = useMemo(
    () => forecastProfitTrend(orders as any),
    [orders],
  );
  const marketRecommendation = useMemo(
    () => getBestMarketRecommendation("Cinnamon", 50, 20000),
    [orders],
  );
  /* ---------------- ACTION HANDLERS ---------------- */ const [
    updatingId,
    setUpdatingId,
  ] = useState<string | null>(null);
  const handleUpdateStatus = async (
    orderId: string,
    currentStatus: OrderStatus,
  ) => {
    let nextStatus: OrderStatus | null = null;
    if (currentStatus === "PENDING") nextStatus = "CONFIRMED";
    else if (currentStatus === "CONFIRMED") nextStatus = "DISPATCHED";
    else if (currentStatus === "DISPATCHED") nextStatus = "DELIVERED";
    if (!nextStatus) return;
    Alert.alert("Update Order Tracking", `Move order to ${nextStatus}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Update",
        onPress: async () => {
          setUpdatingId(orderId);
          await updateStatus(orderId, nextStatus as OrderStatus);
          setUpdatingId(null);
        },
      },
    ]);
  };
  /* ---------------- HEATMAP DATA ---------------- */ const heatmapData = [
    { region: "Colombo", demand: 90 },
    { region: "Kandy", demand: 70 },
    { region: "Matale", demand: 65 },
    { region: "Dambulla", demand: 55 },
    { region: "Kurunegala", demand: 45 },
    { region: "Galle", demand: 35 },
  ];
  const heatColor = (value: number) => {
    if (value > 80) return "#EF4444";
    /*  */ if (value > 60) return "#F59E0B";
    /*  */ if (value > 40) return "#10B981";
    /*  */ return "#94A3B8"; /*  */
  };
  const staggerDelay = 100;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        
        <Animated.View
          entering={FadeInDown.delay(staggerDelay * 1).springify()}
        >
          
          <Text style={styles.headerTitle}>
            {t("farmer" as any) || "Farmer Analytics"}
          </Text>
          <Text style={styles.headerSub}>
            {t("marketOverview" as any) || "Business Overview"}
          </Text>
        </Animated.View>
        {/* LIVE PRICE TICKER */}
        <Animated.View
          entering={FadeInDown.delay(staggerDelay * 2).springify()}
        >
          
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ overflow: "visible", marginBottom: 20 }}
          >
            
            {tickerPrices.map((item) => {
              const up = Math.random() > 0.5;
              return (
                <View key={item.spice} style={styles.tickerCard}>
                  
                  <Text style={styles.tickerSpice}>
                    {t(item.spice.toLowerCase() as any)}
                  </Text>
                  <Text style={styles.tickerPrice}>
                    {t("currencySymbol" as any)} {item.price}
                  </Text>
                  <View style={styles.tickerChange}>
                    
                    <Ionicons
                      name={up ? "trending-up" : "trending-down"}
                      size={16}
                      color={up ? "#10B981" : "#EF4444"}
                    />
                    <Text
                      style={{
                        color: up ? "#10B981" : "#EF4444",
                        fontFamily: "Poppins_600SemiBold",
                        fontSize: 12,
                      }}
                    >
                      
                      {Math.floor(Math.random() * 5) + 1}%
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </Animated.View>
        {/* PERFORMANCE GAUGES */}
        <Animated.View
          style={styles.gaugeRow}
          entering={FadeInDown.delay(staggerDelay * 3).springify()}
        >
          
          <View style={styles.gaugeItem}>
            
            <AnimatedCircularProgress
              size={76}
              width={8}
              fill={totalRevenue % 100}
              tintColor="#10B981"
              backgroundColor="#E2E8F0"
              lineCap="round"
              rotation={270}
              duration={1500}
            >
              
              {() => (
                <Text style={styles.gaugeCenterText}>
                  {Math.round(totalRevenue / 1000)}K
                </Text>
              )}
            </AnimatedCircularProgress>
            <Text style={styles.gaugeLabel}>{String(t("revenue"))}</Text>
          </View>
          <View style={styles.gaugeItem}>
            
            <AnimatedCircularProgress
              size={76}
              width={8}
              fill={totalProfit % 100}
              tintColor="#F59E0B"
              backgroundColor="#E2E8F0"
              lineCap="round"
              rotation={270}
              duration={1500}
            >
              
              {() => (
                <Text style={styles.gaugeCenterText}>
                  {Math.round(totalProfit / 1000)}K
                </Text>
              )}
            </AnimatedCircularProgress>
            <Text style={styles.gaugeLabel}>
              {t("profit" as any) || "Profit"}
            </Text>
          </View>
          <View style={styles.gaugeItem}>
            
            <AnimatedCircularProgress
              size={76}
              width={8}
              fill={(orders.length * 20) % 100}
              tintColor="#3B82F6"
              backgroundColor="#E2E8F0"
              lineCap="round"
              rotation={270}
              duration={1500}
            >
              
              {() => (
                <Text style={styles.gaugeCenterText}>{orders.length}</Text>
              )}
            </AnimatedCircularProgress>
            <Text style={styles.gaugeLabel}>
              {t("orders" as any) || "Orders"}
            </Text>
          </View>
        </Animated.View>
        {/* ACTIVE ORDERS LIST */}
        <Animated.View
          entering={FadeInDown.delay(staggerDelay * 4).springify()}
          style={{ marginTop: 8 }}
        >
          
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            
            <Text style={styles.sectionTitleWithoutMargin}>
              {String(t("activeOrdersList"))}
            </Text>
            <View style={styles.badge}>
              
              <Text style={styles.badgeText}>{activeOrders.length}</Text>
            </View>
          </View>
          {activeOrders.length === 0 ? (
            <Text
              style={{
                fontFamily: "Poppins_400Regular",
                color: "#64748B",
                marginBottom: 20,
              }}
            >
              {String(t("noActivePipeline"))}
            </Text>
          ) : (
            activeOrders.map((order, i) => {
              const id = String(order._id || order.id);
              return (
                <Animated.View
                  key={id}
                  entering={FadeInDown.delay(
                    staggerDelay * (4 + i),
                  ).springify()}
                  style={styles.orderCard}
                >
                  
                  <View style={styles.orderHeader}>
                    
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      
                      <View style={styles.orderIconWrap}>
                        
                        <Ionicons name="cube" size={16} color="#3B82F6" />
                      </View>
                      <Text style={styles.orderTitle}>
                        {order.spice} ({order.quantity}kg)
                      </Text>
                    </View>
                    {updatingId === id ? (
                      <ActivityIndicator size="small" color="#64748B" />
                    ) : (
                      <Pressable
                        onPress={() => handleUpdateStatus(id, order.status)}
                        style={({ pressed }) => [
                          { opacity: pressed ? 0.7 : 1 },
                        ]}
                      >
                        
                        <View
                          style={[
                            styles.statusPill,
                            order.status === "PENDING"
                              ? { backgroundColor: "#FEF3C7" }
                              : order.status === "CONFIRMED"
                                ? { backgroundColor: "#E0E7FF" }
                                : { backgroundColor: "#F3E8FF" },
                          ]}
                        >
                          
                          <Text
                            style={[
                              styles.statusPillText,
                              order.status === "PENDING"
                                ? { color: "#D97706" }
                                : order.status === "CONFIRMED"
                                  ? { color: "#4338CA" }
                                  : { color: "#7E22CE" },
                            ]}
                          >
                            
                            {order.status === "PENDING"
                              ? String(t("pendingStatus"))
                              : order.status === "CONFIRMED"
                                ? String(t("confirmedStatus"))
                                : order.status === "DISPATCHED"
                                  ? String(t("dispatchedStatus"))
                                  : String(t("deliveredStatus"))}
                          </Text>
                        </View>
                      </Pressable>
                    )}
                  </View>
                  <View style={styles.orderDivider} />
                  <View style={styles.orderMeta}>
                    
                    <View>
                      
                      <Text style={styles.metaLabel}>
                        {String(t("targetMarket"))}
                      </Text>
                      <Text style={styles.metaValue}>
                        {order.customer}
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      
                      <Text style={styles.metaLabel}>
                        {String(t("netOutput"))}
                      </Text>
                      <Text
                        style={[
                          styles.metaValue,
                          { color: "#10B981", fontFamily: "Poppins_700Bold" },
                        ]}
                      >
                        
                        LKR {Math.round(order.profit).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                </Animated.View>
              );
            })
          )}
        </Animated.View>
        {/* PROFIT TREND */}
        <Animated.View
          style={styles.card}
          entering={FadeInDown.delay(staggerDelay * 4).springify()}
        >
          
          <Text style={styles.sectionTitle}>
            {String(t("profitTrend"))}
          </Text>
          <Text style={styles.sectionSub}>{String(t("profitTrendSub"))}</Text>
          <View style={{ marginLeft: -16 }}>
            
            <LineChart
              data={profitTrend}
              width={screenWidth - 8}
              height={180}
              withDots={true}
              withInnerLines={false}
              withOuterLines={false}
              bezier
              chartConfig={{
                backgroundColor: "#ffffff",
                backgroundGradientFrom: "#ffffff",
                backgroundGradientTo: "#ffffff",
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
                propsForDots: { r: "4", strokeWidth: "2", stroke: "#10B981" },
              }}
            />
          </View>
        </Animated.View>
        {/* DEMAND PIE */}
        <Animated.View
          style={styles.card}
          entering={FadeInDown.delay(staggerDelay * 5).springify()}
        >
          
          <Text style={styles.sectionTitle}>
            {t("demand" as any) || "Spice Demand Distribution"}
          </Text>
          <Text style={styles.sectionSub}>{String(t("demandPieSub"))}</Text>
          {demandData.length === 0 ? (
            <Text
              style={{
                fontFamily: "Poppins_400Regular",
                color: "#64748B",
                marginTop: 12,
              }}
            >
              {String(t("noOrdersYet"))}
            </Text>
          ) : (
            <PieChart
              data={demandData}
              width={screenWidth - 20}
              height={180}
              accessor={"population"}
              backgroundColor={"transparent"}
              paddingLeft={"10"}
              absolute
              chartConfig={{ color: () => "#000" }}
            />
          )}
        </Animated.View>
        {/* MARKET HEATMAP */}
        <Animated.View
          style={styles.card}
          entering={FadeInDown.delay(staggerDelay * 6).springify()}
        >
          
          <Text style={styles.sectionTitle}>
            {String(t("marketHeatmap"))}
          </Text>
          <Text style={styles.sectionSub}>{String(t("marketHeatmapSub"))}</Text>
          <View style={styles.heatmapGrid}>
            
            {heatmapData.map((item) => (
              <View
                key={item.region}
                style={[
                  styles.heatCell,
                  { backgroundColor: heatColor(item.demand) },
                ]}
              >
                
                <Text style={styles.heatRegion}>{item.region}</Text>
                <Text style={styles.heatValue}>{item.demand}%</Text>
              </View>
            ))}
          </View>
        </Animated.View>
        {/* FORECAST */}
        <Animated.View
          style={styles.card}
          entering={FadeInDown.delay(staggerDelay * 7).springify()}
        >
          
          <View style={styles.titleRow}>
            
            <Ionicons
              name="analytics"
              size={20}
              color="#1E293B"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.sectionTitleWithoutMargin}>
              {t("forecast" as any) || "Forecast Insights"}
            </Text>
          </View>
          <View style={styles.insightBox}>
            
            <Ionicons name="trending-up" size={16} color="#10B981" />
            <Text style={styles.insightText}>
              
              {String(t("cinnamonPriceJump"))}
              <Text style={{ fontFamily: "Poppins_700Bold", color: "#10B981" }}>
                {priceForecast.growthRate.toFixed(1)}%
              </Text>
            </Text>
          </View>
          <View style={styles.insightBox}>
            
            <Ionicons name="cash" size={16} color="#3B82F6" />
            <Text style={styles.insightText}>
              
              {String(t("targetPriceLkr"))}
              <Text style={{ fontFamily: "Poppins_700Bold", color: "#0F172A" }}>
                {priceForecast.predictedPrice.toFixed(0)}
              </Text>
            </Text>
          </View>
          <View style={styles.insightBox}>
            
            <Ionicons name="stats-chart" size={16} color="#8B5CF6" />
            <Text style={styles.insightText}>
              
              {String(t("profitProjectionShift"))}
              <Text style={{ fontFamily: "Poppins_700Bold", color: "#8B5CF6" }}>
                {profitForecast.growthRate.toFixed(1)}%
              </Text>
            </Text>
          </View>
          {demandForecast.slice(0, 2).map((d, i) => (
            <View
              key={d.district}
              style={[
                styles.insightBox,
                i === 1 && { borderBottomWidth: 0, paddingBottom: 0 },
              ]}
            >
              
              <Ionicons name="location" size={16} color="#F59E0B" />
              <Text style={styles.insightText}>
                
                {String(t("risingDemandMappedIn"))}
                <Text style={{ fontFamily: "Poppins_600SemiBold" }}>
                  {d.district}
                </Text>
              </Text>
            </View>
          ))}
        </Animated.View>
        {/* MARKET RECOMMENDATION */}
        <Animated.View
          style={styles.tipCard}
          entering={FadeInDown.delay(staggerDelay * 8).springify()}
        >
          
          <View style={styles.tipHeaderRow}>
            
            <Ionicons name="bulb" size={20} color="#fff" />
            <Text style={styles.tipTitle}>
              {String(t("smartMarketMove"))}
            </Text>
          </View>
          {marketRecommendation && (
            <View style={{ marginTop: 8 }}>
              
              <Text style={styles.tipLabel}>
                {String(t("optimalTargetMarket"))}
              </Text>
              <Text style={styles.tipValue}>
                
                {marketRecommendation.district} {String(t("via"))}
                {marketRecommendation.transportMode}
              </Text>
              <View style={styles.divider} />
              <Text style={styles.tipLabel}>{String(t("projectedYield"))}</Text>
              <Text style={styles.tipValueLarge}>
                
                LKR
                {Math.round(
                  marketRecommendation.projectedProfit,
                ).toLocaleString()}
              </Text>
            </View>
          )}
        </Animated.View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
/* ---------------- STYLES ---------------- */ const styles = StyleSheet.create(
  {
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
    tickerSpice: {
      fontFamily: "Poppins_500Medium",
      fontSize: 13,
      color: "#64748B",
    },
    tickerPrice: {
      fontSize: 18,
      fontFamily: "Poppins_700Bold",
      marginVertical: 4,
      letterSpacing: -0.5,
      color: "#0F172A",
    },
    tickerChange: { flexDirection: "row", alignItems: "center", gap: 4 },
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
      color: "#334155",
    },
    gaugeLabel: {
      fontSize: 13,
      marginTop: 8,
      fontFamily: "Poppins_500Medium",
      color: "#64748B",
    },
    badge: {
      backgroundColor: "#1E293B",
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    badgeText: { color: "white", fontFamily: "Poppins_700Bold", fontSize: 12 },
    orderCard: {
      backgroundColor: "#fff",
      padding: 16,
      borderRadius: 20,
      marginBottom: 12,
      shadowColor: "#64748b",
      shadowOpacity: 0.06,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
    },
    orderHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    orderIconWrap: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: "#EFF6FF",
      justifyContent: "center",
      alignItems: "center",
      marginRight: 10,
    },
    orderTitle: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 15,
      color: "#0F172A",
    },
    statusPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
    statusPillText: {
      fontFamily: "Poppins_700Bold",
      fontSize: 11,
      letterSpacing: 0.5,
    },
    orderDivider: { height: 1, backgroundColor: "#F1F5F9", marginVertical: 12 },
    orderMeta: { flexDirection: "row", justifyContent: "space-between" },
    metaLabel: {
      fontFamily: "Poppins_400Regular",
      fontSize: 11,
      color: "#64748B",
      marginBottom: 2,
    },
    metaValue: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 14,
      color: "#334155",
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
    titleRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
    sectionTitleWithoutMargin: {
      fontSize: 18,
      fontFamily: "Poppins_600SemiBold",
      color: "#0F172A",
    },
    sectionTitle: {
      fontSize: 18,
      fontFamily: "Poppins_600SemiBold",
      color: "#0F172A",
      marginBottom: 4,
    },
    sectionSub: {
      fontFamily: "Poppins_400Regular",
      fontSize: 13,
      color: "#64748B",
      marginBottom: 16,
    },
    insightBox: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderColor: "#F1F5F9",
    },
    insightText: {
      marginLeft: 10,
      fontFamily: "Poppins_400Regular",
      fontSize: 14,
      color: "#334155",
      flex: 1,
    },
    tipCard: {
      backgroundColor: "#2E7D32",
      /*  */ borderRadius: 20,
      padding: 20,
      marginBottom: 16,
      shadowColor: "#2E7D32",
      shadowOpacity: 0.25,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
    },
    tipHeaderRow: { flexDirection: "row", alignItems: "center" },
    tipTitle: {
      color: "white",
      fontFamily: "Poppins_600SemiBold",
      fontSize: 16,
      marginLeft: 8,
    },
    tipLabel: {
      color: "rgba(255,255,255,0.8)",
      fontFamily: "Poppins_400Regular",
      fontSize: 13,
      marginTop: 12,
    },
    tipValue: {
      color: "white",
      fontFamily: "Poppins_600SemiBold",
      fontSize: 15,
      marginTop: 2,
    },
    tipValueLarge: {
      color: "white",
      fontFamily: "Poppins_700Bold",
      fontSize: 24,
      marginTop: 4,
    },
    divider: {
      height: 1,
      backgroundColor: "rgba(255,255,255,0.2)",
      marginVertical: 12,
    },
    heatmapGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    heatCell: {
      width: "30%",
      paddingVertical: 16,
      borderRadius: 16,
      alignItems: "center",
    },
    heatRegion: {
      color: "white",
      fontFamily: "Poppins_600SemiBold",
      fontSize: 13,
    },
    heatValue: {
      color: "white",
      fontSize: 18,
      fontFamily: "Poppins_700Bold",
      marginTop: 4,
    },
  },
);
