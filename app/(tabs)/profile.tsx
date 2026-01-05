import { StyleSheet, Text, View } from "react-native";
import { COLORS, RADIUS, SPACING } from "../theme";

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>👤</Text>
      </View>

      <Text style={styles.name}>Saman Kumara</Text>
      <Text style={styles.meta}>Matale District</Text>

      <View style={styles.card}>
        <Text>Language: Sinhala / English</Text>
        <Text>Alerts: Enabled</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.softBg,
    padding: SPACING.screen,
    alignItems: "center",
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: COLORS.card,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarText: { fontSize: 40 },
  name: { fontSize: 20, fontWeight: "700" },
  meta: { color: COLORS.textSub, marginBottom: 20 },
  card: {
    width: "100%",
    backgroundColor: COLORS.card,
    padding: SPACING.card,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
});
