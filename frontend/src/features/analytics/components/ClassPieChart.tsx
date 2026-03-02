import { View, Dimensions } from "react-native";
import { PieChart } from "react-native-chart-kit";
import { ClassStats } from "../domain/types";
import { useTheme } from "@/shared/theme/useTheme";

export function ClassPieChart({ stats }: { stats: ClassStats }) {
  const { colors } = useTheme();
  const w = Math.min(Dimensions.get("window").width - 80, 360);
  return (
    <View>
      <PieChart
        width={w}
        height={220}
        accessor="population"
        backgroundColor="transparent"
        paddingLeft="14"
        data={[
          { name: "Bare", population: stats.bareHa, color: colors.landBare, legendFontColor: colors.text, legendFontSize: 12 },
          { name: "Veg", population: stats.vegetationHa, color: colors.landVegetation, legendFontColor: colors.text, legendFontSize: 12 },
          { name: "Built", population: stats.builtHa, color: colors.landBuilt, legendFontColor: colors.text, legendFontSize: 12 }
        ]}
        chartConfig={{ color: () => colors.text, labelColor: () => colors.text }}
        style={{ borderRadius: 16 }}
      />
    </View>
  );
}
