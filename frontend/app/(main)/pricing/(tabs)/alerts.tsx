import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useRef } from "react";
import { Animated, ScrollView, StyleSheet, Text, View } from "react-native";

type AlertType = "weather" | "price" | "route";

const ALERTS = [
  {
    id: 1,
    type: "weather" as AlertType,
    title: "Heavy Rain Expected",
    message:
      "Monsoon showers expected in Matale tomorrow. Avoid sun drying spices.",
    time: "2 hours ago",
  },
  {
    id: 2,
    type: "price" as AlertType,
    title: "Price Drop Alert",
    message: "Pepper prices dropped by 5% in Kandy market due to oversupply.",
    time: "5 hours ago",
  },
  {
    id: 3,
    type: "route" as AlertType,
    title: "Route Delay",
    message:
      "A9 road construction near Naula. Expect ~20 min additional travel time.",
    time: "1 day ago",
  },
];

const ICONS: Record<AlertType, string> = {
  weather: "rainy-outline",
  price: "trending-down-outline",
  route: "alert-circle-outline",
};

const COLORS: Record<AlertType, string> = {
  weather: "#1e88e5",
  price: "#e53935",
  route: "#f57c00",
};

export default function AlertsScreen() {
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slide, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>Alerts & Updates</Text>
        <Text style={styles.subtitle}>
          Stay informed. Make better decisions.
        </Text>
      </View>

      {/* ALERT LIST */}
      {ALERTS.map((alert, index) => (
        <Animated.View
          key={alert.id}
          style={[
            styles.alertCard,
            {
              opacity: fade,
              transform: [{ translateY: slide }],
              borderLeftColor: COLORS[alert.type],
            },
          ]}
        >
          <View style={styles.iconWrap}>
            <Ionicons
              name={ICONS[alert.type] as any}
              size={24}
              color={COLORS[alert.type]}
            />
          </View>

          <View style={styles.alertContent}>
            <View style={styles.alertHeader}>
              <Text style={styles.alertTitle}>{alert.title}</Text>
              <Text style={styles.time}>{alert.time}</Text>
            </View>

            <Text style={styles.message}>{alert.message}</Text>
          </View>
        </Animated.View>
      ))}

      <Text style={styles.footerNote}>You’re all caught up 🌱</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f6f8f7" },

  header: {
    padding: 24,
    paddingTop: 56,
  },
  title: { fontSize: 24, fontWeight: "700" },
  subtitle: { color: "#777", marginTop: 4 },

  alertCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 16,
    borderLeftWidth: 4,
  },
  iconWrap: {
    marginRight: 12,
    marginTop: 4,
  },
  alertContent: { flex: 1 },

  alertHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  alertTitle: { fontWeight: "700" },
  time: { fontSize: 12, color: "#777" },

  message: { color: "#555", marginTop: 2 },

  footerNote: {
    textAlign: "center",
    marginVertical: 24,
    color: "#999",
    fontSize: 12,
  },
});
