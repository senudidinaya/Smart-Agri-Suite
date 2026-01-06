import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function InsightsScreen() {
  const router = useRouter();

  /* ---------------- Mocked Optimization Result (PP1-safe) ---------------- */
  const data = {
    spice: "Cinnamon (Kurundu)",
    quantity: 50,
    farmerLocation: "Matale District",

    bestMarket: {
      name: "Dambulla Economic Center",
      pricePerKg: 2450,
      distanceKm: 12.4,
      transportCost: 450,
      demand: "High",
      netProfit: 98000,
    },

    comparisons: [
      {
        name: "Colombo Market",
        pricePerKg: 2600,
        transportCost: 1800,
        netProfit: 82000,
      },
      {
        name: "Kandy Market",
        pricePerKg: 2380,
        transportCost: 300,
        netProfit: 89000,
      },
    ],
  };

  /* ---------------- Animations ---------------- */
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(30)).current;
  const profitAnim = useRef(new Animated.Value(0)).current;

  const [displayProfit, setDisplayProfit] = useState(0);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slide, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(profitAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: false,
      }),
    ]).start();

    const listener = profitAnim.addListener(({ value }) => {
      setDisplayProfit(Math.round(value * data.bestMarket.netProfit));
    });

    return () => {
      profitAnim.removeListener(listener);
    };
  }, []);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* HEADER */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </Pressable>

        <Text style={styles.title}>Market Insights</Text>
        <Text style={styles.subtitle}>
          Optimized for profit • {data.quantity}kg of {data.spice}
        </Text>
      </View>

      {/* BEST MARKET */}
      <Animated.View
        style={[
          styles.heroCard,
          { opacity: fade, transform: [{ translateY: slide }] },
        ]}
      >
        <Text style={styles.heroTag}>Best Market Today</Text>
        <Text style={styles.marketName}>{data.bestMarket.name}</Text>

        <View style={styles.heroRow}>
          <Text>Price /kg</Text>
          <Text style={styles.bold}>LKR {data.bestMarket.pricePerKg}</Text>
        </View>

        <View style={styles.heroRow}>
          <Text>Transport Cost</Text>
          <Text>LKR {data.bestMarket.transportCost}</Text>
        </View>

        <View style={styles.heroRow}>
          <Text>Distance</Text>
          <Text>{data.bestMarket.distanceKm} km</Text>
        </View>

        <View style={styles.profitBox}>
          <Text style={styles.profitLabel}>Estimated Net Profit</Text>
          <Animated.Text style={styles.profitValue}>
            LKR {displayProfit.toLocaleString()}
          </Animated.Text>
        </View>

        <Pressable
          style={styles.outlineButton}
          onPress={() => router.push("/logistics")}
        >
          <Text style={styles.outlineButtonText}>Check Route & Logistics</Text>
        </Pressable>
      </Animated.View>

      {/* WHY THIS MARKET */}
      <Text style={styles.sectionTitle}>Why This Market?</Text>

      <View style={styles.reasonCard}>
        <Text style={styles.reason}>✔ High demand increases selling speed</Text>
        <Text style={styles.reason}>
          ✔ Lower transport cost despite moderate distance
        </Text>
        <Text style={styles.reason}>
          ✔ Better net profit than higher-priced markets
        </Text>
      </View>

      {/* COMPARISON */}
      <Text style={styles.sectionTitle}>Market Comparison</Text>

      {data.comparisons.map((m) => (
        <View key={m.name} style={styles.compareCard}>
          <Text style={styles.compareName}>{m.name}</Text>

          <View style={styles.compareRow}>
            <Text>Price /kg</Text>
            <Text>LKR {m.pricePerKg}</Text>
          </View>

          <View style={styles.compareRow}>
            <Text>Transport</Text>
            <Text>LKR {m.transportCost}</Text>
          </View>

          <View style={styles.compareRow}>
            <Text style={styles.compareLoss}>Net Profit</Text>
            <Text style={styles.compareLoss}>
              LKR {m.netProfit.toLocaleString()}
            </Text>
          </View>
        </View>
      ))}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f6f8f7" },

  header: {
    backgroundColor: "#4CAF50",
    padding: 24,
    paddingTop: 56,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  back: { color: "#fff" },
  title: { fontSize: 24, fontWeight: "700", color: "#fff", marginTop: 8 },
  subtitle: { color: "#e0f2e9", marginTop: 4 },

  heroCard: {
    backgroundColor: "#fff",
    margin: 16,
    padding: 18,
    borderRadius: 18,
    elevation: 3,
  },
  heroTag: {
    color: "#2e7d32",
    fontWeight: "700",
    marginBottom: 6,
  },
  marketName: { fontSize: 20, fontWeight: "700", marginBottom: 12 },
  heroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  bold: { fontWeight: "700" },

  profitBox: {
    backgroundColor: "#e8f5e9",
    marginTop: 16,
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  profitLabel: { color: "#2e7d32", fontSize: 12 },
  profitValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#2e7d32",
    marginTop: 4,
  },

  outlineButton: {
    marginTop: 16,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#4CAF50",
  },
  outlineButtonText: {
    textAlign: "center",
    color: "#4CAF50",
    fontWeight: "700",
  },

  sectionTitle: {
    marginHorizontal: 16,
    marginTop: 12,
    fontSize: 16,
    fontWeight: "700",
  },

  reasonCard: {
    backgroundColor: "#fff",
    margin: 16,
    padding: 16,
    borderRadius: 16,
  },
  reason: { marginBottom: 6 },

  compareCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 10,
    padding: 14,
    borderRadius: 14,
  },
  compareName: { fontWeight: "700", marginBottom: 8 },
  compareRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  compareLoss: { color: "#c62828", fontWeight: "700" },
});
