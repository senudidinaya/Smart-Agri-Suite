import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useLanguage } from "../../context/LanguageContext";
import { useEffect, useState } from "react";
import {
  Alert,
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
  useAnimatedStyle,
  useSharedValue,
  withSpring
} from "react-native-reanimated";

/* 🔹 IMPORT ENGINES */
import { loadMarketData } from "../../lib/dataLoader";
import {
  calculateDemand,
  calculateSupply,
  getBasePrice,
} from "../../lib/marketAnalytics";
import { calculatePrice } from "../../lib/pricingEngine";
import { calculateProfit } from "../../lib/profitEngine";
import { calculateTransportCost } from "../../lib/transportEngine";

/* ================= TYPES ================= */

type SpiceKey = "Cinnamon" | "Pepper" | "Clove" | "Cardamom" | "Nutmeg";
type RegionKey = "Dambulla" | "Kandy" | "Matale" | "Colombo" | "Kurunegala";
type ModeKey = "Bike" | "Threewheel" | "Van" | "Lorry";

/* ================= VEHICLE CONSTRAINTS ================= */
const VEHICLE_LIMITS: Record<ModeKey, { maxQty: number; maxDistance: number; label: string }> = {
  Bike:       { maxQty: 10,  maxDistance: 40,  label: "Bike" },
  Threewheel: { maxQty: 50,  maxDistance: 80,  label: "Three-wheeler" },
  Van:        { maxQty: 200, maxDistance: 300, label: "Van" },
  Lorry:      { maxQty: 1000, maxDistance: 500, label: "Lorry" },
};

/* ================= ANIMATED HELPERS ================= */
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

