import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { COLORS, RADIUS, SPACING } from "../theme";

export default function HomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>Ayubowan, Farmer 🌿</Text>
      <Text style={styles.subtitle}>
        Smart pricing decisions for higher profit
      </Text>

      {/* Weather */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🌤 Weather Snapshot</Text>
        <Text style={styles.cardText}>Matale • 29°C • Moderate humidity</Text>
      </View>

      {/* Your Spices */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Your Spices</Text>
        <Text style={styles.cardText}>Cinnamon • Pepper • Cloves</Text>
      </View>

      {/* Market Preview */}
      <View style={styles.cardHighlight}>
        <Text style={styles.cardTitle}>Market Insight</Text>
        <Text style={styles.cardText}>
          Dambulla market offers best net profit today considering transport.
        </Text>
      </View>

      <Pressable
        style={styles.primaryButton}
        onPress={() => router.push("/explore")}
      >
        <Text style={styles.primaryButtonText}>Find Best Market</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.softBg,
    padding: SPACING.screen,
  },
  greeting: { fontSize: 24, fontWeight: "700" },
  subtitle: { color: COLORS.textSub, marginBottom: 20 },
  card: {
    backgroundColor: COLORS.card,
    padding: SPACING.card,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  cardHighlight: {
    backgroundColor: "#E8F5E9",
    padding: SPACING.card,
    borderRadius: RADIUS.card,
    marginBottom: 24,
  },
  cardTitle: { fontWeight: "600", marginBottom: 4 },
  cardText: { color: COLORS.textSub },
  primaryButton: {
    backgroundColor: COLORS.accent,
    padding: 16,
    borderRadius: RADIUS.button,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
    textAlign: "center",
  },
});
