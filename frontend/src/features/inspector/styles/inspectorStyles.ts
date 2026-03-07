import { StyleSheet } from "react-native";
export const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 28 },
  headerRow: { flexDirection: "row", gap: 10, alignItems: "center", marginBottom: 10 },
  classChip: { width: 12, height: 12, borderRadius: 6 },
  title: { fontSize: 16, fontWeight: "900" },
  subtitle: { fontSize: 12, opacity: 0.75, marginTop: 2 },
  actionBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: "#E2E8F0" },
  actionText: { fontSize: 12, fontWeight: "900" },
  loading: { marginTop: 10, fontSize: 13, opacity: 0.8 },
  group: { marginTop: 14 },
  groupTitle: { fontSize: 13, fontWeight: "900", marginBottom: 8 },
  groupCard: { backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: "#E2E8F0", overflow: "hidden" },
  row: { flexDirection: "row", padding: 12, borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  label: { fontSize: 13, fontWeight: "800" },
  hint: { fontSize: 11, opacity: 0.75, marginTop: 2, lineHeight: 14 },
  value: { fontSize: 13, fontWeight: "900" },
  unit: { fontSize: 11, opacity: 0.85 }
});
