import { StyleSheet, Text, View } from "react-native";
import { COLORS, RADIUS, SPACING } from "../theme";

export default function AlertsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Alerts</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>🌧 Weather Alert</Text>
        <Text style={styles.cardText}>
          Heavy rain expected in Central Province tomorrow.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>📉 Price Update</Text>
        <Text style={styles.cardText}>
          Pepper prices dropped 4% in Kandy market.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.softBg,
    padding: SPACING.screen,
  },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 16 },
  card: {
    backgroundColor: COLORS.card,
    padding: SPACING.card,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  cardTitle: { fontWeight: "600", marginBottom: 4 },
  cardText: { color: COLORS.textSub },
});
