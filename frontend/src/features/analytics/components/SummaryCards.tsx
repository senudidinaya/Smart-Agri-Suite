import { View, Text } from "react-native";
import { ClassStats } from "../domain/types";
import { styles } from "../styles/analyticsStyles";
import { useTheme } from "@/shared/theme/useTheme";

function Card({ title, value, color }: { title: string; value: string; color: string }) {
  return (
    <View style={[styles.kpiCard, { borderLeftColor: color }]}>
      <Text style={styles.kpiTitle}>{title}</Text>
      <Text style={styles.kpiValue}>{value}</Text>
    </View>
  );
}

export function SummaryCards({ stats }: { stats: ClassStats }) {
  const { colors } = useTheme();
  return (
    <View style={styles.kpiGrid}>
      <Card title="Total Area" value={`${stats.totalHa.toFixed(1)} ha`} color={colors.primary} />
      <Card title="Bare Land" value={`${stats.bareHa.toFixed(1)} ha`} color={colors.landBare} />
      <Card title="Vegetation" value={`${stats.vegetationHa.toFixed(1)} ha`} color={colors.landVegetation} />
      <Card title="Built-up" value={`${stats.builtHa.toFixed(1)} ha`} color={colors.landBuilt} />
    </View>
  );
}
