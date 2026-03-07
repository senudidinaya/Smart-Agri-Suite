import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { ScrollView, StyleSheet, Switch, Text, View } from "react-native";

export default function ProfileScreen() {
  /* ---------------- User Context (PP1-safe) ---------------- */
  const farmer = {
    name: "Eranga",
    role: "Spice Farmer",
    farm: "Family-owned Farm",
    experience: "8+ years",
  };

  const location = {
    province: "Central Province",
    city: "Matale",
  };

  /* ---------------- Preferences (State-driven) ---------------- */
  const [weatherAlerts, setWeatherAlerts] = useState(true);
  const [priceAlerts, setPriceAlerts] = useState(true);
  const [offlineMode, setOfflineMode] = useState(false);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Ionicons name="person-outline" size={28} color="#4CAF50" />
        </View>

        <Text style={styles.name}>{farmer.name}</Text>
        <Text style={styles.role}>{farmer.role}</Text>
      </View>

      {/* FARM INFO */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Farm Information</Text>

        <View style={styles.row}>
          <Ionicons name="leaf-outline" size={18} color="#4CAF50" />
          <Text style={styles.rowText}>{farmer.farm}</Text>
        </View>

        <View style={styles.row}>
          <Ionicons name="time-outline" size={18} color="#4CAF50" />
          <Text style={styles.rowText}>{farmer.experience}</Text>
        </View>
      </View>

      {/* LOCATION */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Location</Text>

        <View style={styles.row}>
          <Ionicons name="map-outline" size={18} color="#4CAF50" />
          <Text style={styles.rowText}>
            {location.city}, {location.province}
          </Text>
        </View>

        <Text style={styles.subNote}>
          Location affects demand, logistics cost, and market ranking.
        </Text>
      </View>

      {/* PREFERENCES */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Preferences</Text>

        <View style={styles.toggleRow}>
          <Text>Weather Alerts</Text>
          <Switch
            value={weatherAlerts}
            onValueChange={setWeatherAlerts}
            trackColor={{ true: "#c8e6c9" }}
            thumbColor={weatherAlerts ? "#4CAF50" : "#ccc"}
          />
        </View>

        <View style={styles.toggleRow}>
          <Text>Price Change Alerts</Text>
          <Switch
            value={priceAlerts}
            onValueChange={setPriceAlerts}
            trackColor={{ true: "#c8e6c9" }}
            thumbColor={priceAlerts ? "#4CAF50" : "#ccc"}
          />
        </View>

        <View style={styles.toggleRow}>
          <Text>Offline Mode</Text>
          <Switch
            value={offlineMode}
            onValueChange={setOfflineMode}
            trackColor={{ true: "#c8e6c9" }}
            thumbColor={offlineMode ? "#4CAF50" : "#ccc"}
          />
        </View>

        <Text style={styles.subNote}>
          Offline mode ensures access even without internet connectivity.
        </Text>
      </View>

      {/* FOOTER */}
      <Text style={styles.footer}>Smart Agri-Suite • PP1 Prototype</Text>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f6f8f7" },

  header: {
    alignItems: "center",
    paddingTop: 56,
    paddingBottom: 24,
  },
  avatar: {
    backgroundColor: "#e8f5e9",
    padding: 16,
    borderRadius: 40,
    marginBottom: 10,
  },
  name: { fontSize: 22, fontWeight: "700" },
  role: { color: "#777", marginTop: 4 },

  card: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 14,
    padding: 16,
    borderRadius: 18,
  },
  cardTitle: {
    fontWeight: "700",
    marginBottom: 12,
    fontSize: 15,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  rowText: { fontSize: 14 },

  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  subNote: {
    fontSize: 12,
    color: "#777",
    marginTop: 6,
  },

  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  statusText: { fontSize: 14 },

  footer: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 12,
    color: "#999",
  },
});
