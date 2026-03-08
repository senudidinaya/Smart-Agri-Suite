import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { loadMarketData } from "../lib/dataLoader";
import {
  calculateDemand,
  calculateSupply,
  getBasePrice,
} from "../lib/marketAnalytics";
import { calculatePrice } from "../lib/pricingEngine";
import { calculateProfit } from "../lib/profitEngine";
import { calculateTransportCost } from "../lib/transportEngine";

import { useOrders } from "../context/OrderContext";

type RegionKey = "Colombo" | "Kandy" | "Dambulla" | "Kurunegala";
type ModeKey = "Bike" | "Threewheel" | "Van" | "Lorry";

export default function InvoiceScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { addOrder } = useOrders();

  const spice = params.spice as string;
  const quantity = Number(params.quantity);
  const farmerLocation = params.farmerLocation as RegionKey;

  const [marketData, setMarketData] = useState<any[]>([]);
  const [customer, setCustomer] = useState<RegionKey>("Colombo");
  const [mode, setMode] = useState<ModeKey>("Van");

  useEffect(() => {
    async function init() {
      const data = await loadMarketData();
      setMarketData(data);
    }
    init();
  }, []);

  /* ---------------- SMART CALCULATIONS ---------------- */

  const pricing = useMemo(() => {
    if (!marketData.length) {
      return {
        Pf: 0,
        Ct: 0,
        total: 0,
        profit: 0,
        revenue: 0,
        cost: 0,
        distance: 0,
      };
    }

    const Pb = getBasePrice(spice, marketData);
    const D = calculateDemand(spice, marketData);
    const S = calculateSupply(spice, marketData);

    const Pf = calculatePrice(Pb, D, S);

    const transport = calculateTransportCost(farmerLocation, customer, mode);

    const Ct = transport.cost;
    const total = Pf * quantity + Ct;

    const baseCost = Pb * 0.6 * quantity;

    const profitData = calculateProfit(Pf, quantity, Ct, baseCost);

    return {
      Pf,
      Ct,
      total,
      profit: profitData.profit,
      revenue: profitData.revenue,
      cost: profitData.cost,
      distance: transport.distance,
    };
  }, [spice, quantity, farmerLocation, customer, mode, marketData]);

  /* ---------------- CONFIRM ORDER ---------------- */

  const handleConfirm = () => {
    const order = {
      id: `ORD-${Date.now()}`,
      spice,
      quantity,
      unitPrice: pricing.Pf,
      transportCost: pricing.Ct,
      productionCost: pricing.cost,
      revenue: pricing.revenue,
      totalCost: pricing.cost,
      profit: pricing.profit,
      customer,
      status: "PENDING" as const,
      createdAt: new Date().toISOString(),
    };

    addOrder(order);

    router.push("/(tabs)/farmer");
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Customer Invoice</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Spice</Text>
        <Text style={styles.value}>{spice}</Text>

        <Text style={styles.label}>Quantity</Text>
        <Text style={styles.value}>{quantity} kg</Text>

        <Text style={styles.label}>Farmer Location</Text>
        <Text style={styles.value}>{farmerLocation}</Text>
      </View>

      {/* CUSTOMER LOCATION */}

      <View style={styles.card}>
        <Text style={styles.section}>Customer Location</Text>

        <View style={styles.row}>
          {(["Colombo", "Kandy", "Dambulla", "Kurunegala"] as RegionKey[]).map(
            (r) => (
              <Pressable
                key={r}
                style={[styles.chip, customer === r && styles.activeChip]}
                onPress={() => setCustomer(r)}
              >
                <Text style={customer === r ? styles.activeText : undefined}>
                  {r}
                </Text>
              </Pressable>
            ),
          )}
        </View>
      </View>

      {/* TRANSPORT MODE */}

      <View style={styles.card}>
        <Text style={styles.section}>Transport Mode</Text>

        <View style={styles.row}>
          {(["Bike", "Threewheel", "Van", "Lorry"] as ModeKey[]).map((m) => (
            <Pressable
              key={m}
              style={[styles.chip, mode === m && styles.activeChip]}
              onPress={() => setMode(m)}
            >
              <Text style={mode === m ? styles.activeText : undefined}>
                {m}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* INVOICE SUMMARY */}

      <View style={styles.summary}>
        <Text>Distance: {pricing.distance} km</Text>
        <Text>Unit Price: LKR {Math.round(pricing.Pf)}</Text>
        <Text>Transport: LKR {Math.round(pricing.Ct)}</Text>
        <Text>Total: LKR {Math.round(pricing.total)}</Text>
        <Text style={styles.profit}>
          Profit: LKR {Math.round(pricing.profit)}
        </Text>
      </View>

      <Pressable style={styles.confirm} onPress={handleConfirm}>
        <Text style={styles.confirmText}>Confirm Order</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f6f8f7",
  },

  title: {
    fontSize: 22,
    fontWeight: "700",
    marginTop: 40,
  },

  card: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    marginTop: 10,
  },

  label: {
    fontSize: 12,
    color: "#666",
  },

  value: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
  },

  section: {
    fontWeight: "700",
    marginBottom: 6,
  },

  row: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  chip: {
    padding: 8,
    backgroundColor: "#ddd",
    borderRadius: 8,
    margin: 4,
  },

  activeChip: {
    backgroundColor: "green",
  },

  activeText: {
    color: "white",
  },

  summary: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
  },

  profit: {
    fontWeight: "700",
    color: "green",
  },

  confirm: {
    backgroundColor: "green",
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
  },

  confirmText: {
    color: "white",
    textAlign: "center",
    fontWeight: "700",
  },
});
