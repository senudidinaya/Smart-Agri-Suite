import { View, Text } from "react-native";
import { styles } from "../styles/overviewStyles";
import { useTheme } from "@/shared/theme/useTheme";

function Chip({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.chip, { borderColor: color }]}>
      <View style={[styles.chipDot, { backgroundColor: color }]} />
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

export function LegendChips() {
  const { colors } = useTheme();
  return (
    <View style={styles.chipRow}>
      <Chip label="Bare Land" color={colors.landBare} />
      <Chip label="Vegetation" color={colors.landVegetation} />
      <Chip label="Built-up" color={colors.landBuilt} />
    </View>
  );
}
