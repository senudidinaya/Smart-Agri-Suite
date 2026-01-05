import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { COLORS, RADIUS, SPACING } from "./theme";

type VehicleType = "lorry" | "bike" | "shared";

export default function LogisticsScreen() {
  const router = useRouter();
  const distanceKm = 12.4;

  const VEHICLES: Record<
    VehicleType,
    { label: string; rate: number; time: string }
  > = {
    lorry: { label: "Lorry", rate: 35, time: "45 min" },
    bike: { label: "Motorbike", rate: 20, time: "25 min" },
    shared: { label: "Shared", rate: 15, time: "1h 10m" },
  };

  const [selected, setSelected] = useState<VehicleType>("lorry");
  const cost = Math.round(distanceKm * VEHICLES[selected].rate);

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </Pressable>

        <Text style={styles.title}>Route & Logistics</Text>
        <Text style={styles.subtitle}>
          Distance: {distanceKm} km • Optimized route
        </Text>
      </View>

      {/* Map Preview (Fallback) */}
      <View style={styles.mapPreview}>
        <Svg width="100%" height="100%">
          <Path
            d="M40 40 C120 140, 220 60, 320 180"
            stroke={COLORS.accent}
            strokeWidth={4}
            strokeDasharray="8,6"
            fill="none"
          />
          <Circle cx="40" cy="40" r="8" fill="#1e88e5" />
          <Circle cx="320" cy="180" r="8" fill="#e53935" />
        </Svg>

        <View style={[styles.mapLabel, { top: 16, left: 16 }]}>
          <Text style={styles.mapLabelText}>Your Farm</Text>
        </View>
        <View style={[styles.mapLabel, { bottom: 16, right: 16 }]}>
          <Text style={styles.mapLabelText}>Dambulla Market</Text>
        </View>
      </View>

      {/* Vehicle Selection */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Transport Options</Text>

        <View style={styles.vehicleRow}>
          {(Object.keys(VEHICLES) as VehicleType[]).map((v) => {
            const active = selected === v;
            return (
              <Pressable
                key={v}
                onPress={() => setSelected(v)}
                style={[styles.vehicleCard, active && styles.vehicleActive]}
              >
                <Text
                  style={[
                    styles.vehicleLabel,
                    active && styles.vehicleLabelActive,
                  ]}
                >
                  {VEHICLES[v].label}
                </Text>
                <Text style={styles.vehicleMeta}>{VEHICLES[v].time}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Summary */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text>Total Time</Text>
          <Text style={styles.summaryValue}>{VEHICLES[selected].time}</Text>
        </View>

        <View style={styles.summaryRow}>
          <Text>Distance</Text>
          <Text style={styles.summaryValue}>{distanceKm} km</Text>
        </View>

        <View style={styles.summaryRow}>
          <Text>Estimated Cost</Text>
          <Text style={styles.cost}>LKR {cost}</Text>
        </View>
      </View>

      {/* CTA */}
      <Pressable style={styles.primaryButton}>
        <Text style={styles.primaryButtonText}>Start Navigation</Text>
      </Pressable>

      <Text style={styles.note}>
        * Live Google Maps navigation will be enabled in Phase 2.
      </Text>
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

  mapPreview: {
    height: 260,
    backgroundColor: "#EDF6FF",
    margin: 16,
    borderRadius: RADIUS.card,
    overflow: "hidden",
  },

  mapLabel: {
    position: "absolute",
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },

  mapLabelText: {
    fontSize: 12,
    fontWeight: "500",
  },

  card: {
    backgroundColor: COLORS.card,
    marginHorizontal: 16,
    padding: SPACING.card,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  sectionTitle: {
    fontWeight: "700",
    marginBottom: 12,
    fontSize: 16,
  },

  vehicleRow: {
    flexDirection: "row",
    gap: 10,
  },

  vehicleCard: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },

  vehicleActive: {
    backgroundColor: "#E8F5E9",
    borderColor: COLORS.accent,
  },

  vehicleLabel: {
    fontWeight: "600",
    color: COLORS.textMain,
  },

  vehicleLabelActive: {
    color: COLORS.primary,
  },

  vehicleMeta: {
    fontSize: 12,
    color: COLORS.textSub,
    marginTop: 4,
  },

  summaryCard: {
    backgroundColor: COLORS.card,
    margin: 16,
    padding: SPACING.card,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },

  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  summaryValue: {
    fontWeight: "600",
  },

  cost: {
    fontWeight: "800",
    color: COLORS.accent,
  },

  primaryButton: {
    marginHorizontal: 16,
    padding: 16,
    borderRadius: RADIUS.button,
    backgroundColor: COLORS.accent,
  },

  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
    textAlign: "center",
    fontSize: 16,
  },

  note: {
    textAlign: "center",
    fontSize: 12,
    color: COLORS.textSub,
    marginBottom: 20,
  },
});
