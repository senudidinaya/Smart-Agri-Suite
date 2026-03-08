import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
    FadeInDown,
    FadeInUp,
} from "react-native-reanimated";
import { useLanguage } from "../../context/LanguageContext";
import { useOrders } from "../../context/OrderContext";

export default function PriceResultScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const params = useLocalSearchParams();
  const { addOrder } = useOrders();

  const [saving, setSaving] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  // Extracted Params
  const spice = String(params.spice);
  const quantity = Number(params.quantity);
  const customer = String(params.customer);
  const mode = String(params.mode);
  const total = Number(params.total);
  const Pf = Number(params.Pf);
  const Ct = Number(params.Ct);
  const revenue = Number(params.revenue);
  const cost = Number(params.cost);
  const profit = Number(params.profit);

  const profitMargin = ((profit / revenue) * 100).toFixed(1);
  const isGoodProfit = profit > 20000;
  const statusColor = isGoodProfit ? "#10B981" : "#F59E0B";

  const handleConfirm = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaving(true);

    const newOrder = {
      spice,
      quantity,
      unitPrice: Pf,
      transportCost: Ct,
      productionCost: cost,
      revenue,
      totalCost: cost + Ct,
      profit,
      customer,
      status: "PENDING" as const,
    };

    await addOrder(newOrder);
    setSaving(false);
    setConfirmed(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleViewAnalytics = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace("/(tabs)/farmer");
  };

  const staggerDelay = 100;

  if (confirmed) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <Animated.View entering={FadeInDown.springify()} style={{ alignItems: "center", paddingHorizontal: 20 }}>
          {/* Success Circle */}
          <View style={styles.successCircle}>
            <View style={styles.successInnerCircle}>
              <Ionicons name="checkmark" size={48} color="#10B981" />
            </View>
          </View>

          {/* Title */}
          <Text style={styles.successTitle}>
            {t("orderConfirmed" as any) || "Order Confirmed!"} 🎉
          </Text>

          {/* Thank you message */}
          <View style={styles.thankYouCard}>
            <Ionicons name="heart" size={20} color="#EF4444" style={{ marginBottom: 8 }} />
            <Text style={styles.thankYouTitle}>
              {t("thankYouOrder" as any) || "Thank You for Ordering with Us!"}
            </Text>
            <Text style={styles.thankYouText}>
              {t("thankYouDesc" as any) || `Your harvest order for ${quantity} kg of ${t(spice.toLowerCase() as any) || spice} to ${customer} has been placed successfully.`}
            </Text>
          </View>

          {/* Order summary mini */}
          <View style={styles.confirmedSummary}>
            <View style={styles.confirmedRow}>
              <Text style={styles.confirmedLabel}>{t("selectSpice" as any) || "Spice"}</Text>
              <Text style={styles.confirmedValue}>{t(spice.toLowerCase() as any) || spice}</Text>
            </View>
            <View style={styles.confirmedRow}>
              <Text style={styles.confirmedLabel}>{t("quantity" as any) || "Quantity"}</Text>
              <Text style={styles.confirmedValue}>{quantity} kg</Text>
            </View>
            <View style={styles.confirmedRow}>
              <Text style={styles.confirmedLabel}>{t("targetMarket" as any) || "Market"}</Text>
              <Text style={styles.confirmedValue}>{customer}</Text>
            </View>
            <View style={styles.confirmedRow}>
              <Text style={styles.confirmedLabel}>{t("transport" as any) || "Transport"}</Text>
              <Text style={styles.confirmedValue}>{mode}</Text>
            </View>
            <View style={[styles.confirmedRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.confirmedLabel}>{t("netProfitSimulator" as any) || "Net Profit"}</Text>
              <Text style={[styles.confirmedValue, { color: profit >= 0 ? "#10B981" : "#EF4444", fontFamily: "Poppins_700Bold" }]}>
                {t("currencySymbol")} {Math.round(profit).toLocaleString()}
              </Text>
            </View>
          </View>

          {/* Status info */}
          <View style={styles.statusInfo}>
            <Ionicons name="cloud-done-outline" size={18} color="#3B82F6" />
            <Text style={styles.statusInfoText}>
              {t("syncedCloud" as any) || "Order synced to the cloud & added to your pipeline"}
            </Text>
          </View>

          {/* Next Steps */}
          <Text style={styles.nextStepsTitle}>{t("whatsNext" as any) || "What's Next?"}</Text>
          <View style={styles.nextStepsRow}>
            <View style={styles.nextStepItem}>
              <Ionicons name="hourglass-outline" size={20} color="#F59E0B" />
              <Text style={styles.nextStepText}>{t("trackProgress" as any) || "Track order progress"}</Text>
            </View>
            <View style={styles.nextStepItem}>
              <Ionicons name="bar-chart-outline" size={20} color="#3B82F6" />
              <Text style={styles.nextStepText}>{t("viewAnalytics" as any) || "View analytics"}</Text>
            </View>
            <View style={styles.nextStepItem}>
              <Ionicons name="notifications-outline" size={20} color="#8B5CF6" />
              <Text style={styles.nextStepText}>{t("getUpdates" as any) || "Get updates"}</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <Pressable
            style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}
            onPress={handleViewAnalytics}
          >
            <Ionicons name="apps" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.primaryBtnText}>{t("viewFarmerDashboard" as any) || "View Farmer Dashboard"}</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.8 }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.replace("/(tabs)/order" as any);
            }}
          >
            <Text style={styles.secondaryBtnText}>{t("placeAnother" as any) || "Place Another Order"}</Text>
          </Pressable>

        </Animated.View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      <ScrollView style={{ flex: 1, padding: 16 }} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.delay(staggerDelay * 1).springify()}>
          <Text style={styles.headerTitle}>{t("orderSummary" as any) || "Order Summary"}</Text>
          <Text style={styles.headerSub}>Review your generated configuration</Text>
        </Animated.View>

        {/* PROFIT OVERVIEW */}
        <Animated.View style={[styles.profitCard, { backgroundColor: isGoodProfit ? "#ECFDF5" : "#FEF3C7", borderColor: isGoodProfit ? "#A7F3D0" : "#FDE68A" }]} entering={FadeInDown.delay(staggerDelay * 2).springify()}>
          <View style={styles.profitHeaderRow}>
              <View style={[styles.iconWrap, { backgroundColor: isGoodProfit ? "#D1FAE5" : "#FEF3C7" }]}>
                  <Ionicons name="trending-up" size={24} color={statusColor} />
              </View>
              <Text style={[styles.marginTag, { color: statusColor, backgroundColor: isGoodProfit ? "#D1FAE5" : "#FEF3C7" }]}>
                  {profitMargin}% Margin
              </Text>
          </View>
          <Text style={styles.profitLabel}>{t("netProfitSimulator" as any) || "Net Estimated Profit"}</Text>
          <Text style={[styles.profitValue, { color: statusColor }]}>{t("currencySymbol")} {profit.toLocaleString()}</Text>
        </Animated.View>

        {/* DETAILS CARD */}
        <Animated.View style={styles.card} entering={FadeInDown.delay(staggerDelay * 3).springify()}>
          <Text style={styles.sectionTitle}>Order Details</Text>
          
          <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>{t("selectSpice" as any) || "Spice"}</Text>
                  <Text style={styles.detailValue}>{t(spice.toLowerCase() as any)}</Text>
              </View>
              <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>{t("expectedYield" as any) || "Quantity"}</Text>
                  <Text style={styles.detailValue}>{quantity} {t("kg" as any) || "kg"}</Text>
              </View>
          </View>

          <View style={[styles.detailRow, { marginTop: 12 }]}>
              <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>{t("targetMarket" as any) || "Target Market"}</Text>
                  <Text style={styles.detailValue}>{customer}</Text>
              </View>
              <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>{t("transport" as any) || "Logistics"}</Text>
                  <Text style={styles.detailValue}>{mode}</Text>
              </View>
          </View>
        </Animated.View>

        {/* FINANCIALS */}
        <Animated.View style={styles.card} entering={FadeInDown.delay(staggerDelay * 4).springify()}>
          <Text style={styles.sectionTitle}>{t("analytics" as any) || "Financial Breakdown"}</Text>
          
          <View style={styles.financeRow}>
              <Text style={styles.financeLabel}>Base Cost ({quantity}{t("kg" as any) || "kg"})</Text>
              <Text style={styles.financeValue}>{t("currencySymbol" as any) || "LKR"} {cost.toLocaleString()}</Text>
          </View>
          
          <View style={styles.financeRow}>
              <Text style={styles.financeLabel}>{t("transport" as any) || "Transport"} ({t(mode.toLowerCase() as any) || mode})</Text>
              <Text style={styles.financeValue}>{t("currencySymbol" as any) || "LKR"} {Math.round(Ct).toLocaleString()}</Text>
          </View>

          <View style={[styles.financeRow, { borderBottomWidth: 0, paddingBottom: 0, marginTop: 12, paddingTop: 16, borderTopWidth: 1, borderColor: '#E2E8F0' }]}>
              <Text style={styles.financeTitle}>{t("revenue" as any) || "Gross Revenue"}</Text>
              <Text style={styles.financeTitleValue}>{t("currencySymbol" as any) || "LKR"} {revenue.toLocaleString()}</Text>
          </View>
        </Animated.View>

        {/* ACTIONS */}
        <Animated.View entering={FadeInUp.delay(staggerDelay * 5).springify()}>
          <Pressable
            style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}
            onPress={handleConfirm}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>{t("confirmOrder" as any) || "Confirm Order"}</Text>
            )}
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.8 }]}
            onPress={() => router.back()}
            disabled={saving}
          >
            <Text style={styles.secondaryBtnText}>{t("modifyConfig" as any) || "Modify Configuration"}</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    padding: 16,
  },
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
  profitCard: {
      padding: 24,
      borderRadius: 24,
      borderWidth: 1,
      marginBottom: 16,
  },
  profitHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16
  },
  iconWrap: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
  },
  marginTag: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 13,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
      overflow: 'hidden'
  },
  profitLabel: {
      fontFamily: "Poppins_500Medium",
      color: "#475569",
      fontSize: 15
  },
  profitValue: {
      fontFamily: "Poppins_700Bold",
      fontSize: 32,
      marginTop: 4,
      letterSpacing: -1
  },
  card: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 24,
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
      marginBottom: 16
  },
  detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 8,
  },
  detailItem: {
      flex: 1,
      backgroundColor: "#F8FAFC",
      padding: 12,
      borderRadius: 16,
  },
  detailLabel: {
      fontFamily: "Poppins_500Medium",
      color: "#64748B",
      fontSize: 12
  },
  detailValue: {
      fontFamily: "Poppins_600SemiBold",
      color: "#0F172A",
      fontSize: 15,
      marginTop: 4
  },
  financeRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 12,
      borderBottomWidth: 1,
      borderColor: "#F1F5F9",
      paddingBottom: 12
  },
  financeLabel: {
      fontFamily: "Poppins_400Regular",
      color: "#64748B",
      fontSize: 15
  },
  financeValue: {
      fontFamily: "Poppins_600SemiBold",
      color: "#334155",
      fontSize: 15
  },
  financeTitle: {
      fontFamily: "Poppins_600SemiBold",
      color: "#0F172A",
      fontSize: 16
  },
  financeTitleValue: {
      fontFamily: "Poppins_700Bold",
      color: "#0F172A",
      fontSize: 18
  },
  primaryBtn: {
    backgroundColor: "#0F172A",
    padding: 18,
    borderRadius: 16,
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  primaryBtnText: {
    color: "white",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
  },
  secondaryBtn: {
    backgroundColor: "transparent",
    padding: 18,
    borderRadius: 16,
    marginTop: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: {
    color: "#64748B",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15,
  },
  
  /* ─── ORDER CONFIRMED SCREEN ─── */
  successCircle: {
      width: 110,
      height: 110,
      borderRadius: 55,
      backgroundColor: "#ECFDF5",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 24,
      marginTop: 20,
  },
  successInnerCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: "#D1FAE5",
      alignItems: "center",
      justifyContent: "center",
  },
  successTitle: {
      fontFamily: "Poppins_700Bold",
      fontSize: 28,
      color: "#0F172A",
      marginBottom: 16,
      textAlign: "center",
  },
  thankYouCard: {
      backgroundColor: "#fff",
      borderRadius: 20,
      padding: 20,
      alignItems: "center",
      marginBottom: 16,
      width: "100%",
      shadowColor: "#64748b",
      shadowOpacity: 0.08,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
  },
  thankYouTitle: {
      fontFamily: "Poppins_700Bold",
      fontSize: 17,
      color: "#0F172A",
      textAlign: "center",
      marginBottom: 8,
  },
  thankYouText: {
      fontFamily: "Poppins_400Regular",
      fontSize: 13,
      color: "#64748B",
      textAlign: "center",
      lineHeight: 20,
  },
  confirmedSummary: {
      backgroundColor: "#fff",
      borderRadius: 20,
      padding: 16,
      width: "100%",
      marginBottom: 16,
      shadowColor: "#64748b",
      shadowOpacity: 0.06,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
  },
  confirmedRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderColor: "#F1F5F9",
  },
  confirmedLabel: {
      fontFamily: "Poppins_500Medium",
      color: "#64748B",
      fontSize: 13,
  },
  confirmedValue: {
      fontFamily: "Poppins_600SemiBold",
      color: "#0F172A",
      fontSize: 14,
  },
  statusInfo: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#EFF6FF",
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
      gap: 8,
      marginBottom: 20,
      width: "100%",
  },
  statusInfoText: {
      fontFamily: "Poppins_400Regular",
      fontSize: 12,
      color: "#3B82F6",
      flex: 1,
  },
  nextStepsTitle: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 15,
      color: "#0F172A",
      marginBottom: 10,
      alignSelf: "flex-start",
  },
  nextStepsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      width: "100%",
      marginBottom: 12,
  },
  nextStepItem: {
      alignItems: "center",
      flex: 1,
      gap: 6,
  },
  nextStepText: {
      fontFamily: "Poppins_400Regular",
      fontSize: 10,
      color: "#64748B",
      textAlign: "center",
  },
});
