import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

/* ---------------- TYPES ---------------- */
type VehicleType = "lorry" | "bike" | "shared";

/* ---------------- DATA ---------------- */
const VEHICLES: Record<
  VehicleType,
  {
    label: string;
    rate: number;
    time: number;
    icon: keyof typeof Ionicons.glyphMap;
  }
> = {
  lorry: {
    label: "Lorry",
    rate: 35,
    time: 45,
    icon: "car-outline",
  },
  bike: {
    label: "Motorbike",
    rate: 20,
    time: 25,
    icon: "bicycle-outline",
  },
  shared: {
    label: "Shared",
    rate: 15,
    time: 70,
    icon: "people-outline",
  },
};

export default function LogisticsScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState<VehicleType>("lorry");

  const distanceKm = 12.4;
  const cost = Math.round(distanceKm * VEHICLES[selected].rate);

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Route & Logistics</Text>
        <Text style={styles.headerSub}>
          {distanceKm} km • Estimated delivery
        </Text>
      </View>

      {/* MAP SECTION (SAFE MOCK MAP) */}
      <View style={styles.mapContainer}>
        <WebMockMap />
      </View>

      {/* Vehicle Selection */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Choose Transport</Text>

        <View style={styles.vehicleRow}>
          {(Object.keys(VEHICLES) as VehicleType[]).map((v) => {
            const active = selected === v;
            return (
              <Pressable
                key={v}
                onPress={() => setSelected(v)}
                style={[styles.vehicleCard, active && styles.vehicleActive]}
              >
                <Ionicons
                  name={VEHICLES[v].icon}
                  size={26}
                  color={active ? "#2e7d32" : "#777"}
                />
                <Text
                  style={[
                    styles.vehicleText,
                    active && styles.vehicleTextActive,
                  ]}
                >
                  {VEHICLES[v].label}
                </Text>
                <Text style={styles.vehicleMeta}>{VEHICLES[v].time} min</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Summary */}
      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <Text>Total Time</Text>
          <Text>{VEHICLES[selected].time} min</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text>Distance</Text>
          <Text>{distanceKm} km</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text>Estimated Cost</Text>
          <Text style={styles.cost}>LKR {cost}</Text>
        </View>
      </View>

      <Pressable style={styles.primaryButton} onPress={() => router.back()}>
        <Text style={styles.primaryButtonText}>Confirm & Return</Text>
      </Pressable>
    </ScrollView>
  );
}

/* ---------------- SAFE MOCK MAP ---------------- */
function WebMockMap() {
  return (
    <Svg width="100%" height="100%">
      <Path
        d="M40 40 C120 140, 220 60, 320 180"
        stroke="#4CAF50"
        strokeWidth={4}
        strokeDasharray="8,6"
        fill="none"
      />
      <Circle cx="40" cy="40" r="8" fill="#1e88e5" />
      <Circle cx="320" cy="180" r="8" fill="#e53935" />
    </Svg>
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
  headerTitle: { fontSize: 24, fontWeight: "700", color: "#fff" },
  headerSub: { marginTop: 6, color: "#e0f2e9" },

  mapContainer: {
    height: 260,
    margin: 16,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#eef5fb",
  },

  card: {
    backgroundColor: "#fdfefe",
    margin: 16,
    padding: 16,
    borderRadius: 18,
  },

  sectionTitle: { fontWeight: "700", marginBottom: 12 },

  vehicleRow: { flexDirection: "row", gap: 10 },
  vehicleCard: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
  },
  vehicleActive: {
    backgroundColor: "#e8f5e9",
    borderColor: "#4CAF50",
  },
  vehicleText: { fontWeight: "600", marginTop: 6 },
  vehicleTextActive: { color: "#2e7d32" },
  vehicleMeta: { fontSize: 12, color: "#777", marginTop: 4 },

  summary: {
    backgroundColor: "#fdfefe",
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 18,
    gap: 10,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cost: { fontWeight: "800", color: "#2e7d32" },

  primaryButton: {
    margin: 16,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#4CAF50",
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
    textAlign: "center",
  },
});
