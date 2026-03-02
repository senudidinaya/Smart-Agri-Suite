import { View, Text } from "react-native";
import { useTheme } from "@/shared/theme/useTheme";
import { styles } from "../styles/mapStyles";

function Item({ label, color }: { label: string; color: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendSwatch, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

export function Legend() {
  const { colors } = useTheme();
  return (
    <View style={styles.legend}>
      <Item label="Bare Land" color={colors.landBare} />
      <Item label="Vegetation" color={colors.landVegetation} />
      <Item label="Built-up" color={colors.landBuilt} />
    </View>
  );
}
