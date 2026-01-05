import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { COLORS, RADIUS, SPACING } from "../theme";

export default function MarketScreen() {
  const router = useRouter();

  const [spice, setSpice] = useState("Cinnamon");
  const [quantity, setQuantity] = useState("50");
  const [location, setLocation] = useState("Matale District");

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Market Analysis</Text>
      <Text style={styles.subtitle}>
        Enter harvest details to optimize your profit
      </Text>

      {/* Spice */}
      <View style={styles.card}>
        <Text style={styles.label}>Spice</Text>
        <TextInput
          value={spice}
          onChangeText={setSpice}
          placeholder="Enter spice (e.g. Cinnamon)"
          style={styles.input}
        />
      </View>

      {/* Quantity */}
      <View style={styles.card}>
        <Text style={styles.label}>Quantity (kg)</Text>
        <TextInput
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="numeric"
          placeholder="Enter quantity"
          style={styles.input}
        />
      </View>

      {/* Location */}
      <View style={styles.card}>
        <Text style={styles.label}>Location</Text>
        <TextInput
          value={location}
          onChangeText={setLocation}
          placeholder="Enter your district"
          style={styles.input}
        />
      </View>

      {/* Demand Hint */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>📊 Market Hint</Text>
        <Text style={styles.infoText}>
          Cinnamon demand is currently <Text style={styles.bold}>High</Text> in
          Central Province markets.
        </Text>
      </View>

      {/* CTA */}
      <Pressable
        style={styles.primaryButton}
        onPress={() =>
          router.push({
            pathname: "/insights",
            params: {
              spice,
              quantity,
              region: location,
            },
          })
        }
      >
        <Text style={styles.primaryButtonText}>Generate Insights</Text>
      </Pressable>
    </View>
  );
}

/* =========================
   STYLES
   ========================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.softBg,
    padding: SPACING.screen,
  },

  title: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.textMain,
    marginBottom: 4,
  },

  subtitle: {
    color: COLORS.textSub,
    marginBottom: 20,
  },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.card,
    padding: SPACING.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
  },

  label: {
    fontSize: 12,
    color: COLORS.textSub,
    marginBottom: 6,
  },

  input: {
    fontSize: 15,
    paddingVertical: 6,
    color: COLORS.textMain,
  },

  infoCard: {
    backgroundColor: "#E8F5E9",
    padding: 14,
    borderRadius: RADIUS.card,
    marginTop: 10,
    marginBottom: 20,
  },

  infoTitle: {
    fontWeight: "600",
    marginBottom: 4,
    color: COLORS.primary,
  },

  infoText: {
    color: COLORS.textMain,
    fontSize: 14,
  },

  bold: {
    fontWeight: "700",
  },

  primaryButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: 16,
    borderRadius: RADIUS.button,
  },

  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
    textAlign: "center",
    fontSize: 16,
  },
});
