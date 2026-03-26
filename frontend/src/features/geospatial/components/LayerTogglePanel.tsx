import { View, Text, Pressable } from "react-native";
import { styles } from "../styles/mapStyles";
import { useTheme } from "@/shared/theme/useTheme";

export function LayerTogglePanel({ basemap, onBasemapChange }: { basemap: "google" | "default"; onBasemapChange: (b: "google" | "default") => void; }) {
  const { colors } = useTheme();
  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Basemap</Text>
      <View style={styles.pillRow}>
        <Pressable onPress={() => onBasemapChange("google")} style={[styles.pill, basemap === "google" && { backgroundColor: colors.primary }]}>
          <Text style={[styles.pillText, basemap === "google" && { color: "#fff" }]}>Streets</Text>
        </Pressable>
        <Pressable onPress={() => onBasemapChange("default")} style={[styles.pill, basemap === "default" && { backgroundColor: colors.primary }]}>
          <Text style={[styles.pillText, basemap === "default" && { color: "#fff" }]}>Default</Text>
        </Pressable>
      </View>
      <Text style={styles.panelHint}>Overlay tiles URL is configurable (PP1 mocked; PP2 tile service).</Text>
    </View>
  );
}
