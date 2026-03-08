import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useLanguage } from "../../context/LanguageContext";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const SPICE_TYPES = [
  { id: "cinnamon", icon: "🌿", color: "#8B4513" },
  { id: "pepper", icon: "🌑", color: "#333333" },
  { id: "cardamom", icon: "🍃", color: "#2E8B57" },
  { id: "clove", icon: "🍂", color: "#5D4037" },
  { id: "nutmeg", icon: "🌰", color: "#A0522D" },
];

const VEHICLES = [
  { id: "bike", icon: "motorcycle", label: "Bike", capacity: 50, cost: 20 },
  { id: "tuk", icon: "auto-fix", label: "TukTuk", capacity: 150, cost: 45 },
  { id: "lorry", icon: "bus", label: "Lorry", capacity: 1000, cost: 120 },
];

export default function HarvestSimulator() {
  const { t } = useLanguage();
  const [step, setStep] = useState(1);
  const [selectedSpice, setSelectedSpice] = useState(SPICE_TYPES[0].id);
  const [quantity, setQuantity] = useState(100);
  const [selectedVehicle, setSelectedVehicle] = useState(VEHICLES[1].id);
  const [isConfirmed, setIsConfirmed] = useState(false);

  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, [step]);

  const nextStep = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (step < 3) setStep(step + 1);
  };

  const prevStep = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step > 1) setStep(step - 1);
  };

  const handleConfirm = () => {
    // Logic: Validate vehicle capacity before confirming
    const vehicle = VEHICLES.find(v => v.id === selectedVehicle);
    if (vehicle && quantity > vehicle.capacity) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      alert(`Capacity Exceeded! The ${vehicle.label} can only carry ${vehicle.capacity}kg.`);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsConfirmed(true);
  };

  if (isConfirmed) {
    return (
      <SafeAreaView style={styles.confirmedContainer}>
        <View style={styles.successCard}>
          <View style={styles.checkWrap}>
            <Ionicons name="checkmark-circle" size={80} color="#10B981" />
          </View>
          <Text style={styles.confirmedTitle}>{t("orderConfirmedTitle") || "Order Confirmed!"}</Text>
          <Text style={styles.confirmedDesc}>
            {t("orderConfirmedDesc") || "Thank you for ordering with us. Your harvest simulation has been recorded and added to your dashboard for tracking. We're optimizing the best route for your delivery."}
          </Text>
          
          <Pressable 
            style={styles.doneButton}
            onPress={() => router.replace("/(tabs)/farmer")}
          >
            <Text style={styles.doneText}>{t("goToDashboard") || "Go to Dashboard"}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#0F172A" />
          </Pressable>
          <Text style={styles.title}>{t("simulateHarvest")}</Text>
        </View>

        {/* Progress Dots */}
        <View style={styles.progressRow}>
          {[1, 2, 3].map((s) => (
            <View 
              key={s} 
              style={[
                styles.dot, 
                step >= s && styles.dotActive,
                step === s && { width: 24, backgroundColor: "#F59E0B" }
              ]} 
            />
          ))}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
          
          {step === 1 && (
            <Animated.View style={{ transform: [{ scale: slideAnim }] }}>
              <Text style={styles.stepTitle}>{t("selectSpiceType")}</Text>
              <View style={styles.spiceGrid}>
                {SPICE_TYPES.map((s) => (
                  <Pressable 
                    key={s.id}
                    onPress={() => setSelectedSpice(s.id)}
                    style={[styles.spiceCard, selectedSpice === s.id && { borderColor: "#F59E0B", backgroundColor: "#FFFBEB" }]}
                  >
                    <Text style={{ fontSize: 32 }}>{s.icon}</Text>
                    <Text style={styles.spiceLabel}>{t(s.id as any)}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.stepTitle}>{t("harvestQuantity")} (kg)</Text>
              <View style={styles.qtyContainer}>
                {[50, 100, 250, 500].map((q) => (
                  <Pressable 
                    key={q}
                    onPress={() => setQuantity(q)}
                    style={[styles.qtyBtn, quantity === q && styles.qtyBtnActive]}
                  >
                    <Text style={[styles.qtyText, quantity === q && { color: "#fff" }]}>{q}kg</Text>
                  </Pressable>
                ))}
              </View>
            </Animated.View>
          )}

          {step === 2 && (
            <Animated.View style={{ transform: [{ translateX: Animated.multiply(slideAnim, 0) }] }}>
              <Text style={styles.stepTitle}>{t("selectLogistics")}</Text>
              {VEHICLES.map((v) => (
                <Pressable 
                  key={v.id}
                  onPress={() => setSelectedVehicle(v.id)}
                  style={[styles.vehicleCard, selectedVehicle === v.id && styles.vehicleActive]}
                >
                  <Ionicons name={v.icon as any} size={28} color={selectedVehicle === v.id ? "#F59E0B" : "#64748B"} />
                  <View style={{ flex: 1, marginLeft: 16 }}>
                    <Text style={styles.vLabel}>{v.label}</Text>
                    <Text style={styles.vSub}>Capacity: {v.capacity}kg</Text>
                  </View>
                  <Text style={styles.vCost}>LKR {v.cost}/km</Text>
                </Pressable>
              ))}
            </Animated.View>
          )}

          {step === 3 && (
            <Animated.View style={styles.summaryCard}>
              <Text style={[styles.stepTitle, { marginBottom: 12 }]}>{t("orderSummary")}</Text>
              
              <View style={styles.summaryRow}>
                <Text style={styles.sumLabel}>{t("spice")}</Text>
                <Text style={styles.sumValue}>{t(selectedSpice as any)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.sumLabel}>{t("quantity")}</Text>
                <Text style={styles.sumValue}>{quantity} kg</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.sumLabel}>{t("transport")}</Text>
                <Text style={styles.sumValue}>{VEHICLES.find(v => v.id === selectedVehicle)?.label}</Text>
              </View>
              
              <View style={styles.divider} />
              
              <View style={styles.summaryRow}>
                <Text style={[styles.sumLabel, { fontSize: 18, color: "#0F172A" }]}>{t("estimatedProfit")}</Text>
                <Text style={styles.totalValue}>LKR {quantity * 250}</Text>
              </View>
            </Animated.View>
          )}

        </ScrollView>

        {/* Bottom Nav */}
        <View style={styles.footer}>
          {step > 1 && (
            <Pressable onPress={prevStep} style={styles.backButton}>
              <Text style={styles.backButtonText}>{t("back")}</Text>
            </Pressable>
          )}
          <Pressable 
            onPress={step === 3 ? handleConfirm : nextStep} 
            style={[styles.nextButton, step === 1 && { width: "100%" }]}
          >
            <Text style={styles.nextText}>{step === 3 ? t("confirmOrder") : t("next")}</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  container: { flex: 1, padding: 20 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, fontFamily: "Poppins_700Bold", color: "#0F172A", marginLeft: 16 },
  
  progressRow: { flexDirection: "row", gap: 8, marginBottom: 30 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#E2E8F0" },
  dotActive: { backgroundColor: "#F59E0B" },

  stepTitle: { fontSize: 18, fontFamily: "Poppins_600SemiBold", color: "#0F172A", marginBottom: 16 },
  
  spiceGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 24 },
  spiceCard: { width: (screenWidth - 52) / 2, padding: 20, borderRadius: 20, borderWidth: 2, borderColor: "#F1F5F9", alignItems: "center" },
  spiceLabel: { fontSize: 14, fontFamily: "Poppins_600SemiBold", color: "#1E293B", marginTop: 8 },

  qtyContainer: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  qtyBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, backgroundColor: "#F1F5F9" },
  qtyBtnActive: { backgroundColor: "#0F172A" },
  qtyText: { fontFamily: "Poppins_600SemiBold", color: "#64748B" },

  vehicleCard: { flexDirection: "row", alignItems: "center", padding: 20, borderRadius: 20, borderWidth: 2, borderColor: "#F1F5F9", marginBottom: 12 },
  vehicleActive: { borderColor: "#F59E0B", backgroundColor: "#FFFBEB" },
  vLabel: { fontSize: 16, fontFamily: "Poppins_600SemiBold", color: "#1E293B" },
  vSub: { fontSize: 12, color: "#64748B" },
  vCost: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#0F172A" },

  summaryCard: { backgroundColor: "#F8FAFC", padding: 24, borderRadius: 24 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  sumLabel: { fontSize: 14, fontFamily: "Poppins_400Regular", color: "#64748B" },
  sumValue: { fontSize: 14, fontFamily: "Poppins_600SemiBold", color: "#0F172A" },
  divider: { height: 1, backgroundColor: "#E2E8F0", marginVertical: 8 },
  totalValue: { fontSize: 22, fontFamily: "Poppins_700Bold", color: "#16A34A" },

  footer: { position: "absolute", bottom: 20, left: 20, right: 20, flexDirection: "row", gap: 12 },
  nextButton: { flex: 1, backgroundColor: "#0F172A", height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  nextText: { color: "#fff", fontSize: 16, fontFamily: "Poppins_600SemiBold" },
  backButton: { flex: 1, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#E2E8F0" },
  backButtonText: { fontSize: 16, fontFamily: "Poppins_600SemiBold", color: "#64748B" },

  confirmedContainer: { flex: 1, backgroundColor: "#10B981", justifyContent: "center", padding: 20 },
  successCard: { backgroundColor: "#fff", padding: 32, borderRadius: 32, alignItems: "center" },
  checkWrap: { width: 100, height: 100, borderRadius: 50, backgroundColor: "#F0FDF4", alignItems: "center", justifyContent: "center", marginBottom: 24 },
  confirmedTitle: { fontSize: 24, fontFamily: "Poppins_700Bold", color: "#0F172A", marginBottom: 12 },
  confirmedDesc: { fontSize: 15, fontFamily: "Poppins_400Regular", color: "#64748B", textAlign: "center", lineHeight: 22, marginBottom: 30 },
  doneButton: { backgroundColor: "#0F172A", paddingVertical: 16, paddingHorizontal: 32, borderRadius: 16, width: "100%", alignItems: "center" },
  doneText: { color: "#fff", fontSize: 16, fontFamily: "Poppins_600SemiBold" },
});
