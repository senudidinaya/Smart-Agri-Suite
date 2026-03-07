import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { fetchWeather } from "../../services/api";

export default function HomeScreen() {
  const router = useRouter();

  /* ---------------- Animations ---------------- */
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(20)).current;

  /* ---------------- Weather (API + fallback) ---------------- */
  const [weather, setWeather] = useState({
    temp: 28,
    condition: "Sunny",
    humidity: 65,
    source: "fallback",
  });

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

    fetchWeather("Matale", {
      temp: 28,
      condition: "Sunny",
      humidity: 65,
    }).then(setWeather);
  }, []);

  /* ---------------- Derived Intelligence ---------------- */
  const dryingAdvice =
    weather.humidity > 70
      ? "High humidity — avoid sun drying today"
      : "Ideal conditions for spice drying";

  const insightCards = [
    {
      title: "Market Pulse",
      value: "Dambulla ↑",
      note: "High demand today",
      icon: "trending-up-outline",
    },
    {
      title: "Logistics Tip",
      value: "Lower fuel cost",
      note: "Shorter routes favoured",
      icon: "bus-outline",
    },
    {
      title: "Weather Impact",
      value: weather.condition,
      note: dryingAdvice,
      icon: "partly-sunny-outline",
    },
  ];

  /* ---------------- Static Context (KEPT) ---------------- */
  const spices = [
    { name: "Cinnamon", local: "Kurundu", qty: "50 kg", icon: "leaf-outline" },
    {
      name: "Pepper",
      local: "Gammiris",
      qty: "120 kg",
      icon: "nutrition-outline",
    },
    { name: "Cardamom", local: "Enasal", qty: "15 kg", icon: "eco-outline" },
  ];

  const markets = [
    {
      name: "Dambulla Economic Center",
      price: 2450,
      trend: "+5%",
      positive: true,
    },
    {
      name: "Kandy Central Market",
      price: 2380,
      trend: "-2%",
      positive: false,
    },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* HEADER */}
      <Animated.View
        style={[
          styles.header,
          { opacity: fade, transform: [{ translateY: slide }] },
        ]}
      >
        <View>
          <Text style={styles.greeting}>Ayubowan, Farmer 🌱</Text>
          <Text style={styles.subGreeting}>
            Let’s find your best market today
          </Text>
        </View>

        <View style={styles.avatar}>
          <Ionicons name="person-outline" size={22} color="#4CAF50" />
        </View>
      </Animated.View>

      {/* WEATHER CARD (ENRICHED, NOT REDUCED) */}
      <View style={styles.weatherCard}>
        <Ionicons
          name={
            weather.condition === "Rain" ? "rainy-outline" : "sunny-outline"
          }
          size={28}
          color="#f9a825"
        />

        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.weatherTitle}>
            {weather.condition} • {weather.temp}°C
          </Text>
          <Text style={styles.weatherSub}>{dryingAdvice}</Text>
        </View>

        <View>
          <Text style={styles.humidity}>{weather.humidity}%</Text>
          <Text style={styles.location}>Matale</Text>
        </View>
      </View>

      {/* 🔥 FLASH INSIGHTS (DYNAMIC CONTENT) */}
      <Text style={styles.sectionTitle}>Today’s Insights</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.flashRow}
      >
        {insightCards.map((card) => (
          <View key={card.title} style={styles.flashCard}>
            <Ionicons name={card.icon as any} size={26} color="#4CAF50" />
            <Text style={styles.flashTitle}>{card.title}</Text>
            <Text style={styles.flashValue}>{card.value}</Text>
            <Text style={styles.flashNote}>{card.note}</Text>
          </View>
        ))}
      </ScrollView>

      {/* YOUR SPICES (UNCHANGED) */}
      <Text style={styles.sectionTitle}>Your Spices</Text>
      <View style={styles.spiceRow}>
        {spices.map((s) => (
          <View key={s.name} style={styles.spiceCard}>
            <Ionicons name={s.icon as any} size={26} color="#4CAF50" />
            <Text style={styles.spiceName}>{s.name}</Text>
            <Text style={styles.spiceLocal}>{s.local}</Text>
            <Text style={styles.spiceQty}>{s.qty}</Text>
          </View>
        ))}
      </View>

      {/* MARKET SNAPSHOT (UNCHANGED STRUCTURE) */}
      <Text style={styles.sectionTitle}>Market Prices</Text>
      {markets.map((m) => (
        <View key={m.name} style={styles.marketCard}>
          <View>
            <Text style={styles.marketName}>{m.name}</Text>
            <Text style={styles.marketDistance}>Nearby market</Text>
          </View>

          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.marketPrice}>LKR {m.price}/kg</Text>
            <Text
              style={[
                styles.trend,
                { color: m.positive ? "#2e7d32" : "#c62828" },
              ]}
            >
              {m.trend}
            </Text>
          </View>
        </View>
      ))}

      {/* SMART TIP (NOW CONTEXTUAL) */}
      <View style={styles.tipCard}>
        <Text style={styles.tipTitle}>Smart Tip</Text>
        <Text style={styles.tipText}>
          {weather.source === "api"
            ? "Live weather data is influencing market recommendations."
            : "Offline estimates are being used for stability."}
        </Text>
      </View>

      {/* CTA */}
      <Pressable
        style={styles.primaryButton}
        onPress={() => router.push("/explore")}
      >
        <Text style={styles.primaryButtonText}>Find Best Market</Text>
      </Pressable>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f6f8f7" },

  header: {
    padding: 24,
    paddingTop: 56,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greeting: { fontSize: 24, fontWeight: "700" },
  subGreeting: { color: "#777", marginTop: 4 },

  avatar: {
    backgroundColor: "#e8f5e9",
    padding: 10,
    borderRadius: 20,
  },

  weatherCard: {
    backgroundColor: "#fcfdfc",
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },

  weatherTitle: { fontWeight: "700" },
  weatherSub: { color: "#777", fontSize: 12 },
  humidity: { fontWeight: "800", fontSize: 16, textAlign: "right" },
  location: { fontSize: 12, color: "#777", textAlign: "right" },

  sectionTitle: {
    marginHorizontal: 16,
    marginTop: 12,
    fontSize: 16,
    fontWeight: "700",
  },

  flashRow: {
    paddingHorizontal: 16,
    gap: 12,
    marginTop: 10,
  },
  flashCard: {
    backgroundColor: "#f9fbfa",
    width: 180,
    padding: 14,
    borderRadius: 16,

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },

  flashTitle: { fontWeight: "700", marginTop: 6 },
  flashValue: { fontSize: 16, fontWeight: "800", marginTop: 4 },
  flashNote: { fontSize: 12, color: "#777", marginTop: 4 },

  spiceRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 12,
    marginTop: 10,
  },
  spiceCard: {
    backgroundColor: "#ffffff",
    flex: 1,
    padding: 14,
    borderRadius: 16,
    alignItems: "center",

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },

  spiceName: { fontWeight: "700", marginTop: 6 },
  spiceLocal: { fontSize: 12, color: "#4CAF50" },
  spiceQty: { fontSize: 12, color: "#777", marginTop: 4 },

  marketCard: {
    backgroundColor: "#ffffff",
    marginHorizontal: 16,
    marginTop: 10,
    padding: 14,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "space-between",

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },

  marketName: { fontWeight: "700" },
  marketDistance: { fontSize: 12, color: "#777" },
  marketPrice: { fontWeight: "800" },
  trend: { fontSize: 12, fontWeight: "700" },

  tipCard: {
    backgroundColor: "#4CAF50",
    margin: 16,
    padding: 18,
    borderRadius: 20,

    shadowColor: "#2e7d32",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },

  tipTitle: { color: "#fff", fontWeight: "700", marginBottom: 6 },
  tipText: { color: "#e0f2e9", fontSize: 13 },

  primaryButton: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#4CAF50",

    shadowColor: "#2e7d32",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },

  primaryButtonText: {
    textAlign: "center",
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});
