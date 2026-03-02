import { StyleSheet } from "react-native";
export const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 28 },
  title: { fontSize: 22, fontWeight: "800", marginBottom: 8 },
  subtitle: { fontSize: 14, lineHeight: 20, opacity: 0.9, marginBottom: 14 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  card: { width: "48%", backgroundColor: "#FFFFFF", borderRadius: 16, padding: 12, borderWidth: 1, borderColor: "#E2E8F0" },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  cardTitle: { fontSize: 12, fontWeight: "700", opacity: 0.9 },
  cardValue: { fontSize: 13, fontWeight: "700" },
  sectionTitle: { marginTop: 16, marginBottom: 10, fontSize: 14, fontWeight: "800" },
  chipRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  chip: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, backgroundColor: "#FFFFFF" },
  chipDot: { width: 10, height: 10, borderRadius: 10 },
  chipText: { fontSize: 12, fontWeight: "700" },
  bullets: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 12, borderWidth: 1, borderColor: "#E2E8F0" },
  bullet: { fontSize: 13, lineHeight: 20, marginVertical: 2 },
  cta: { marginTop: 18, backgroundColor: "#2563EB", paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  ctaText: { color: "#FFFFFF", fontWeight: "800", fontSize: 14 }
});
