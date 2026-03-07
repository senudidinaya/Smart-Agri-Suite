import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useLanguage } from "../../context/LanguageContext";
import { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
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

  /* ================= NAV ================= */

  const handleGenerate = () => {
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
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 120 }}
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
                  {s}
                </Text>
              </ScalePressable>
            )
          })}
        </View>
      </Animated.View>

      {/* QUANTITY */}
      <Animated.View style={styles.card} entering={FadeInDown.delay(staggerDelay * 3).springify()}>
        <Text style={styles.label}>{t("expectedYield" as any) || "Quantity (kg)"}</Text>
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

          <Text style={styles.qty}>{quantity}</Text>

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
      </Animated.View>

      {/* CUSTOMER */}
      <Animated.View style={styles.card} entering={FadeInDown.delay(staggerDelay * 4).springify()}>
        <Text style={styles.label}>Customer Market Location</Text>
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
                <Text style={[styles.chipText, active && styles.activeText]}>{r}</Text>
              </ScalePressable>
            )
          })}
        </View>
      </Animated.View>

      {/* MODE */}
      <Animated.View style={styles.card} entering={FadeInDown.delay(staggerDelay * 5).springify()}>
        <Text style={styles.label}>Transport Method</Text>
        <View style={styles.row}>
          {(["Bike", "Threewheel", "Van", "Lorry"] as ModeKey[]).map((m) => {
            const active = mode === m;
            return (
              <ScalePressable
                key={m}
                style={[styles.chip, active && styles.activeChip]}
                onPress={() => setMode(m)}
              >
                <Text style={[styles.chipText, active && styles.activeText]}>{m}</Text>
              </ScalePressable>
            )
          })}
        </View>
      </Animated.View>

      {/* INFO */}
      <Animated.View style={styles.priceCard} entering={FadeInDown.delay(staggerDelay * 6).springify()}>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Route Distance:</Text>
          <Text style={styles.priceValue}>{transport.distance} km</Text>
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Logistics Cost:</Text>
          <Text style={styles.priceValue}>LKR {Math.round(Ct).toLocaleString()}</Text>
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Gross Revenue:</Text>
          <Text style={styles.priceValue}>LKR {Math.round(total).toLocaleString()}</Text>
        </View>
        <View style={[styles.priceRow, { borderBottomWidth: 0, paddingBottom: 0, marginTop: 8, paddingTop: 16, borderTopWidth: 1, borderColor: '#E2E8F0' }]}>
          <Text style={styles.profitLabel}>Net Profit Estimate:</Text>
          <Text style={styles.profitValue}>LKR {Math.round(profit).toLocaleString()}</Text>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(staggerDelay * 7).springify()}>
        <Pressable
          style={({ pressed }) => [styles.generate, pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}
          onPress={handleGenerate}
        >
          <Text style={styles.genText}>{t("submit" as any) || "Generate Full Analysis"}</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.8 }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/index" as any);
          }}
        >
          <Text style={styles.backText}>{t("cancel" as any) || "Cancel & Return"}</Text>
        </Pressable>
      </Animated.View>
    </ScrollView>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    padding: 16,
    paddingTop: 24,
  },
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
  activeText: {
    color: "#10B981",
    fontFamily: "Poppins_600SemiBold",
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
  priceCard: {
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 24,
    marginTop: 8,
    shadowColor: "#64748b",
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  priceLabel: {
    fontFamily: "Poppins_500Medium",
    color: "#64748B",
    fontSize: 14
  },
  priceValue: {
    fontFamily: "Poppins_600SemiBold",
    color: "#1E293B",
    fontSize: 15
  },
  profitLabel: {
    fontFamily: "Poppins_700Bold",
    color: "#0F172A",
    fontSize: 16
  },
  profitValue: {
    fontFamily: "Poppins_700Bold",
    color: "#10B981",
    fontSize: 20
  },
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
