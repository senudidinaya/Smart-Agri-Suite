import { StyleSheet } from "react-native";
export const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 28 },
  title: { fontSize: 20, fontWeight: "900", marginBottom: 6 },
  subtitle: { fontSize: 13, opacity: 0.85, marginBottom: 14, lineHeight: 18 },
  block: { marginTop: 12, backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: "#E2E8F0", padding: 12 },
  sectionTitle: { fontSize: 13, fontWeight: "900", marginBottom: 6 },
  text: { fontSize: 13, lineHeight: 18, opacity: 0.88 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: "#E2E8F0", padding: 12, marginBottom: 12 },
  cardTitle: { fontSize: 13, fontWeight: "900", marginBottom: 10 },
  row: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  badge: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, backgroundColor: "#2563EB", color: "#fff", fontWeight: "900", fontSize: 12 },
  badgeAlt: { backgroundColor: "#64748B" },
  modelName: { fontSize: 14, fontWeight: "900", marginBottom: 4 },
  modelText: { fontSize: 13, lineHeight: 18, opacity: 0.88 },
  divider: { height: 1, backgroundColor: "#F1F5F9", marginVertical: 12 },
  metrics: { marginTop: 10, gap: 4 },
  metric: { fontSize: 12, opacity: 0.85 }
});
