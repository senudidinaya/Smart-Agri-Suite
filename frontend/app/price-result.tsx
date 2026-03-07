import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AnimatedCircularProgress } from "react-native-circular-progress";
import { calculateNPV } from "../lib/npvEngine";

export default function PriceResult() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const spice = params.spice as string;
  const quantity = Number(params.quantity);
  const customer = params.customer as string;
  const mode = params.mode as string;

  const Pf = Number(params.Pf);
  const Ct = Number(params.Ct);
  const total = Number(params.total);

  const D = Number(params.D);
  const S = Number(params.S);

  const distance = Number(params.distance);
  const revenue = Number(params.revenue);
  const cost = Number(params.cost);
  const profit = Number(params.profit);

  /* NPV using engine */
  const projectedProfits = [profit, profit * 1.05, profit * 1.1];
  const npv = calculateNPV(projectedProfits, 0.1);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 120 }}
    >
      <Text style={styles.title}>Price Simulation Result</Text>

      {/* SUMMARY */}

      <View style={styles.summaryCard}>
        <Text style={styles.sectionTitle}>Order Summary</Text>

        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Ionicons name="leaf" size={20} color="green" />
            <Text style={styles.summaryText}>{spice}</Text>
          </View>

          <View style={styles.summaryItem}>
            <Ionicons name="scale" size={20} color="#333" />
            <Text style={styles.summaryText}>{quantity} kg</Text>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Ionicons name="location" size={20} color="#1e88e5" />
            <Text style={styles.summaryText}>{customer}</Text>
          </View>

          <View style={styles.summaryItem}>
            <Ionicons name="car" size={20} color="#f57c00" />
            <Text style={styles.summaryText}>{mode}</Text>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Ionicons name="map" size={20} color="#6a1b9a" />
            <Text style={styles.summaryText}>Distance: {distance} km</Text>
          </View>

          <View style={styles.summaryItem}>
            <Ionicons name="cash" size={20} color="#2e7d32" />
            <Text style={styles.summaryText}>LKR {Math.round(Ct)}</Text>
          </View>
        </View>
      </View>

      {/* SMART PRICE */}

      <View style={styles.card}>
        <Text style={styles.label}>Final Price per kg (Pf)</Text>
        <Text style={styles.big}>LKR {Math.round(Pf)}</Text>
      </View>

      {/* REVENUE */}

      <View style={styles.card}>
        <Text style={styles.label}>Total Revenue</Text>
        <Text style={styles.bigGreen}>LKR {Math.round(revenue)}</Text>
      </View>

      {/* COST */}

      <View style={styles.card}>
        <Text style={styles.label}>Total Cost</Text>
        <Text style={styles.big}>LKR {Math.round(cost)}</Text>
      </View>

      {/* PROFIT */}

      <View style={styles.card}>
        <Text style={styles.label}>Estimated Profit</Text>
        <Text style={styles.bigGreen}>LKR {Math.round(profit)}</Text>
      </View>

      {/* NPV */}

      <View style={styles.card}>
        <Text style={styles.label}>NPV (3 Year Projection)</Text>
        <Text style={styles.bigGreen}>LKR {Math.round(npv)}</Text>
      </View>

      {/* GAUGES */}

      <View style={styles.row}>
        <View style={styles.gauge}>
          <AnimatedCircularProgress
            size={80}
            width={10}
            fill={D * 100}
            tintColor="#4CAF50"
            backgroundColor="#eee"
          />
          <Text>Demand</Text>
        </View>

        <View style={styles.gauge}>
          <AnimatedCircularProgress
            size={80}
            width={10}
            fill={S * 100}
            tintColor="#f44336"
            backgroundColor="#eee"
          />
          <Text>Supply</Text>
        </View>
      </View>

      {/* BUTTONS */}

      {/* ✅ FIXED HERE — PASS DYNAMIC PARAMS */}

      <Pressable
        style={styles.btn}
        onPress={() =>
          router.push({
            pathname: "/(tabs)/yield-analytics",
            params: {
              spice: spice,
              quantity: quantity.toString(),
              farmerLocation: customer,
              profit: profit.toString(),
              revenue: revenue.toString(),
              cost: cost.toString(),
              margin: Math.round((profit / revenue) * 100).toString(),
            },
          })
        }
      >
        <Text style={styles.btnText}>Review Analytics Upon Completion</Text>
      </Pressable>

      <Pressable style={styles.backBtn} onPress={() => router.push("/")}>
        <Text style={styles.btnText}>Back to Dashboard</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f6f8f7",
  },

  title: {
    fontSize: 22,
    fontWeight: "700",
    marginTop: 40,
    marginBottom: 10,
  },

  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginTop: 10,
  },

  label: {
    color: "#666",
  },

  big: {
    fontSize: 24,
    fontWeight: "700",
  },

  bigGreen: {
    fontSize: 24,
    fontWeight: "700",
    color: "green",
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 20,
  },

  gauge: {
    alignItems: "center",
  },

  btn: {
    backgroundColor: "green",
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
  },

  backBtn: {
    backgroundColor: "#607d8b",
    padding: 16,
    borderRadius: 12,
    marginTop: 10,
  },

  summaryCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 14,
    marginTop: 10,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
  },

  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  summaryItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  summaryText: {
    fontSize: 14,
    fontWeight: "600",
  },

  btnText: {
    color: "white",
    textAlign: "center",
    fontWeight: "700",
  },
});
