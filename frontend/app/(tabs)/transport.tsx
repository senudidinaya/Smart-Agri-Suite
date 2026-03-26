import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, {
    FadeInDown,
    useAnimatedStyle,
    useSharedValue,
    withSpring
} from "react-native-reanimated";
import Svg, { Circle, Path } from "react-native-svg";

/* ---------------- TYPES ---------------- */
type VehicleType = "lorry" | "bike" | "shared";

/* ---------------- DATA ---------------- */
const VEHICLES: Record<
  VehicleType,
  {
    label: string;
    rate: number;
    time: number;
    icon: keyof typeof Ionicons.glyphMap;
  }
> = {
  lorry: {
    label: "Lorry",
    rate: 35,
    time: 45,
    icon: "car-outline",
  },
  bike: {
    label: "Motorbike",
    rate: 20,
    time: 25,
    icon: "bicycle-outline",
  },
  shared: {
    label: "Shared",
    rate: 15,
    time: 70,
    icon: "people-outline",
  },
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const useScaleAnimation = () => {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const onPressIn = () => {
    scale.value = withSpring(0.95);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };
  const onPressOut = () => {
    scale.value = withSpring(1);
  };
  return { style, onPressIn, onPressOut };
};

function ScalePressable({ children, style: customStyle, onPress, ...rest }: any) {
  const { style, onPressIn, onPressOut } = useScaleAnimation();
  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={[customStyle, style]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}


export default function LogisticsScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState<VehicleType>("lorry");

  const distanceKm = 12.4;
  const cost = Math.round(distanceKm * VEHICLES[selected].rate);
  
  const staggerDelay = 100;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <Animated.View style={styles.header} entering={FadeInDown.delay(staggerDelay * 1).springify()}>
        <Text style={styles.headerTitle}>Route & Logistics</Text>
        <Text style={styles.headerSub}>
          {distanceKm} km • Estimated delivery
        </Text>
      </Animated.View>

      {/* MAP SECTION (SAFE MOCK MAP) */}
      <Animated.View style={styles.mapContainer} entering={FadeInDown.delay(staggerDelay * 2).springify()}>
        <WebMockMap />
      </Animated.View>

      {/* Vehicle Selection */}
      <Animated.View style={styles.card} entering={FadeInDown.delay(staggerDelay * 3).springify()}>
        <Text style={styles.sectionTitle}>Choose Transport</Text>

        <View style={styles.vehicleRow}>
          {(Object.keys(VEHICLES) as VehicleType[]).map((v) => {
             const active = selected === v;
             
             return (
              <ScalePressable
                key={v}
                onPress={() => setSelected(v)}
                style={[styles.vehicleCard, active && styles.vehicleActive]}
              >
                <Ionicons
                  name={VEHICLES[v].icon}
                  size={28}
                  color={active ? "#10B981" : "#64748B"}
                />
                <Text
                  style={[
                    styles.vehicleText,
                    active && styles.vehicleTextActive,
                  ]}
                >
                  {VEHICLES[v].label}
                </Text>
                <Text style={styles.vehicleMeta}>{VEHICLES[v].time} min</Text>
              </ScalePressable>
            );
          })}
        </View>
      </Animated.View>

      {/* Summary */}
      <Animated.View style={styles.summary} entering={FadeInDown.delay(staggerDelay * 4).springify()}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Time</Text>
          <Text style={styles.summaryValue}>{VEHICLES[selected].time} min</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Distance</Text>
          <Text style={styles.summaryValue}>{distanceKm} km</Text>
        </View>
        <View style={[styles.summaryRow, { borderTopWidth: 1, borderColor: '#F1F5F9', paddingTop: 16, marginTop: 4 }]}>
          <Text style={styles.costLabel}>Estimated Cost</Text>
          <Text style={styles.cost}>LKR {cost.toLocaleString()}</Text>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(staggerDelay * 5).springify()}>
          <Pressable 
              style={({pressed}) => [styles.primaryButton, pressed && { opacity: 0.9, transform: [{scale: 0.98}] }]} 
              onPress={() => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  router.back();
              }}
          >
            <Text style={styles.primaryButtonText}>Confirm & Return</Text>
          </Pressable>
      </Animated.View>
      
      <View style={{height: 40}} />
    </ScrollView>
  );
}

/* ---------------- SAFE MOCK MAP ---------------- */
function WebMockMap() {
  return (
    <Svg width="100%" height="100%">
      <Path
        d="M40 40 C120 140, 220 60, 320 180"
        stroke="#10B981"
        strokeWidth={4}
        strokeDasharray="8,6"
        fill="none"
      />
      <Circle cx="40" cy="40" r="8" fill="#3B82F6" />
      <Circle cx="320" cy="180" r="8" fill="#EF4444" />
    </Svg>
  );
}

/* ---------------- STYLES ---------------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },

  header: {
    backgroundColor: "#10B981",
    padding: 24,
    paddingTop: 64,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: "#10B981",
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  headerTitle: { 
      fontSize: 28, 
      fontFamily: "Poppins_700Bold", 
      color: "#fff",
      letterSpacing: -0.5
  },
  headerSub: { 
      marginTop: 6, 
      color: "#D1FAE5",
      fontFamily: "Poppins_500Medium",
      fontSize: 15
  },

  mapContainer: {
    height: 260,
    margin: 16,
    marginTop: 24,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#EFF6FF",
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: "#64748b",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },

  card: {
    backgroundColor: "#fff",
    margin: 16,
    marginTop: 0,
    padding: 20,
    borderRadius: 24,
    shadowColor: "#64748b",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },

  sectionTitle: { 
      fontFamily: "Poppins_600SemiBold", 
      marginBottom: 16,
      fontSize: 18,
      color: "#0F172A"
  },

  vehicleRow: { flexDirection: "row", gap: 12 },
  
  vehicleCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: "transparent",
    alignItems: "center",
  },
  vehicleActive: {
    backgroundColor: "#ECFDF5",
    borderColor: "#10B981",
  },
  vehicleText: { 
      fontFamily: "Poppins_600SemiBold", 
      marginTop: 8,
      color: "#475569",
      fontSize: 14
  },
  vehicleTextActive: { color: "#10B981" },
  vehicleMeta: { 
      fontSize: 12, 
      color: "#64748B", 
      marginTop: 4,
      fontFamily: "Poppins_500Medium"
  },

  summary: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 24,
    shadowColor: "#64748b",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
    marginBottom: 8
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: 'center',
    paddingVertical: 8
  },
  summaryLabel: {
      fontFamily: "Poppins_500Medium",
      color: "#64748B",
      fontSize: 15,
  },
  summaryValue: {
      fontFamily: "Poppins_600SemiBold",
      color: "#1E293B",
      fontSize: 16,
  },
  costLabel: {
      fontFamily: "Poppins_700Bold",
      color: "#0F172A",
      fontSize: 16,
  },
  cost: { 
      fontFamily: "Poppins_700Bold", 
      color: "#10B981",
      fontSize: 20
  },

  primaryButton: {
    margin: 16,
    padding: 18,
    borderRadius: 16,
    backgroundColor: "#10B981",
    shadowColor: "#10B981",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  primaryButtonText: {
    color: "#fff",
    fontFamily: "Poppins_700Bold",
    textAlign: "center",
    fontSize: 16
  },
});
