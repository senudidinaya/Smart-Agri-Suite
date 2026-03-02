import React, { useMemo } from "react";
import { View, Text } from "react-native";
import { useLocalSearchParams } from "expo-router";
import ConfidenceBar from "@/ConfidenceBar";
import styles from "../../src/styles/landDetailsStyles";

function badge(label: string) {
  if (label === "VEGETATION_LAND") return { emoji: "🌱", bg: "#16a34a", text: "Vegetation" };
  if (label === "IDLE_LAND") return { emoji: "🟤", bg: "#a16207", text: "Idle Land" };
  if (label === "BUILT_LAND") return { emoji: "🏢", bg: "#6b7280", text: "Built Land" };
  return { emoji: "❔", bg: "#2563eb", text: "Unknown" };
}

export default function LandDetailsScreen() {
  const params = useLocalSearchParams();

  const title = String(params.title ?? "Land Details");
  const label = String(params.label ?? "UNKNOWN");
  const confidence = Number(params.confidence ?? 0);
  const lat = String(params.lat ?? "");
  const lng = String(params.lng ?? "");

  const b = useMemo(() => badge(label), [label]);

  return (
    <View style={styles.container}>
      <View style={[styles.badge, { backgroundColor: b.bg }]}>
        <Text style={styles.badgeText}>
          {b.emoji} {b.text}
        </Text>
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.meta}>
        Lat: {lat} • Lng: {lng}
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Model Result</Text>
        <Text style={styles.label}>Class: {label}</Text>
        <ConfidenceBar label="Confidence" confidence={confidence} />
      </View>
    </View>
  );
}
