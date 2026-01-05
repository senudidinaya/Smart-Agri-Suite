import { useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

export default function ResultScreen() {
  const params = useLocalSearchParams();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Market Recommendation</Text>

      <Text style={styles.item}>Spice: {params.spice}</Text>
      <Text style={styles.item}>Region: {params.region}</Text>
      <Text style={styles.item}>Quantity (kg): {params.quantity}</Text>

      <Text style={styles.note}>Backend integration coming next…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, marginTop: 40 },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 25,
    textAlign: "center",
  },
  item: { fontSize: 16, marginBottom: 12 },
  note: { marginTop: 30, fontStyle: "italic", textAlign: "center" },
});
