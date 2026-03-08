import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "../styles/overviewStyles";
import { useTheme } from "@/shared/theme/useTheme";

export function InfoCard({ title, value, icon }: { title: string; value: string; icon: any }) {
  const { colors } = useTheme();
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Ionicons name={icon} size={18} color={colors.primary} />
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      <Text style={styles.cardValue}>{value}</Text>
    </View>
  );
}
