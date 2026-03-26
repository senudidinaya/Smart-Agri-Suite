import { StyleSheet } from "react-native";
export const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 28 },
  title: { fontSize: 20, fontWeight: "900", marginBottom: 6 },
  subtitle: { fontSize: 13, opacity: 0.85, marginBottom: 14, lineHeight: 18 },
  stateText: { fontSize: 13, opacity: 0.8, marginVertical: 8 },
  block: { marginTop: 4 },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  kpiCard: { width: "48%", backgroundColor: "#FFFFFF", borderRadius: 16, padding: 12, borderWidth: 1, borderColor: "#E2E8F0", borderLeftWidth: 6 },
  kpiTitle: { fontSize: 12, fontWeight: "800", opacity: 0.85 },
  kpiValue: { fontSize: 16, fontWeight: "900", marginTop: 6 },
  chartRow: { marginTop: 12, gap: 12 },
  chartCard: { backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: "#E2E8F0", padding: 12 },
  insightCard: { marginTop: 12, backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: "#E2E8F0", padding: 12 },
  insightTitle: { fontSize: 13, fontWeight: "900", marginBottom: 6 },
  insightText: { fontSize: 13, lineHeight: 18, opacity: 0.88 }
});
