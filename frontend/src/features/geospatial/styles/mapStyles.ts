import { StyleSheet } from "react-native";
export const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  topBar: { position: "absolute", top: 10, left: 12, right: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.92)", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: "rgba(226,232,240,0.9)" },
  topTitle: { fontSize: 13, fontWeight: "800" },
  toggle: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999 },
  toggleOn: { backgroundColor: "#16A34A" },
  toggleOff: { backgroundColor: "#64748B" },
  toggleText: { color: "#fff", fontWeight: "900", fontSize: 12 },
  rightPanel: { position: "absolute", top: 70, right: 12 },
  panel: { width: 160, backgroundColor: "rgba(255,255,255,0.94)", borderRadius: 16, padding: 12, borderWidth: 1, borderColor: "rgba(226,232,240,0.9)" },
  panelTitle: { fontSize: 12, fontWeight: "900", marginBottom: 8 },
  pillRow: { flexDirection: "row", gap: 8 },
  pill: { flex: 1, borderRadius: 999, paddingVertical: 8, alignItems: "center", borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#fff" },
  pillText: { fontSize: 12, fontWeight: "800" },
  panelHint: { marginTop: 10, fontSize: 11, lineHeight: 16, opacity: 0.8 },
  legendWrap: { position: "absolute", bottom: 18, left: 12 },
  legend: { backgroundColor: "rgba(255,255,255,0.92)", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: "rgba(226,232,240,0.9)" },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 8, marginVertical: 3 },
  legendSwatch: { width: 14, height: 14, borderRadius: 4 },
  legendText: { fontSize: 12, fontWeight: "800" }
});
