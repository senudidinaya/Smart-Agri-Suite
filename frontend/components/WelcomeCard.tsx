import React from "react";
import { useLanguage } from "../context/LanguageContext";
import { View, Text, StyleSheet, Dimensions, Pressable } from "react-native";
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";

const { width } = Dimensions.get("window");

export default function WelcomeCard() {
  const { t } = useLanguage();
  const scale = useSharedValue(1);
  const router = useRouter();

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressIn = () => {
    scale.value = withSpring(0.95);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const onPressOut = () => {
    scale.value = withSpring(1);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.push("/(tabs)/simulator");
  };

  return (
    <Animated.View style={styles.container} entering={FadeInDown.delay(100).springify()}>
        <View style={styles.headerRow}>
          <Text style={styles.greeting}>{String(t("welcomeToAgriSuite"))}</Text>
          <Text style={styles.subtext}>
            {String(t("platformDescription"))}
          </Text>
        </View>

        {/* FEATURE HIGHLIGHTS */}
        <View style={styles.featuresGrid}>
          {[
            { labelKey: "harvestPrice", icon: "leaf-outline", color: "#10B981" },
            { labelKey: "profitAnalyzerCard", icon: "analytics-outline", color: "#F59E0B" },
            { labelKey: "transportCard", icon: "car-outline", color: "#3B82F6" },
            { labelKey: "demandMapCard", icon: "map-outline", color: "#EF4444" },
            { labelKey: "seasonalCard", icon: "calendar-outline", color: "#8B5CF6" },
            { labelKey: "trackingCard", icon: "location-outline", color: "#6366F1" },
          ].map((f, i) => (
             <View key={i} style={styles.featureBadge}>
                <Ionicons name={f.icon as any} size={14} color={f.color} style={styles.featureIcon} />
                <Text style={styles.featureLabel}>{String(t(f.labelKey as any))}</Text>
             </View>
          ))}
        </View>

        {/* INTERACTIVE GUIDE */}
        <View style={styles.guideContainer}>
          <Text style={styles.guideTitle}>{String(t("howToStart"))}</Text>
          <View style={styles.guideSteps}>
             <Text style={styles.guideStep}><Text style={styles.stepNum}>1</Text> {String(t("step1"))}</Text>
             <Text style={styles.guideStep}><Text style={styles.stepNum}>2</Text> {String(t("step2"))}</Text>
             <Text style={styles.guideStep}><Text style={styles.stepNum}>3</Text> {String(t("step3"))}</Text>
             <Text style={styles.guideStep}><Text style={styles.stepNum}>4</Text> {String(t("step4"))}</Text>
          </View>
        </View>

        {/* CALL TO ACTION BUTTON */}
        <Animated.View style={[styles.btnWrapper, animatedButtonStyle]}>
          <Pressable 
            style={styles.startBtn}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
          >
            <Text style={styles.startBtnText}>{String(t("startExploring"))}</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </Pressable>
        </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: width - 32,
    alignSelf: 'center',
    marginBottom: 20,
    borderRadius: 24,
    backgroundColor: '#fff',
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    padding: 24,
  },
  headerRow: {
    marginBottom: 20,
  },
  greeting: {
    fontFamily: "Poppins_700Bold",
    fontSize: 22,
    color: "#0F172A",
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtext: {
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    color: "#475569",
    lineHeight: 22,
  },

  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 24,
  },
  featureBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  featureIcon: {
    marginRight: 6,
  },
  featureLabel: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11,
    color: "#334155",
  },

  guideContainer: {
    backgroundColor: "#F0FDF4",
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  guideTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: "#16A34A",
    marginBottom: 10,
  },
  guideSteps: {
    gap: 8,
  },
  guideStep: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
    color: "#334155",
  },
  stepNum: {
    backgroundColor: "#16A34A",
    color: "#fff",
    fontFamily: "Poppins_700Bold",
    fontSize: 11,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 8,
    overflow: "hidden",
  },

  btnWrapper: {
    alignSelf: "flex-start",
  },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10B981",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  startBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: "#fff",
  },
});
