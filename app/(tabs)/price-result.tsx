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
import Animated, {
    FadeInDown,
    FadeInUp,
} from "react-native-reanimated";
import { useOrders } from "../../context/OrderContext";

export default function PriceResultScreen() {
  const router = useRouter();
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
    router.replace({
      pathname: "/analytics",
      params: {
        spice,
        profit,
        revenue,
        cost,
        margin: profitMargin,
      },
    });
  };

  const staggerDelay = 100;

  if (confirmed) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <Animated.View entering={FadeInDown.springify()} style={{ alignItems: "center" }}>
          <View style={styles.successCircle}>
            <Ionicons name="checkmark" size={48} color="#10B981" />
          </View>
          <Text style={styles.successTitle}>Order Confirmed</Text>
          <Text style={styles.successSub}>
            Your harvest order for {quantity}kg of {spice} has been placed successfully and synced to the cloud.
          </Text>

          <Pressable
            style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}
            onPress={handleViewAnalytics}
          >
            <Text style={styles.primaryBtnText}>View Yield Analytics</Text>
            <Ionicons name="bar-chart" size={20} color="#fff" />
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.8 }]}
            onPress={() => router.replace("/farmer")}
          >
            <Text style={styles.secondaryBtnText}>Go to Farmer Dashboard</Text>
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
      <Animated.View entering={FadeInDown.delay(staggerDelay * 1).springify()}>
        <Text style={styles.headerTitle}>Order Summary</Text>
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
        <Text style={styles.profitLabel}>Net Estimated Profit</Text>
        <Text style={[styles.profitValue, { color: statusColor }]}>LKR {profit.toLocaleString()}</Text>
      </Animated.View>

      {/* DETAILS CARD */}
      <Animated.View style={styles.card} entering={FadeInDown.delay(staggerDelay * 3).springify()}>
        <Text style={styles.sectionTitle}>Order Details</Text>
        
        <View style={styles.detailRow}>
            <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Spice</Text>
                <Text style={styles.detailValue}>{spice}</Text>
            </View>
            <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Quantity</Text>
                <Text style={styles.detailValue}>{quantity} kg</Text>
            </View>
        </View>

        <View style={[styles.detailRow, { marginTop: 16 }]}>
            <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Target Market</Text>
                <Text style={styles.detailValue}>{customer}</Text>
            </View>
            <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Logistics</Text>
                <Text style={styles.detailValue}>{mode}</Text>
            </View>
        </View>
      </Animated.View>

      {/* FINANCIALS */}
      <Animated.View style={styles.card} entering={FadeInDown.delay(staggerDelay * 4).springify()}>
        <Text style={styles.sectionTitle}>Financial Breakdown</Text>
        
        <View style={styles.financeRow}>
            <Text style={styles.financeLabel}>Base Cost ({quantity}kg)</Text>
            <Text style={styles.financeValue}>LKR {cost.toLocaleString()}</Text>
        </View>
        
        <View style={styles.financeRow}>
            <Text style={styles.financeLabel}>Transport ({mode})</Text>
            <Text style={styles.financeValue}>LKR {Math.round(Ct).toLocaleString()}</Text>
        </View>

        <View style={[styles.financeRow, { borderBottomWidth: 0, paddingBottom: 0, marginTop: 12, paddingTop: 16, borderTopWidth: 1, borderColor: '#E2E8F0' }]}>
            <Text style={styles.financeTitle}>Gross Revenue</Text>
            <Text style={styles.financeTitleValue}>LKR {revenue.toLocaleString()}</Text>
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
            <Text style={styles.primaryBtnText}>Confirm Order</Text>
          )}
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.8 }]}
          onPress={() => router.back()}
          disabled={saving}
        >
          <Text style={styles.secondaryBtnText}>Modify Configuration</Text>
        </Pressable>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    padding: 16,
    paddingTop: 24,
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
      justifyContent: 'space-between'
  },
  detailItem: {
      flex: 1,
      backgroundColor: "#F8FAFC",
      padding: 12,
      borderRadius: 16,
      marginRight: 8
  },
  detailLabel: {
      fontFamily: "Poppins_500Medium",
      color: "#64748B",
      fontSize: 12
  },
  detailValue: {
      fontFamily: "Poppins_600SemiBold",
      color: "#0F172A",
      fontSize: 16,
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
    marginRight: 8,
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
  
  successCircle: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: "#D1FAE5",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 24,
      marginTop: 40
  },
  successTitle: {
      fontFamily: "Poppins_700Bold",
      fontSize: 28,
      color: "#0F172A",
      marginBottom: 12
  },
  successSub: {
      fontFamily: "Poppins_400Regular",
      fontSize: 15,
      color: "#64748B",
      textAlign: "center",
      paddingHorizontal: 20,
      lineHeight: 24,
      marginBottom: 40
  }
});
