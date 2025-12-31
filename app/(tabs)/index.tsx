import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { colors } from "@/constants/colors";

export default function Home() {
  const summary = useMemo(
    () => ({
      region: "Kandy",
      spice: "Cinnamon",
      nextWeekDemandKg: 1531.6,
      predictedPrice: 2467.53,
      lastUpdated: "Today • 2:45 PM",
      alerts: [
        { title: "Restock Recommended", desc: "Cinnamon stock may run low in 3 days." },
        { title: "Festival Week Impact", desc: "Demand expected to increase this week." },
      ],
    }),
    []
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Smart-SGri</Text>
          <Text style={styles.subTitle}>Forecast & inventory insights for spices</Text>
        </View>
        <View style={styles.pill}>
          <Text style={styles.pillText}>{summary.lastUpdated}</Text>
        </View>
      </View>

      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Today’s Snapshot</Text>

        <View style={styles.heroRow}>
          <View style={styles.heroChip}>
            <Text style={styles.chipLabel}>Region</Text>
            <Text style={styles.chipValue}>{summary.region}</Text>
          </View>
          <View style={styles.heroChip}>
            <Text style={styles.chipLabel}>Spice</Text>
            <Text style={styles.chipValue}>{summary.spice}</Text>
          </View>
        </View>

        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Next Week Demand</Text>
            <Text style={styles.kpiValue}>{summary.nextWeekDemandKg.toLocaleString()}</Text>
            <Text style={styles.kpiUnit}>kg</Text>
          </View>

          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Predicted Price</Text>
            <Text style={styles.kpiValue}>
              {summary.predictedPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </Text>
            <Text style={styles.kpiUnit}>LKR/kg</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Alerts</Text>

        {summary.alerts.map((a, idx) => (
          <View key={idx} style={[styles.alertItem, idx > 0 && { marginTop: 10 }]}>
            <View style={styles.alertDot} />
            <View style={{ flex: 1 }}>
              <Text style={styles.alertTitle}>{a.title}</Text>
              <Text style={styles.alertDesc}>{a.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Quick Actions</Text>

        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.85}>
          <Text style={styles.actionText}>View AI Insights</Text>
          <Text style={styles.actionArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.85}>
          <Text style={styles.actionText}>Generate Range Forecast</Text>
          <Text style={styles.actionArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.85}>
          <Text style={styles.actionText}>Inventory & Restock Plan</Text>
          <Text style={styles.actionArrow}>›</Text>
        </TouchableOpacity>
      </View>

      
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 28 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  title: { fontSize: 26, fontWeight: "900", color: colors.text },
  subTitle: { marginTop: 6, color: colors.muted, fontWeight: "700" },

  pill: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
  },
  pillText: { color: colors.muted, fontWeight: "800", fontSize: 12 },

  hero: {
    marginTop: 14,
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroTitle: { fontSize: 14, fontWeight: "900", color: colors.text },

  heroRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  heroChip: {
    flex: 1,
    backgroundColor: colors.softGreen,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipLabel: { color: colors.muted, fontWeight: "800", fontSize: 12 },
  chipValue: { marginTop: 6, color: colors.darkGreen, fontWeight: "900", fontSize: 16 },

  kpiRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  kpiCard: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  kpiLabel: { color: colors.muted, fontWeight: "800", fontSize: 12 },
  kpiValue: { marginTop: 8, color: colors.text, fontWeight: "900", fontSize: 20, lineHeight: 24 },
  kpiUnit: { marginTop: 2, color: colors.muted, fontWeight: "800" },

  card: {
    marginTop: 14,
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { fontSize: 14, fontWeight: "900", color: colors.text, marginBottom: 10 },

  alertItem: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  alertDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.primary,
    marginTop: 4,
  },
  alertTitle: { color: colors.text, fontWeight: "900" },
  alertDesc: { marginTop: 4, color: colors.muted, fontWeight: "700", lineHeight: 18 },

  actionBtn: {
    backgroundColor: colors.bg,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  actionText: { color: colors.text, fontWeight: "900" },
  actionArrow: { color: colors.muted, fontWeight: "900", fontSize: 18 },

  tipBox: {
    marginTop: 14,
    backgroundColor: colors.softGreen,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tipTitle: { fontWeight: "900", color: colors.darkGreen },
  tipText: { marginTop: 6, color: colors.darkGreen, lineHeight: 18, fontWeight: "700" },
});
