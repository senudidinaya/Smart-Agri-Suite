import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { COLORS, RADIUS, SPACING } from "./theme";

export default function InsightsScreen() {
  const router = useRouter();
  const { spice, region } = useLocalSearchParams();

  // Mocked optimization result (PP1-safe)
  const data = {
    spice: spice ?? "Cinnamon",
    quantity: 50,
    bestMarket: "Dambulla Economic Center",
    pricePerKg: 2450,
    distanceKm: 12.4,
    transportCost: 450,
    profitPercent: 12,
    demand: "High",
    otherMarkets: [
      { name: "Kandy Market", price: 2380, note: "Lower transport cost" },
      { name: "Colombo Market", price: 2600, note: "High distance impact" },
    ],
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </Pressable>

        <Text style={styles.title}>Market Insights</Text>
        <Text style={styles.subtitle}>
          Based on {data.quantity}kg of {data.spice}
        </Text>
      </View>

      {/* Best Market */}
      <View style={styles.cardHighlight}>
        <Text style={styles.cardTag}>Recommended Market</Text>

        <Text style={styles.marketName}>{data.bestMarket}</Text>
        <Text style={styles.meta}>
          {data.distanceKm} km away • Best net profit
        </Text>

        <Text style={styles.price}>
          LKR {data.pricePerKg}
          <Text style={styles.perKg}> /kg</Text>
        </Text>

        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Profit</Text>
            <Text style={styles.metricPositive}>+{data.profitPercent}%</Text>
          </View>

          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Demand</Text>
            <Text style={styles.metricWarning}>{data.demand}</Text>
          </View>

          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Transport</Text>
            <Text style={styles.metricValue}>LKR {data.transportCost}</Text>
          </View>
        </View>

        <Pressable
          style={styles.secondaryButton}
          onPress={() => router.push("/logistics")}
        >
          <Text style={styles.secondaryButtonText}>
            Check Route & Logistics
          </Text>
        </Pressable>
      </View>

      {/* Other Markets */}
      <Text style={styles.sectionTitle}>Other Markets</Text>

      <View style={styles.otherMarkets}>
        {data.otherMarkets.map((m) => (
          <View key={m.name} style={styles.otherCard}>
            <Text style={styles.otherName}>{m.name}</Text>
            <Text style={styles.otherPrice}>LKR {m.price} /kg</Text>
            <Text style={styles.otherNote}>{m.note}</Text>
          </View>
        ))}
      </View>

      {/* Insight Explanation */}
      <View style={styles.insightCard}>
        <Text style={styles.sectionTitle}>Why this market?</Text>
        <Text style={styles.explanation}>
          Although Colombo offers a higher price per kg, increased distance and
          transport costs reduce overall profit. Dambulla provides the best
          balance between price, demand, and logistics efficiency.
        </Text>
      </View>
    </ScrollView>
  );
}

/* =========================
   STYLES (FULLY DEFINED)
   ========================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.softBg,
  },

  header: {
    backgroundColor: COLORS.primary,
    padding: SPACING.screen,
    paddingTop: 56,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },

  back: {
    color: "#E8F5E9",
    marginBottom: 8,
    fontWeight: "500",
  },

  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
  },

  subtitle: {
    marginTop: 6,
    color: "#E8F5E9",
  },

  cardHighlight: {
    backgroundColor: COLORS.card,
    margin: 16,
    padding: 18,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  cardTag: {
    color: COLORS.accent,
    fontWeight: "600",
    marginBottom: 6,
  },

  marketName: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.textMain,
  },

  meta: {
    color: COLORS.textSub,
    marginBottom: 10,
  },

  price: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.primary,
  },

  perKg: {
    fontSize: 14,
    color: COLORS.textSub,
  },

  metricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },

  metric: {
    alignItems: "center",
  },

  metricLabel: {
    fontSize: 12,
    color: COLORS.textSub,
  },

  metricPositive: {
    fontWeight: "700",
    color: COLORS.accent,
  },

  metricWarning: {
    fontWeight: "700",
    color: COLORS.warning,
  },

  metricValue: {
    fontWeight: "700",
    color: COLORS.textMain,
  },

  secondaryButton: {
    marginTop: 20,
    padding: 14,
    borderRadius: RADIUS.button,
    borderWidth: 1.5,
    borderColor: COLORS.accent,
  },

  secondaryButtonText: {
    textAlign: "center",
    color: COLORS.accent,
    fontWeight: "700",
  },

  sectionTitle: {
    marginLeft: 16,
    marginTop: 20,
    marginBottom: 8,
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textMain,
  },

  otherMarkets: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
  },

  otherCard: {
    backgroundColor: "#F1F8F4",
    padding: 14,
    borderRadius: RADIUS.card,
    minWidth: 160,
  },

  otherName: {
    fontWeight: "600",
    marginBottom: 4,
  },

  otherPrice: {
    fontWeight: "700",
    marginBottom: 2,
  },

  otherNote: {
    fontSize: 12,
    color: COLORS.textSub,
  },

  insightCard: {
    backgroundColor: COLORS.card,
    margin: 16,
    padding: 16,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  explanation: {
    color: COLORS.textSub,
    lineHeight: 20,
  },
});
