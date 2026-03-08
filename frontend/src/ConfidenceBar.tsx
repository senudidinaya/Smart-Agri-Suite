import { SafeAreaView } from "react-native-safe-area-context";
import React from "react";
import { View, Text } from "react-native";
import styles from "./styles/confidenceBarStyles";

function clamp01(n: number) {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

export default function ConfidenceBar({
  label,
  confidence}: {
  label: string;
  confidence: number;
}) {
  const v = clamp01(confidence);

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.pct}>{(v * 100).toFixed(1)}%</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${v * 100}%` }]} />
      </View>
    </View>
  );
}
