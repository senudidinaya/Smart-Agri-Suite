import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type ProvinceKey = keyof typeof PROVINCES;

const PROVINCES = {
  Central: {
    multiplier: 1.15,
    cities: {
      Kandy: 1.1,
      Matale: 1.05,
      NuwaraEliya: 1.0,
    },
  },
  Western: {
    multiplier: 1.2,
    cities: {
      Colombo: 1.1,
      Gampaha: 1.05,
      Kalutara: 1.0,
    },
  },
  Southern: {
    multiplier: 1.05,
    cities: {
      Galle: 1.05,
      Matara: 1.0,
      Hambantota: 0.95,
    },
  },
  Uva: {
    multiplier: 0.9,
    cities: {
      Badulla: 1.0,
      Monaragala: 0.95,
    },
  },
} as const;

export default function ExploreScreen() {
  const router = useRouter();

  /* ---------------- Animation ---------------- */
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  /* ---------------- State ---------------- */
  const [spice, setSpice] = useState("Cinnamon");
  const [quantity, setQuantity] = useState(50);

  const [province, setProvince] = useState<ProvinceKey>("Central");
  const [city, setCity] = useState("Kandy");

  const [loading, setLoading] = useState(false);

  /* ---------------- Quantity ---------------- */
  const increaseQty = () => setQuantity((q) => Math.min(q + 5, 300));
  const decreaseQty = () => setQuantity((q) => Math.max(q - 5, 5));

  /* ---------------- Pricing Logic ---------------- */
  const basePricePerKg = spice.toLowerCase().includes("cinnamon") ? 240 : 180;

  const spiceDemandMultiplier = spice.toLowerCase().includes("cinnamon")
    ? 1.1
    : 1.0;

  const provinceMultiplier = PROVINCES[province].multiplier;
  const cityMultiplier =
    PROVINCES[province].cities[
      city as keyof (typeof PROVINCES)[typeof province]["cities"]
    ];

  const estimatedProfit = Math.round(
    quantity *
      basePricePerKg *
      spiceDemandMultiplier *
      provinceMultiplier *
      cityMultiplier
  );

  const demandLabel =
    provinceMultiplier >= 1.1
      ? "High"
      : provinceMultiplier >= 1.0
      ? "Medium"
      : "Low";

  /* ---------------- CTA ---------------- */
  const handleGenerate = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.push({
        pathname: "/insights",
        params: {
          spice,
          quantity: quantity.toString(),
          province,
          city,
        },
      });
    }, 900);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
        <Text style={styles.title}>Market Analysis</Text>
        <Text style={styles.subtitle}>
          Location-aware pricing and demand estimation
        </Text>

        {/* Spice */}
        <View style={styles.card}>
          <Text style={styles.label}>Spice</Text>
          <TextInput
            value={spice}
            onChangeText={setSpice}
            style={styles.input}
          />
        </View>

        {/* Quantity */}
        <View style={styles.card}>
          <Text style={styles.label}>Quantity (kg)</Text>
          <View style={styles.qtyRow}>
            <Pressable style={styles.qtyBtn} onPress={decreaseQty}>
              <Text style={styles.qtyBtnText}>−</Text>
            </Pressable>
            <Text style={styles.qtyValue}>{quantity} kg</Text>
            <Pressable style={styles.qtyBtn} onPress={increaseQty}>
              <Text style={styles.qtyBtnText}>+</Text>
            </Pressable>
          </View>
        </View>

        {/* Province */}
        <View style={styles.card}>
          <Text style={styles.label}>Your Province</Text>
          <View style={styles.chipRow}>
            {(Object.keys(PROVINCES) as ProvinceKey[]).map((p) => {
              const active = province === p;
              return (
                <Pressable
                  key={p}
                  onPress={() => {
                    setProvince(p);
                    setCity(Object.keys(PROVINCES[p].cities)[0]);
                  }}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text
                    style={[styles.chipText, active && styles.chipTextActive]}
                  >
                    {p}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* City */}
        <View style={styles.card}>
          <Text style={styles.label}>Nearest City</Text>
          <View style={styles.chipRow}>
            {Object.keys(PROVINCES[province].cities).map((c) => {
              const active = city === c;
              return (
                <Pressable
                  key={c}
                  onPress={() => setCity(c)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text
                    style={[styles.chipText, active && styles.chipTextActive]}
                  >
                    {c}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Demand */}
        <View style={styles.infoCard}>
          <Ionicons name="analytics" size={20} color="#2e7d32" />
          <Text style={styles.infoText}>
            Demand Level:{" "}
            <Text style={{ fontWeight: "700" }}>{demandLabel}</Text>
            {"\n"}Province and city accessibility impact pricing.
          </Text>
        </View>

        {/* Profit */}
        <View style={styles.profitCard}>
          <Text style={styles.profitLabel}>Estimated Net Profit</Text>
          <Text style={styles.profitValue}>
            LKR {estimatedProfit.toLocaleString()}
          </Text>
        </View>
      </Animated.View>

      <Pressable style={styles.ctaButton} onPress={handleGenerate}>
        <Text style={styles.ctaText}>
          {loading ? "Analyzing..." : "Generate Market Insights"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f6f8f7", paddingHorizontal: 16 },

  title: { marginTop: 56, fontSize: 22, fontWeight: "700" },
  subtitle: { color: "#777", marginBottom: 20 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    elevation: 2,
  },

  label: { fontSize: 12, color: "#777", marginBottom: 6 },
  input: { fontSize: 16 },

  qtyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  qtyBtn: {
    backgroundColor: "#e8f5e9",
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
  },

  qtyBtnText: { fontSize: 22, fontWeight: "700", color: "#2e7d32" },
  qtyValue: { fontSize: 18, fontWeight: "700" },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },

  chip: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },

  chipActive: {
    backgroundColor: "#e8f5e9",
    borderColor: "#4CAF50",
  },

  chipText: { fontWeight: "600" },
  chipTextActive: { color: "#2e7d32" },

  infoCard: {
    backgroundColor: "#E8F5E9",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    gap: 12,
    marginTop: 10,
  },

  infoText: { fontSize: 13, color: "#333", flex: 1 },

  profitCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    marginTop: 16,
    elevation: 2,
  },

  profitLabel: { fontSize: 12, color: "#777" },
  profitValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#2e7d32",
  },

  ctaButton: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: "#4CAF50",
    padding: 18,
    borderRadius: 16,
    elevation: 4,
  },

  ctaText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "800",
    fontSize: 16,
  },
});
