import { View, Dimensions } from "react-native";
import { BarChart } from "react-native-chart-kit";
import { ClassStats } from "../domain/types";
import { useTheme } from "@/shared/theme/useTheme";

export function ClassBarChart({ stats }: { stats: ClassStats }) {
  const { colors } = useTheme();
  const w = Math.min(Dimensions.get("window").width - 80, 360);
  return (
    <View>
      <BarChart
        width={w}
        height={220}
        yAxisLabel=""
        yAxisSuffix="ha"
        fromZero
        data={{ labels: ["Bare", "Veg", "Built"], datasets: [{ data: [stats.bareHa, stats.vegetationHa, stats.builtHa] }] }}
        chartConfig={{
          backgroundGradientFrom: colors.surface,
          backgroundGradientTo: colors.surface,
          decimalPlaces: 0,
          color: () => colors.primary,
          labelColor: () => colors.text,
          propsForBackgroundLines: { stroke: colors.border }
        }}
        style={{ borderRadius: 16 }}
      />
    </View>
  );
}
