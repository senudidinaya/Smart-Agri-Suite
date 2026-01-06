import { StyleSheet, Text, View } from "react-native";

export default function LogisticsMap() {
  return (
    <View style={styles.container}>
      {/* Route Line */}
      <View style={styles.routeLine} />

      {/* Points */}
      <View style={[styles.point, styles.start]}>
        <Text style={styles.pointText}>Farm</Text>
      </View>

      <View style={[styles.point, styles.end]}>
        <Text style={styles.pointText}>Market</Text>
      </View>

      {/* Overlay */}
      <View style={styles.overlay}>
        <Text style={styles.title}>Route Preview</Text>
        <Text style={styles.sub}>12.4 km • ~45 mins</Text>
        <Text style={styles.note}>
          Live navigation available on Android app
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 240,
    backgroundColor: "#eef5fb",
    borderRadius: 20,
    margin: 16,
    overflow: "hidden",
  },

  routeLine: {
    position: "absolute",
    left: 40,
    right: 40,
    top: "50%",
    height: 3,
    backgroundColor: "#4CAF50",
    opacity: 0.6,
  },

  point: {
    position: "absolute",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  start: {
    left: 16,
    top: "45%",
    backgroundColor: "#1e88e5",
  },
  end: {
    right: 16,
    top: "45%",
    backgroundColor: "#e53935",
  },
  pointText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },

  overlay: {
    position: "absolute",
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: "#ffffff",
    padding: 12,
    borderRadius: 14,
    elevation: 4,
  },

  title: { fontWeight: "700" },
  sub: { marginTop: 4, color: "#2e7d32", fontWeight: "600" },
  note: { marginTop: 4, fontSize: 12, color: "#777" },
});
