import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
    wrap: { gap: 6, marginTop: 8 },
    row: { flexDirection: "row", justifyContent: "space-between" },
    label: { fontWeight: "700" },
    pct: { fontWeight: "700", opacity: 0.8 },
    track: {
        height: 10,
        backgroundColor: "#e5e7eb",
        borderRadius: 999,
        overflow: "hidden"},
    fill: { height: "100%", backgroundColor: "#2563eb" }});

export default styles;
