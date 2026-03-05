import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  interpolateColor,
} from "react-native-reanimated";
import { useLanguage } from "../../context/LanguageContext";

const { width } = Dimensions.get("window");

type TrackingStatus = "Confirmed" | "Dispatched" | "In Transit" | "Delivered";

const STATUS_STAGES: TrackingStatus[] = [
  "Confirmed",
  "Dispatched",
  "In Transit",
  "Delivered",
];

export default function TransportTracking() {
  const { t } = useLanguage();
  const [currentStatus, setCurrentStatus] = useState<TrackingStatus>("In Transit");
  
  // Progress animation value (0 to 1) representing the journey Matale -> Colombo
  const progress = useSharedValue(0.65); // 65% through the journey

  useEffect(() => {
    // Animate progress slightly to simulate real-time movement
    progress.value = withTiming(0.75, {
      duration: 5000,
      easing: Easing.inOut(Easing.ease),
    });
  }, []);

  const animatedRouteStyle = useAnimatedStyle(() => {
    return {
      width: `${progress.value * 100}%`,
      backgroundColor: interpolateColor(
        progress.value,
        [0, 1],
        ["#3B82F6", "#10B981"] // Blue to Green as it arrives
      ),
    };
  });

  const carStyle = useAnimatedStyle(() => {
    return {
      left: `${(progress.value * 100) - 5}%`, // Offset center of car
    };
  });

  const getStatusIcon = (status: TrackingStatus, index: number) => {
    const currentIndex = STATUS_STAGES.indexOf(currentStatus);
    const isCompleted = index <= currentIndex;
    const isActive = index === currentIndex;

    let iconName = "checkmark-circle";
    if (status === "Dispatched") iconName = "cube";
    if (status === "In Transit") iconName = "car";
    if (status === "Delivered") iconName = "home";

    return (
      <View style={{ alignItems: "center" }} key={status}>
        <View
          style={[
            styles.statusCircle,
            isCompleted && styles.statusCircleActive,
            isActive && styles.statusCircleCurrent,
          ]}
        >
          <Ionicons
            name={iconName as any}
            size={20}
            color={isCompleted ? "#fff" : "#94A3B8"}
          />
        </View>
        <Text
          style={[
            styles.statusTextLabel,
            isCompleted && styles.statusTextActive,
          ]}
        >
          {status}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* HEADER */}
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <Text style={styles.headerTitle}>{t("tracking")}</Text>
          <Text style={styles.headerSub}>Real-time delivery progress</Text>
        </Animated.View>

        {/* ORDER INFO CARD */}
        <Animated.View
          style={styles.card}
          entering={FadeInDown.delay(200).springify()}
        >
          <View style={styles.orderHeaderRow}>
            <View>
              <Text style={styles.orderId}>Order #ORD-8829</Text>
              <Text style={styles.spiceText}>{t("cinnamon")} - 250 {t("kg")}</Text>
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>{currentStatus}</Text>
            </View>
          </View>
        </Animated.View>

        {/* MAP VISUALIZATION CARD */}
        <Animated.View
          style={styles.card}
          entering={FadeInDown.delay(300).springify()}
        >
          <Text style={styles.sectionTitle}>Transport Route</Text>
          
          <View style={styles.routeHeader}>
             <View style={styles.routeEndpoint}>
                <Ionicons name="location" size={24} color="#EF4444" />
                <Text style={styles.endpointName}>Matale</Text>
                <Text style={styles.endpointSub}>Origin</Text>
             </View>
             
             <View style={styles.routeInfoCenter}>
                <Text style={styles.distanceText}>140 km</Text>
                <Text style={styles.etaText}>{t("eta")}: 2h 15m</Text>
             </View>

             <View style={styles.routeEndpoint}>
                <Ionicons name="flag" size={24} color="#10B981" />
                <Text style={styles.endpointName}>Colombo</Text>
                <Text style={styles.endpointSub}>Destination</Text>
             </View>
          </View>

          {/* ANIMATED ROUTE PROGRESS BAR */}
          <View style={styles.routeTrackContainer}>
            <View style={styles.routeTrackBackground} />
            <Animated.View style={[styles.routeTrackFill, animatedRouteStyle]} />
            <Animated.View style={[styles.carIconContainer, carStyle]}>
               <View style={styles.carShadow} />
               <Ionicons name="bus" size={26} color="#0F172A" style={{marginTop: -4}} />
            </Animated.View>
          </View>
          
          <View style={styles.vehicleInfo}>
             <Ionicons name="information-circle" size={16} color="#64748B" />
             <Text style={styles.vehicleText}>Transport Mode: <Text style={{fontFamily: 'Poppins_600SemiBold', color: '#0F172A'}}>Van (WP-BD432)</Text></Text>
          </View>

        </Animated.View>

        {/* STATUS LIFECYCLE TRACKER */}
        <Animated.View
          style={styles.card}
          entering={FadeInDown.delay(400).springify()}
        >
          <Text style={styles.sectionTitle}>Delivery Status</Text>
          
          <View style={styles.lifecycleContainer}>
             {/* Background Line */}
             <View style={styles.lifecycleLine} />
             {STATUS_STAGES.map((s, i) => getStatusIcon(s, i))}
          </View>
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  container: { padding: 16, paddingTop: 24 },
  
  headerTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 26,
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  headerSub: {
    color: "#64748B",
    fontSize: 15,
    fontFamily: "Poppins_400Regular",
    marginBottom: 20,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#64748b",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  
  orderHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  orderId: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 18,
    color: "#0F172A",
  },
  spiceText: {
    fontFamily: "Poppins_400Regular",
    color: "#64748B",
    fontSize: 14,
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    color: "#2563EB",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
  },

  sectionTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    color: "#1E293B",
    marginBottom: 16,
  },
  
  routeHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 30
  },
  routeEndpoint: {
      alignItems: 'center'
  },
  endpointName: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 14,
      color: "#0F172A",
      marginTop: 4
  },
  endpointSub: {
      fontFamily: "Poppins_400Regular",
      fontSize: 12,
      color: "#94A3B8"
  },
  routeInfoCenter: {
      alignItems: 'center',
      backgroundColor: '#F1F5F9',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16
  },
  distanceText: {
      fontFamily: "Poppins_700Bold",
      fontSize: 16,
      color: "#1E293B"
  },
  etaText: {
      fontFamily: "Poppins_500Medium",
      fontSize: 12,
      color: "#10B981"
  },

  routeTrackContainer: {
      height: 60,
      justifyContent: 'center',
      marginBottom: 10
  },
  routeTrackBackground: {
      height: 8,
      backgroundColor: '#E2E8F0',
      borderRadius: 4,
      width: '100%',
      position: 'absolute'
  },
  routeTrackFill: {
      height: 8,
      borderRadius: 4,
      position: 'absolute',
      left: 0
  },
  carIconContainer: {
      position: 'absolute',
      width: 40,
      height: 40,
      backgroundColor: '#fff',
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: "#000",
      shadowOpacity: 0.1,
      shadowRadius: 5,
      shadowOffset: { width: 0, height: 2 },
      elevation: 4,
      zIndex: 10
  },
  carShadow: {
      position: 'absolute',
      bottom: -6,
      width: 20,
      height: 4,
      backgroundColor: 'rgba(0,0,0,0.1)',
      borderRadius: 2
  },

  vehicleInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 8,
      backgroundColor: '#F8FAFC',
      padding: 10,
      borderRadius: 12
  },
  vehicleText: {
      fontFamily: "Poppins_400Regular",
      color: "#64748B",
      fontSize: 13,
      marginLeft: 6
  },

  lifecycleContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      position: 'relative',
      paddingTop: 10
  },
  lifecycleLine: {
      position: 'absolute',
      top: 30,
      left: 20,
      right: 20,
      height: 2,
      backgroundColor: '#E2E8F0',
      zIndex: 1
  },
  statusCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#F1F5F9',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 2,
      borderWidth: 2,
      borderColor: '#fff'
  },
  statusCircleActive: {
      backgroundColor: '#10B981',
  },
  statusCircleCurrent: {
      borderColor: '#A7F3D0',
      borderWidth: 4,
  },
  statusTextLabel: {
      fontFamily: "Poppins_500Medium",
      fontSize: 11,
      color: "#94A3B8",
      marginTop: 8,
      textAlign: "center",
      width: 60
  },
  statusTextActive: {
      color: "#0F172A",
      fontFamily: "Poppins_600SemiBold"
  }
});
