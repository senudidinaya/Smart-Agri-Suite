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
import { BarChart, LineChart, PieChart } from "react-native-chart-kit";
import { AnimatedCircularProgress } from "react-native-circular-progress";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useLanguage } from "../../context/LanguageContext";
import { useOrders } from "../../context/OrderContext";
import type { OrderStatus } from "../../context/OrderContext";
import {
  forecastDemandByRegion,
  forecastPrice,
  forecastProfitTrend,
} from "../../lib/forecastEngine";
import { getBestMarketRecommendation } from "../../lib/marketRecommendationEngine";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

const screenWidth = Dimensions.get("window").width - 32;

const REGIONS = ["Colombo", "Kandy", "Matale", "Kurunegala", "Dambulla"];

interface TickerItem {
  spice: string;
  price: number;
  change: number;
  up: boolean;
  region: string;
}

export default function FarmerDashboard() {
  const { t } = useLanguage();
  const router = useRouter();
  const { orders, totalRevenue, totalProfit, updateStatus } = useOrders();

  /* ──────────── LIVE PRICE TICKER (with locations) ──────────── */
  const [tickerPrices, setTickerPrices] = useState<TickerItem[]>([
    { spice: "Cinnamon", price: 2200, change: 2.3, up: true, region: "Matale" },
    { spice: "Pepper", price: 1800, change: 1.1, up: false, region: "Kandy" },
    { spice: "Cardamom", price: 3400, change: 3.7, up: true, region: "Colombo" },
    { spice: "Clove", price: 2800, change: 0.9, up: true, region: "Dambulla" },
    { spice: "Nutmeg", price: 2500, change: 1.5, up: false, region: "Kurunegala" },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTickerPrices((prev) =>
        prev.map((item) => {
          const up = Math.random() > 0.45;
          const changeAmt = Math.random() * 25;
          return {
            ...item,
            price: Math.round(item.price + (up ? changeAmt : -changeAmt)),
            change: Number((Math.random() * 4).toFixed(1)),
            up,
            region: REGIONS[Math.floor(Math.random() * REGIONS.length)],
          };
        })
      );
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  /* ──────────── ORDER STATS ──────────── */
  const activeOrders = useMemo(
    () => orders.filter((o) => o.status !== "DELIVERED"),
    [orders]
  );
  const completedOrders = useMemo(
    () => orders.filter((o) => o.status === "DELIVERED"),
    [orders]
  );

  /* ──────────── GAUGE COMPUTATIONS ──────────── */
  // Revenue gauge: show actual LKR total, fill = proportion of all orders (max theoretical ~500K for 5 orders)
  const revenueFill = useMemo(() => {
    if (orders.length === 0) return 0;
    // Average revenue per order (expected ~80K), fill based on how healthy it is
    const avgRevenue = totalRevenue / orders.length;
    return Math.min(100, (avgRevenue / 120000) * 100); // 120K per order = 100%
  }, [totalRevenue, orders.length]);

  // Profit margin gauge: profit / revenue as percentage
  const profitMarginPct = useMemo(() => {
    if (totalRevenue === 0) return 0;
    return Math.round((totalProfit / totalRevenue) * 100);
  }, [totalProfit, totalRevenue]);

  // Active pipeline value = sum of revenue from non-delivered orders
  const pipelineRevenue = useMemo(
    () => activeOrders.reduce((sum, o) => sum + o.revenue, 0),
    [activeOrders]
  );
  const pipelineProfit = useMemo(
    () => activeOrders.reduce((sum, o) => sum + o.profit, 0),
    [activeOrders]
  );

  /* ──────────── PROFIT TREND (cumulative) ──────────── */
  /* ──────────── PROFIT BY SPICE (Bar Chart Representation) ──────────── */
  const profitBySpice = useMemo(() => {
    const spiceProfits: Record<string, number> = {};
    orders.forEach((o) => {
      spiceProfits[o.spice] = (spiceProfits[o.spice] || 0) + o.profit;
    });

    if (Object.keys(spiceProfits).length === 0) {
      return { labels: ["—"], datasets: [{ data: [0] }] };
    }

    const labels = Object.keys(spiceProfits);
    const data = labels.map((l) => Math.round(spiceProfits[l]));

    return { labels, datasets: [{ data }] };
  }, [orders]);

  /* ──────────── DEMAND PIE (Percentage Based) ──────────── */
  const demandData = useMemo(() => {
    const counts: Record<string, number> = {};
    let totalQty = 0;
    orders.forEach((o) => {
      counts[o.spice] = (counts[o.spice] || 0) + o.quantity;
      totalQty += o.quantity;
    });

    const colors = ["#10B981", "#3B82F6", "#F59E0B", "#8B5CF6", "#EF4444"];
    return Object.keys(counts).map((spice, index) => {
      const percentage = totalQty > 0 ? (counts[spice] / totalQty) * 100 : 0;
      return {
        name: spice,
        population: Number(percentage.toFixed(1)), // Use percentage instead of raw qty
        color: colors[index % colors.length],
        legendFontColor: "#475569",
        legendFontSize: 13,
      };
    });
  }, [orders]);

  /* ──────────── FORECASTING ──────────── */
  const selectedSpice = "Cinnamon";
  const priceForecast = useMemo(
    () => forecastPrice(selectedSpice),
    [selectedSpice]
  );
  const demandForecast = useMemo(
    () => forecastDemandByRegion(selectedSpice),
    [selectedSpice]
  );
  const profitForecast = useMemo(
    () => forecastProfitTrend(orders as any),
    [orders]
  );
  const marketRecommendation = useMemo(
    () => getBestMarketRecommendation("Cinnamon", 50, 20000),
    [orders]
  );

  /* ──────────── ACTION HANDLERS ──────────── */
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const handleUpdateStatus = async (
    orderId: string,
    currentStatus: OrderStatus
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

  /* ──────────── HEATMAP DATA ──────────── */
  const heatmapData = [
    { region: "Colombo", demand: 90 },
    { region: "Kandy", demand: 70 },
    { region: "Matale", demand: 65 },
    { region: "Dambulla", demand: 55 },
    { region: "Kurunegala", demand: 45 },
    { region: "Galle", demand: 35 },
  ];
  const heatColor = (value: number) => {
    if (value > 80) return "#EF4444";
    if (value > 60) return "#F59E0B";
    if (value > 40) return "#10B981";
    return "#94A3B8";
  };

  const formatLKR = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${Math.round(n / 1000)}K`;
    return String(Math.round(n));
  };

  const staggerDelay = 100;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <Animated.View entering={FadeInDown.delay(staggerDelay).springify()}>
          <Text style={styles.headerTitle}>
            {t("farmer" as any) || "Farmer Analytics"}
          </Text>
          <Text style={styles.headerSub}>
            {t("marketOverview" as any) || "Business Overview"}
          </Text>
        </Animated.View>

        {/* ━━━━━━━━━ LIVE PRICE TICKER (with location) ━━━━━━━━━ */}
        <Animated.View entering={FadeInDown.delay(staggerDelay * 2).springify()}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ overflow: "visible", marginBottom: 20 }}
          >
            {tickerPrices.map((item) => (
              <View key={item.spice} style={styles.tickerCard}>
                <Text style={styles.tickerSpice}>
                  {t(item.spice.toLowerCase() as any)}
                </Text>
                <Text style={styles.tickerRegion}>
                  📍 {t(item.region.toLowerCase() as any) || item.region}
                </Text>
                <Text style={styles.tickerPrice}>
                  {t("currencySymbol" as any)} {item.price}
                </Text>
                <View style={styles.tickerChange}>
                  <Ionicons
                    name={item.up ? "trending-up" : "trending-down"}
                    size={16}
                    color={item.up ? "#10B981" : "#EF4444"}
                  />
                  <Text
                    style={{
                      color: item.up ? "#10B981" : "#EF4444",
                      fontFamily: "Poppins_600SemiBold",
                      fontSize: 12,
                      marginLeft: 4,
                    }}
                  >
                    {item.change}%
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </Animated.View>

        {/* ━━━━━━━━━ PERFORMANCE SUMMARY CARD ━━━━━━━━━ */}
        <Animated.View
          style={styles.summaryCard}
          entering={FadeInDown.delay(staggerDelay * 3).springify()}
        >
          <Text style={styles.summaryCardTitle}>
            {t("kpiSummary" as any) || "Performance Summary"}
          </Text>
          <View style={styles.kpiRow}>
            {/* Revenue */}
            <View style={styles.kpiItem}>
              <AnimatedCircularProgress
                size={70}
                width={7}
                fill={revenueFill}
                tintColor="#10B981"
                backgroundColor="#E2E8F0"
                lineCap="round"
                rotation={270}
                duration={1500}
              >
                {() => (
                  <Ionicons name="wallet-outline" size={20} color="#10B981" />
                )}
              </AnimatedCircularProgress>
              <Text style={styles.kpiValue}>{t("currencySymbol")} {formatLKR(totalRevenue)}</Text>
              <Text style={styles.kpiLabel}>{String(t("revenue"))}</Text>
            </View>
            {/* Profit Margin */}
            <View style={styles.kpiItem}>
              <AnimatedCircularProgress
                size={70}
                width={7}
                fill={Math.max(0, profitMarginPct)}
                tintColor={totalProfit >= 0 ? "#F59E0B" : "#EF4444"}
                backgroundColor="#E2E8F0"
                lineCap="round"
                rotation={270}
                duration={1500}
              >
                {() => (
                  <Text style={styles.kpiCenterPct}>{profitMarginPct}%</Text>
                )}
              </AnimatedCircularProgress>
              <Text style={styles.kpiValue}>{t("currencySymbol")} {formatLKR(totalProfit)}</Text>
              <Text style={styles.kpiLabel}>{t("profit" as any) || "Profit"}</Text>
            </View>
            {/* Orders */}
            <View style={styles.kpiItem}>
              <AnimatedCircularProgress
                size={70}
                width={7}
                fill={
                  orders.length > 0
                    ? (completedOrders.length / orders.length) * 100
                    : 0
                }
                tintColor="#3B82F6"
                backgroundColor="#E2E8F0"
                lineCap="round"
                rotation={270}
                duration={1500}
              >
                {() => (
                  <Text style={styles.kpiCenterPct}>
                    {completedOrders.length}/{orders.length}
                  </Text>
                )}
              </AnimatedCircularProgress>
              <Text style={styles.kpiValue}>{activeOrders.length} active</Text>
              <Text style={styles.kpiLabel}>{t("orders" as any) || "Orders"}</Text>
            </View>
          </View>

          {/* Pipeline value row */}
          <View style={styles.pipelineRow}>
            <View style={styles.pipelineStat}>
              <Text style={styles.pipelineLabel}>{t("activePipelineValue" as any) || "Pipeline Value"}</Text>
              <Text style={styles.pipelineValue}>{t("currencySymbol")} {formatLKR(pipelineRevenue)}</Text>
            </View>
            <View style={styles.pipelineDivider} />
            <View style={styles.pipelineStat}>
              <Text style={styles.pipelineLabel}>{t("expectedProfit" as any) || "Expected Profit"}</Text>
              <Text style={[styles.pipelineValue, { color: "#10B981" }]}>{t("currencySymbol")} {formatLKR(pipelineProfit)}</Text>
            </View>
          </View>
        </Animated.View>

        {/* ━━━━━━━━━ ACTIVE ORDERS LIST ━━━━━━━━━ */}
        <Animated.View
          entering={FadeInDown.delay(staggerDelay * 4).springify()}
          style={{ marginTop: 8 }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <Text style={styles.sectionTitleWithoutMargin}>
              {String(t("activeOrdersList"))}
            </Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{activeOrders.length}</Text>
            </View>
          </View>
          {activeOrders.length === 0 ? (
            <Text style={{ fontFamily: "Poppins_400Regular", color: "#64748B", marginBottom: 20 }}>
              {String(t("noActivePipeline"))}
            </Text>
          ) : (
            activeOrders.map((order, i) => {
              const id = String(order._id || order.id);
              return (
                <Animated.View
                  key={id}
                  entering={FadeInDown.delay(staggerDelay * (4 + i)).springify()}
                  style={styles.orderCard}
                >
                  <View style={styles.orderHeader}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <View style={styles.orderIconWrap}>
                        <Ionicons name="cube" size={16} color="#3B82F6" />
                      </View>
                      <View>
                        <Text style={styles.orderTitle}>
                          {order.spice} · {order.quantity} kg
                        </Text>
                        <Text style={styles.orderSubtitle}>
                          → {order.customer}
                        </Text>
                      </View>
                    </View>
                    {updatingId === id ? (
                      <ActivityIndicator size="small" color="#64748B" />
                    ) : (
                      <Pressable
                        onPress={() => handleUpdateStatus(id, order.status)}
                        style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
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
                  <View style={styles.orderMetaGrid}>
                    <View style={styles.metaCell}>
                      <Text style={styles.metaLabel}>{t("revenue" as any) || "Revenue"}</Text>
                      <Text style={styles.metaValue}>{t("currencySymbol")} {formatLKR(order.revenue)}</Text>
                    </View>
                    <View style={styles.metaCell}>
                      <Text style={styles.metaLabel}>{t("totalCost" as any) || "Cost"}</Text>
                      <Text style={styles.metaValue}>{t("currencySymbol")} {formatLKR(order.totalCost)}</Text>
                    </View>
                    <View style={styles.metaCell}>
                      <Text style={styles.metaLabel}>{t("transport" as any) || "Transport"}</Text>
                      <Text style={styles.metaValue}>{t("currencySymbol")} {formatLKR(order.transportCost)}</Text>
                    </View>
                    <View style={[styles.metaCell, { borderRightWidth: 0 }]}>
                      <Text style={styles.metaLabel}>{String(t("netOutput"))}</Text>
                      <Text
                        style={[styles.metaValue, {
                          color: order.profit >= 0 ? "#10B981" : "#EF4444",
                          fontFamily: "Poppins_700Bold"
                        }]}
                      >
                        {t("currencySymbol")} {formatLKR(order.profit)}
                      </Text>
                    </View>
                  </View>
                </Animated.View>
              );
            })
          )}
        </Animated.View>

        {/* ━━━━━━━━━ PROFIT BY SPICE ━━━━━━━━━ */}
        <Animated.View
          style={styles.card}
          entering={FadeInDown.delay(staggerDelay * 5).springify()}
        >
          <Text style={styles.sectionTitle}>{t("profitBySpice") || "Profit by Spice"}</Text>
          <Text style={styles.sectionSub}>
            {t("profitBySpiceSub") || "Total accumulated profit breakdown per spice type"}
          </Text>
          <View style={{ marginLeft: -16 }}>
            <BarChart
              data={profitBySpice}
              width={screenWidth - 8}
              height={220}
              yAxisLabel={String(t("currencySymbol"))}
              yAxisSuffix=""
              fromZero
              showValuesOnTopOfBars
              chartConfig={{
                backgroundColor: "#fff",
                backgroundGradientFrom: "#fff",
                backgroundGradientTo: "#fff",
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
                style: { borderRadius: 16 },
                propsForLabels: {
                  fontFamily: "Poppins_500Medium",
                  fontSize: 10,
                },
                barPercentage: 0.6,
              }}
              style={{ marginVertical: 8, borderRadius: 16 }}
            />
          </View>
        </Animated.View>

        {/* ━━━━━━━━━ DEMAND PIE ━━━━━━━━━ */}
        <Animated.View
          style={styles.card}
          entering={FadeInDown.delay(staggerDelay * 6).springify()}
        >
          <Text style={styles.sectionTitle}>
            {t("demand" as any) || "Spice Demand Distribution"}
          </Text>
          <Text style={styles.sectionSub}>{String(t("demandPieSub"))}</Text>
          {demandData.length === 0 ? (
            <Text style={{ fontFamily: "Poppins_400Regular", color: "#64748B", marginTop: 12 }}>
              {String(t("noOrdersYet"))}
            </Text>
          ) : (
            <PieChart
              data={demandData}
              width={screenWidth - 20}
              height={200}
              chartConfig={{
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              }}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute={false} // Show percentage proportions
            />
          )}
        </Animated.View>

        {/* ━━━━━━━━━ MARKET HEATMAP ━━━━━━━━━ */}
        <Animated.View
          style={styles.card}
          entering={FadeInDown.delay(staggerDelay * 7).springify()}
        >
          <Text style={styles.sectionTitle}>{String(t("marketHeatmap"))}</Text>
          <Text style={styles.sectionSub}>{String(t("marketHeatmapSub"))}</Text>
          <View style={styles.heatmapGrid}>
            {heatmapData.map((item) => (
              <View
                key={item.region}
                style={[styles.heatCell, { backgroundColor: heatColor(item.demand) }]}
              >
                <Text style={styles.heatRegion}>{item.region}</Text>
                <Text style={styles.heatValue}>{item.demand}%</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* ━━━━━━━━━ FORECAST ━━━━━━━━━ */}
        <Animated.View
          style={styles.card}
          entering={FadeInDown.delay(staggerDelay * 8).springify()}
        >
          <View style={styles.titleRow}>
            <Ionicons name="analytics" size={20} color="#1E293B" style={{ marginRight: 8 }} />
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
            <View key={d.district} style={[styles.insightBox, i === 1 && { borderBottomWidth: 0 }]}>
              <Ionicons name="location" size={16} color="#F59E0B" />
              <Text style={styles.insightText}>
                {String(t("risingDemandMappedIn"))}
                <Text style={{ fontFamily: "Poppins_600SemiBold" }}>{d.district}</Text>
              </Text>
            </View>
          ))}
        </Animated.View>

        {/* ━━━━━━━━━ SMART MARKET RECOMMENDATION ━━━━━━━━━ */}
        <Animated.View
          style={styles.tipCard}
          entering={FadeInDown.delay(staggerDelay * 9).springify()}
        >
          <View style={styles.tipHeaderRow}>
            <Ionicons name="bulb" size={20} color="#fff" />
            <Text style={styles.tipTitle}>{String(t("smartMarketMove"))}</Text>
          </View>
          {marketRecommendation && (
            <View style={{ marginTop: 8 }}>
              <Text style={styles.tipLabel}>{String(t("optimalTargetMarket"))}</Text>
              <Text style={styles.tipValue}>
                {marketRecommendation.district} {String(t("via"))} {marketRecommendation.transportMode}
              </Text>
              <View style={styles.divider} />
              <Text style={styles.tipLabel}>{String(t("projectedYield"))}</Text>
              <Text style={styles.tipValueLarge}>
                LKR {Math.round(marketRecommendation.projectedProfit).toLocaleString()}
              </Text>
            </View>
          )}
        </Animated.View>

        {/* ━━━━━━━━━ BACK TO HOME ━━━━━━━━━ */}
        <Animated.View entering={FadeInDown.delay(staggerDelay * 10).springify()}>
          <Pressable
            style={({ pressed }) => [styles.homeButton, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/(tabs)/smartindex" as any);
            }}
          >
            <Ionicons name="home-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.homeButtonText}>{t("backToHome" as any) || "Back to Home"}</Text>
          </Pressable>
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* ────────────────── STYLES ────────────────── */
const styles = StyleSheet.create({
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

  /* Ticker */
  tickerCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginRight: 12,
    width: 150,
    shadowColor: "#64748b",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  tickerSpice: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: "#0F172A",
  },
  tickerRegion: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
    marginBottom: 4,
  },
  tickerPrice: {
    fontSize: 18,
    fontFamily: "Poppins_700Bold",
    marginVertical: 4,
    letterSpacing: -0.5,
    color: "#0F172A",
  },
  tickerChange: { flexDirection: "row", alignItems: "center", gap: 4 },

  /* Performance Summary Card */
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#64748b",
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  summaryCardTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 18,
    color: "#0F172A",
    marginBottom: 16,
  },
  kpiRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  kpiItem: {
    alignItems: "center",
    width: "31%",
  },
  kpiCenterPct: {
    fontFamily: "Poppins_700Bold",
    fontSize: 12,
    color: "#334155",
  },
  kpiValue: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: "#0F172A",
    marginTop: 8,
    textAlign: "center",
  },
  kpiLabel: {
    fontSize: 11,
    marginTop: 2,
    fontFamily: "Poppins_400Regular",
    color: "#64748B",
    textAlign: "center",
  },
  pipelineRow: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 14,
    marginTop: 16,
    justifyContent: "space-around",
  },
  pipelineStat: {
    alignItems: "center",
  },
  pipelineLabel: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: "#64748B",
  },
  pipelineValue: {
    fontFamily: "Poppins_700Bold",
    fontSize: 16,
    color: "#0F172A",
    marginTop: 2,
  },
  pipelineDivider: {
    width: 1,
    backgroundColor: "#E2E8F0",
  },

  /* Orders */
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
    width: 36,
    height: 36,
    borderRadius: 18,
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
  orderSubtitle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: "#64748B",
    marginTop: 1,
  },
  statusPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  statusPillText: {
    fontFamily: "Poppins_700Bold",
    fontSize: 11,
    letterSpacing: 0.5,
  },
  orderDivider: { height: 1, backgroundColor: "#F1F5F9", marginVertical: 12 },
  orderMetaGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metaCell: {
    flex: 1,
    alignItems: "center",
    borderRightWidth: 1,
    borderRightColor: "#F1F5F9",
    paddingHorizontal: 4,
  },
  metaLabel: {
    fontFamily: "Poppins_400Regular",
    fontSize: 10,
    color: "#64748B",
    marginBottom: 2,
  },
  metaValue: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: "#334155",
  },

  /* Cards */
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

  /* Tip Card */
  tipCard: {
    backgroundColor: "#2E7D32",
    borderRadius: 20,
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

  /* Heatmap */
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

  /* Home button */
  homeButton: {
    backgroundColor: "#0F172A",
    padding: 18,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    shadowColor: "#0F172A",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  homeButtonText: {
    color: "white",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15,
  },
});
