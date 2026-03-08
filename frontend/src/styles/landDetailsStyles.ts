import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16, gap: 12, backgroundColor: "white" },
    badge: { alignSelf: "flex-start", borderRadius: 999, paddingVertical: 10, paddingHorizontal: 14 },
    badgeText: { color: "white", fontWeight: "800" },
    title: { fontSize: 20, fontWeight: "900" },
    meta: { opacity: 0.7 },
    card: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 14, padding: 14 },
    cardTitle: { fontWeight: "800", marginBottom: 8 },
    label: { fontWeight: "700", opacity: 0.85 }});

export default styles;