function ScalePressable({ children, style: customStyle, onPress, ...rest }: any) {
  const { style, onPressIn, onPressOut } = useScaleAnimation();
  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={[customStyle, style]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}

/* ================= SCREEN ================= */

export default function OrderScreen() {
  const router = useRouter();
  const { t } = useLanguage();

  /* DATA STATE */
  const [marketData, setMarketData] = useState<any[]>([]);

  useEffect(() => {
    async function init() {
      const data = await loadMarketData();
      setMarketData(data);
    }
    init();
  }, []);

  /* USER STATE */
  const [spice, setSpice] = useState<SpiceKey>("Cinnamon");
  const [quantity, setQuantity] = useState(50);
  const [customer, setCustomer] = useState<RegionKey>("Colombo");
  const [mode, setMode] = useState<ModeKey>("Van");

  const farmerLocation: RegionKey = "Matale";

  /* ================= SMART CALCULATIONS ================= */

  const Pb = getBasePrice(spice, marketData);
  const D = calculateDemand(spice, marketData);
  const S = calculateSupply(spice, marketData);
  const Pf = calculatePrice(Pb, D, S);
  const transport = calculateTransportCost(farmerLocation, customer, mode);
  const Ct = transport.cost;
  const total = Pf * quantity + Ct;
  const baseCost = Pb * 0.6 * quantity; // assumed cost model
  const profitData = calculateProfit(Pf, quantity, Ct, baseCost);
  const profit = profitData.profit;

  /* ================= VALIDATION ================= */

  const vehicleLimit = VEHICLE_LIMITS[mode];
  const isQtyOverLimit = quantity > vehicleLimit.maxQty;
  const isDistanceOverLimit = transport.distance > vehicleLimit.maxDistance;
  const hasValidationError = isQtyOverLimit || isDistanceOverLimit;

  /* ================= NAV ================= */

  const handleGenerate = () => {
    if (isQtyOverLimit) {
      Alert.alert(
        "Capacity Exceeded",
        `A ${vehicleLimit.label} can carry a maximum of ${vehicleLimit.maxQty} kg. Please reduce the quantity or select a larger vehicle.`,
        [{ text: "OK" }]
      );
      return;
    }
    if (isDistanceOverLimit) {
      Alert.alert(
        "Distance Exceeded",
        `A ${vehicleLimit.label} can travel a maximum of ${vehicleLimit.maxDistance} km. The route is ${transport.distance} km. Please select a different vehicle or market.`,
        [{ text: "OK" }]
      );
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.push({
      pathname: "/price-result",
      params: {
        spice,
        quantity,
        customer,
        mode,
        distance: transport.distance,
        Pf,
        Ct,
        total,
        D,
        S,
        revenue: profitData.revenue,
        cost: profitData.cost,
        profit,
      },
    });
  };

  const staggerDelay = 100;

  /* ================= UI ================= */

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(staggerDelay * 1).springify()}>
          <Text style={styles.title}>{t("simulateHarvest" as any) || "Harvest Simulator"}</Text>
          <Text style={styles.subtitle}>{t("harvestScenario" as any) || "Configure logistics to estimate market selling price"}</Text>
        </Animated.View>

        {/* SPICE */}
        <Animated.View style={styles.card} entering={FadeInDown.delay(staggerDelay * 2).springify()}>
          <Text style={styles.label}>{t("selectSpice" as any) || "Spice Category"}</Text>
          <View style={styles.row}>
            {(
              [
                "Cinnamon",
                "Pepper",
                "Clove",
                "Cardamom",
                "Nutmeg",
              ] as SpiceKey[]
            ).map((s) => {
              const active = spice === s;
              return (
                <ScalePressable
                  key={s}
                  style={[styles.chip, active && styles.activeChip]}
                  onPress={() => setSpice(s)}
                >
                  <Text style={[styles.chipText, active && styles.activeText]}>
                    {t(s.toLowerCase() as any) || s}
                  </Text>
                </ScalePressable>
              )
            })}
          </View>
        </Animated.View>

        {/* QUANTITY */}
        <Animated.View style={styles.card} entering={FadeInDown.delay(staggerDelay * 3).springify()}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={styles.label}>{t("expectedYield" as any) || "Quantity (kg)"}</Text>
            <Text style={[styles.limitHint, isQtyOverLimit && { color: "#EF4444" }]}>
              Max: {vehicleLimit.maxQty} kg
            </Text>
          </View>
          <View style={styles.qtyRow}>
            <Pressable
              style={({ pressed }) => [styles.btn, pressed && { opacity: 0.7 }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                if (quantity >= 5) setQuantity(quantity - 5)
              }}
            >
              <Text style={styles.btnText}>-5</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.btnSmall, pressed && { opacity: 0.7 }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                if (quantity >= 1) setQuantity(quantity - 1)
              }}
            >
              <Text style={styles.btnSmallText}>-1</Text>
            </Pressable>

            <Text style={[styles.qty, isQtyOverLimit && { color: "#EF4444" }]}>{quantity}</Text>

            <Pressable
              style={({ pressed }) => [styles.btnSmall, pressed && { opacity: 0.7 }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setQuantity(quantity + 1)
              }}
            >
              <Text style={styles.btnSmallText}>+1</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.btn, pressed && { opacity: 0.7 }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setQuantity(quantity + 5)
              }}
            >
              <Text style={styles.btnText}>+5</Text>
            </Pressable>
          </View>
          {isQtyOverLimit && (
            <Text style={styles.errorText}>
              ⚠️ {vehicleLimit.label} can only carry up to {vehicleLimit.maxQty} kg
            </Text>
          )}
        </Animated.View>

        {/* CUSTOMER */}
        <Animated.View style={styles.card} entering={FadeInDown.delay(staggerDelay * 4).springify()}>
          <Text style={styles.label}>{t("targetMarket" as any) || "Customer Market Location"}</Text>
          <View style={styles.row}>
            {(
              ["Colombo", "Kandy", "Dambulla", "Kurunegala"] as RegionKey[]
            ).map((r) => {
              const active = customer === r;
              return (
                <ScalePressable
                  key={r}
                  style={[styles.chip, active && styles.activeChip]}
                  onPress={() => setCustomer(r)}
                >
                  <Text style={[styles.chipText, active && styles.activeText]}>
                    {t(r.toLowerCase() as any) || r}
                  </Text>
                </ScalePressable>
              )
            })}
          </View>
        </Animated.View>

        {/* MODE */}
        <Animated.View style={styles.card} entering={FadeInDown.delay(staggerDelay * 5).springify()}>
          <Text style={styles.label}>{t("transport" as any) || "Transport Method"}</Text>
          <View style={styles.row}>
            {(["Bike", "Threewheel", "Van", "Lorry"] as ModeKey[]).map((m) => {
              const active = mode === m;
              const limit = VEHICLE_LIMITS[m];
              return (
                <ScalePressable
                  key={m}
                  style={[styles.chip, active && styles.activeChip]}
                  onPress={() => setMode(m)}
                >
                  <Text style={[styles.chipText, active && styles.activeText]}>{m}</Text>
                  <Text style={[styles.chipSubText, active && { color: "#059669" }]}>
                    ≤{limit.maxQty}kg · ≤{limit.maxDistance}km
                  </Text>
                </ScalePressable>
              )
            })}
          </View>
          {isDistanceOverLimit && (
            <Text style={styles.errorText}>
              ⚠️ {vehicleLimit.label} max range is {vehicleLimit.maxDistance} km (route: {transport.distance} km)
            </Text>
          )}
        </Animated.View>

        {/* ORDER SUMMARY */}
        <Animated.View style={styles.summaryCard} entering={FadeInDown.delay(staggerDelay * 6).springify()}>
          <Text style={styles.summaryTitle}>{t("orderSummary" as any) || "Order Summary"}</Text>

          <View style={styles.summaryDivider} />

          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>{t("selectSpice" as any) || "Spice"}:</Text>
            <Text style={styles.priceValue}>{t(spice.toLowerCase() as any) || spice}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>{t("quantity" as any) || "Quantity"}:</Text>
            <Text style={styles.priceValue}>{quantity} kg</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>{t("targetMarket" as any) || "Market"}:</Text>
            <Text style={styles.priceValue}>{t(customer.toLowerCase() as any) || customer}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>{t("transport" as any) || "Transport"}:</Text>
            <Text style={styles.priceValue}>{mode}</Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Route Distance:</Text>
            <Text style={styles.priceValue}>{transport.distance} km</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>{t("totalCost" as any) || "Logistics Cost"}:</Text>
            <Text style={styles.priceValue}>{t("currencySymbol")} {Math.round(Ct).toLocaleString()}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>{t("grossRevenue" as any) || "Gross Revenue"}:</Text>
            <Text style={styles.priceValue}>{t("currencySymbol")} {Math.round(total).toLocaleString()}</Text>
          </View>

          <View style={styles.summaryDivider} />

          {/* Net Profit at the bottom */}
          <View style={styles.profitCard}>
            <Text style={styles.profitLabel}>{t("netProfitSimulator" as any) || "Net Profit Estimate"}</Text>
            <Text style={[styles.profitValue, profit < 0 && { color: "#EF4444" }]}>
              {t("currencySymbol")} {Math.round(profit).toLocaleString()}
            </Text>
          </View>
        </Animated.View>

        {/* VALIDATION WARNING */}
        {hasValidationError && (
          <Animated.View entering={FadeInDown.springify()} style={styles.warningBanner}>
            <Text style={styles.warningText}>
              ⚠️ Please fix the validation errors above before submitting
            </Text>
          </Animated.View>
        )}

        {/* ACTION BUTTONS */}
        <Animated.View entering={FadeInUp.delay(staggerDelay * 7).springify()}>
          <Pressable
            style={({ pressed }) => [
              styles.generate,
              hasValidationError && styles.generateDisabled,
              pressed && !hasValidationError && { opacity: 0.9, transform: [{ scale: 0.98 }] }
            ]}
            onPress={handleGenerate}
          >
            <Text style={styles.genText}>{t("submitOrder" as any) || "Submit Order"}</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.dashboardBtn, pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}
            onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              router.push("/(tabs)/farmer" as any);
            }}
          >
            <Text style={styles.dashboardBtnText}>{t("viewFarmerDashboard" as any) || "View Farmer Dashboard"}</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.8 }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/(tabs)/smartindex" as any);
            }}
          >
            <Text style={styles.backText}>{t("cancel" as any) || "Cancel & Return"}</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  title: {
    fontFamily: "Poppins_700Bold",
    fontSize: 26,
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  subtitle: {
    color: "#64748B",
    fontSize: 15,
    fontFamily: "Poppins_400Regular",
    marginBottom: 20
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
  label: {
    fontSize: 15,
    fontFamily: "Poppins_600SemiBold",
    color: "#1E293B",
  },
  limitHint: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
    color: "#64748B",
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },
  activeChip: {
    backgroundColor: "#ECFDF5",
    borderColor: "#10B981"
  },
  chipText: {
    fontFamily: "Poppins_500Medium",
    color: "#64748B",
    fontSize: 14,
  },
  chipSubText: {
    fontFamily: "Poppins_400Regular",
    color: "#94A3B8",
    fontSize: 10,
    marginTop: 2,
  },
  activeText: {
    color: "#10B981",
    fontFamily: "Poppins_600SemiBold",
  },
  errorText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
    color: "#EF4444",
    marginTop: 10,
  },
  qtyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 16,
  },
  btn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#E2E8F0",
    borderRadius: 12,
  },
  btnText: {
    fontFamily: "Poppins_600SemiBold",
    color: "#334155",
    fontSize: 15
  },
  btnSmall: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
  },
  btnSmallText: {
    fontFamily: "Poppins_500Medium",
    color: "#475569",
    fontSize: 14
  },
  qty: {
    fontSize: 24,
    fontFamily: "Poppins_700Bold",
    color: "#0F172A",
    minWidth: 50,
    textAlign: 'center'
  },

  /* ─── Order Summary ─── */
  summaryCard: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 24,
    marginTop: 8,
    shadowColor: "#64748b",
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
    width: '100%',
  },
  summaryTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 20,
    color: "#0F172A",
    marginBottom: 4,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 10,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  priceLabel: {
    fontFamily: "Poppins_500Medium",
    color: "#64748B",
    fontSize: 13
  },
  priceValue: {
    fontFamily: "Poppins_600SemiBold",
    color: "#1E293B",
    fontSize: 14
  },
  profitCard: {
    backgroundColor: "#F0FDF4",
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    marginTop: 4,
  },
  profitLabel: {
    fontFamily: "Poppins_600SemiBold",
    color: "#166534",
    fontSize: 13,
    marginBottom: 2,
  },
  profitValue: {
    fontFamily: "Poppins_700Bold",
    color: "#16A34A",
    fontSize: 24,
    letterSpacing: -0.5,
  },

  /* ─── Warning ─── */
  warningBanner: {
    backgroundColor: "#FEF2F2",
    padding: 14,
    borderRadius: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  warningText: {
    fontFamily: "Poppins_500Medium",
    color: "#DC2626",
    fontSize: 13,
    textAlign: "center",
  },

  /* ─── Buttons ─── */
  generate: {
    backgroundColor: "#10B981",
    padding: 18,
    borderRadius: 16,
    marginTop: 24,
    shadowColor: "#10B981",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  generateDisabled: {
    backgroundColor: "#94A3B8",
    shadowColor: "#94A3B8",
  },
  dashboardBtn: {
    backgroundColor: "#2563EB",
    padding: 18,
    borderRadius: 16,
    marginTop: 12,
    shadowColor: "#2563EB",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  dashboardBtnText: {
    color: "white",
    textAlign: "center",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15,
  },
  backBtn: {
    padding: 18,
    borderRadius: 16,
    marginTop: 8,
  },
  genText: {
    color: "white",
    textAlign: "center",
    fontFamily: "Poppins_700Bold",
    fontSize: 16,
  },
  backText: {
    color: "#64748B",
    textAlign: "center",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15,
  }
});
