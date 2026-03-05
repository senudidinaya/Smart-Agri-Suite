import { SafeAreaView } from "react-native-safe-area-context";
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withSpring, FadeIn } from "react-native-reanimated";
import Svg, { Path, G } from "react-native-svg";
import { router } from "expo-router";
import { useLanguage } from "../../context/LanguageContext";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const useScaleAnimation = () => {
    const scale = useSharedValue(1);
    const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
    const onPressIn = () => { scale.value = withSpring(0.95); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); };
    const onPressOut = () => scale.value = withSpring(1);
    return { style, onPressIn, onPressOut };
};

type DemandLevel = "VERY_HIGH" | "HIGH" | "MEDIUM" | "LOW";

const COLORS = {
  VERY_HIGH: "#EF4444", // Red
  HIGH: "#F59E0B",      // Orange
  MEDIUM: "#10B981",    // Green
  LOW: "#94A3B8",       // Slate
};

const DEMAND_DATA: Record<string, Record<string, DemandLevel>> = {
  Cinnamon: { Colombo: "VERY_HIGH", Kandy: "HIGH", Matale: "MEDIUM", Galle: "HIGH", Dambulla: "LOW", Kurunegala: "MEDIUM", Anuradhapura: "LOW" },
  Pepper: { Colombo: "HIGH", Kandy: "VERY_HIGH", Matale: "HIGH", Galle: "MEDIUM", Dambulla: "MEDIUM", Kurunegala: "LOW", Anuradhapura: "LOW" },
  Cardamom: { Colombo: "HIGH", Kandy: "HIGH", Matale: "VERY_HIGH", Galle: "LOW", Dambulla: "LOW", Kurunegala: "MEDIUM", Anuradhapura: "LOW" },
  Clove: { Colombo: "MEDIUM", Kandy: "HIGH", Matale: "HIGH", Galle: "MEDIUM", Dambulla: "VERY_HIGH", Kurunegala: "MEDIUM", Anuradhapura: "LOW" },
  Nutmeg: { Colombo: "HIGH", Kandy: "MEDIUM", Matale: "LOW", Galle: "VERY_HIGH", Dambulla: "LOW", Kurunegala: "HIGH", Anuradhapura: "MEDIUM" },
};

const DISTRICT_PATHS = {
  Anuradhapura: "M 40 20 Q 50 10 60 20 Q 60 40 50 50 Q 40 40 40 20 Z",
  Kurunegala: "M 30 50 Q 50 60 40 80 Q 20 80 30 50 Z",
  Dambulla: "M 50 50 Q 60 40 70 50 Q 60 70 50 50 Z",
  Matale: "M 60 70 Q 70 60 80 70 Q 70 90 60 70 Z",
  Kandy: "M 50 80 Q 60 70 70 90 Q 50 100 50 80 Z",
  Colombo: "M 20 90 Q 30 90 30 110 Q 15 110 20 90 Z",
  Galle: "M 30 120 Q 50 110 40 140 Q 25 130 30 120 Z"
};

const REGION_STATS: any = {
    Colombo: { price: "2300", potential: "High logistics margin" },
    Kandy: { price: "2150", potential: "Premium organic demand" },
    Matale: { price: "1950", potential: "Base producer zone" },
    Galle: { price: "2200", potential: "Export processing hub" },
    Dambulla: { price: "1850", potential: "High bulk supply" },
    Kurunegala: { price: "1900", potential: "Stable local demand" },
    Anuradhapura: { price: "1750", potential: "Exploring new markets" }
};

export default function SriLankaDemandMap() {
  const { t } = useLanguage();
  const [selectedSpice, setSelectedSpice] = useState("Cinnamon");
  const [selectedRegion, setSelectedRegion] = useState<string>("Colombo");

  const spices = ["Cinnamon", "Pepper", "Cardamom", "Clove", "Nutmeg"];
  const currentData = DEMAND_DATA[selectedSpice];
  
  // Calculate dynamic insights
  const highestRegion = Object.keys(currentData).find(r => currentData[r] === "VERY_HIGH") || "Colombo";

  const handleRegionPress = (region: string) => {
      setSelectedRegion(region);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* HEADER */}
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <Text style={styles.headerTitle}>{t("demand" as any) || "Demand Map"}</Text>
          <Text style={styles.headerSub}>Sri Lanka Regional Intelligence</Text>
        </Animated.View>

        {/* SPICE SELECTOR */}
        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            {spices.map((spice) => {
              const { style, onPressIn, onPressOut } = useScaleAnimation();
              const isSelected = selectedSpice === spice;
              return (
                <AnimatedPressable
                  key={spice}
                  onPress={() => setSelectedSpice(spice)}
                  onPressIn={onPressIn}
                  onPressOut={onPressOut}
                  style={[
                    styles.chip,
                    isSelected && styles.chipActive,
                    style
                  ]}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                    {t(spice.toLowerCase() as any)}
                  </Text>
                </AnimatedPressable>
              );
            })}
          </ScrollView>
        </Animated.View>

        {/* MAP VISUALIZATION */}
        <Animated.View style={styles.mapCard} entering={FadeInDown.delay(300).springify()}>
          <Text style={styles.sectionTitle}>Interactive Geo-Tracker</Text>
          
          <View style={styles.mapContentRow}>
              {/* SVG Map Area */}
              <View style={styles.svgContainer}>
                  <Svg height="250" width="100" viewBox="0 8 100 140">
                      <G>
                          {Object.keys(DISTRICT_PATHS).map((region) => {
                              const level = currentData[region] || "LOW";
                              const color = COLORS[level];
                              const isSelected = selectedRegion === region;
                              return (
                                  <Path
                                      key={region}
                                      d={(DISTRICT_PATHS as any)[region]}
                                      fill={color}
                                      stroke={isSelected ? "#000" : "#fff"}
                                      strokeWidth={isSelected ? "1.5" : "1"}
                                      onPress={() => handleRegionPress(region)}
                                  />
                              )
                          })}
                      </G>
                  </Svg>
                  <Text style={styles.mapHelperText}>Tap regions to inspect</Text>
              </View>

              {/* Interaction Details Panel */}
              <Animated.View entering={FadeIn} key={selectedRegion} style={styles.regionPanel}>
                  <Text style={styles.regionPanelTitle}>{selectedRegion}</Text>
                  <View style={[styles.demandBadge, {backgroundColor: `${COLORS[currentData[selectedRegion]]}20`}]}>
                      <Text style={[styles.demandBadgeText, {color: COLORS[currentData[selectedRegion]]}]}>
                          {currentData[selectedRegion].replace('_', ' ')}
                      </Text>
                  </View>
                  
                  <View style={styles.statBox}>
                      <Text style={styles.statLabel}>Avg Price</Text>
                      <Text style={styles.statValue}>LKR {REGION_STATS[selectedRegion].price}/kg</Text>
                  </View>
                  
                  <View style={styles.statBox}>
                      <Text style={styles.statLabel}>Market Profile</Text>
                      <Text style={styles.statDesc}>{REGION_STATS[selectedRegion].potential}</Text>
                  </View>

                  <Pressable 
                      style={({pressed}) => [styles.actionBtn, pressed && {opacity: 0.8}]}
                      onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          router.push({
                              pathname: "/(tabs)/route-planner",
                              params: {
                                  destination: selectedRegion,
                                  spice: selectedSpice,
                                  price: REGION_STATS[selectedRegion].price
                              }
                          });
                      }}
                  >
                      <Text style={styles.actionBtnText}>Plan Route Here</Text>
                      <Ionicons name="arrow-forward" size={14} color="#fff" style={{marginLeft: 4}}/>
                  </Pressable>
              </Animated.View>
          </View>
          
          <View style={styles.legendRow}>
              <View style={styles.legendItem}><View style={[styles.legendDot, {backgroundColor: COLORS.VERY_HIGH}]}/><Text style={styles.legendText}>Very High</Text></View>
              <View style={styles.legendItem}><View style={[styles.legendDot, {backgroundColor: COLORS.HIGH}]}/><Text style={styles.legendText}>High</Text></View>
              <View style={styles.legendItem}><View style={[styles.legendDot, {backgroundColor: COLORS.MEDIUM}]}/><Text style={styles.legendText}>Medium</Text></View>
              <View style={styles.legendItem}><View style={[styles.legendDot, {backgroundColor: COLORS.LOW}]}/><Text style={styles.legendText}>Low</Text></View>
          </View>
        </Animated.View>

        {/* INSIGHTS */}
        <Animated.View style={styles.insightGrid} entering={FadeInDown.delay(400).springify()}>
           <View style={styles.insightCard}>
              <View style={[styles.insightIconWrap, {backgroundColor: '#10B98115'}]}>
                  <Ionicons name="trending-up" size={20} color="#10B981" />
              </View>
              <Text style={styles.insightTitle}>{t("topRegion" as any) || "Top Region"}</Text>
              <Text style={styles.insightValue}>{highestRegion}</Text>
           </View>

           <View style={styles.insightCard}>
              <View style={[styles.insightIconWrap, {backgroundColor: '#EF444415'}]}>
                  <Ionicons name="cart" size={20} color="#EF4444" />
              </View>
              <Text style={styles.insightTitle}>{t("highestDemand" as any) || "Highest Demand"}</Text>
              <Text style={styles.insightValue}>{highestRegion}</Text>
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

  chipScroll: {
    marginBottom: 20,
    overflow: 'visible'
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#fff",
    marginRight: 12,
    shadowColor: "#64748b",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  chipActive: {
    backgroundColor: "#10B981",
  },
  chipText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: "#64748B",
  },
  chipTextActive: {
    color: "#fff",
  },

  mapCard: {
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
  sectionTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    color: "#1E293B",
    marginBottom: 16,
  },
  
  mapContentRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: '#F1F5F9',
      borderRadius: 20,
      padding: 16,
      marginBottom: 16
  },
  svgContainer: {
      width: '45%',
      alignItems: 'center'
  },
  mapHelperText: {
      fontFamily: 'Poppins_500Medium',
      fontSize: 10,
      color: '#94A3B8',
      marginTop: 8
  },

  regionPanel: {
      width: '50%',
      backgroundColor: '#fff',
      padding: 14,
      borderRadius: 16,
      shadowColor: "#000",
      shadowOpacity: 0.05,
      shadowRadius: 5,
      shadowOffset: { width: 0, height: 2 },
  },
  regionPanelTitle: {
      fontFamily: 'Poppins_700Bold',
      fontSize: 18,
      color: '#0F172A',
  },
  demandBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      marginTop: 4,
      marginBottom: 12
  },
  demandBadgeText: {
      fontFamily: 'Poppins_700Bold',
      fontSize: 10,
  },
  statBox: {
      marginBottom: 10
  },
  statLabel: {
      fontFamily: 'Poppins_500Medium',
      fontSize: 11,
      color: '#64748B'
  },
  statValue: {
      fontFamily: 'Poppins_600SemiBold',
      fontSize: 14,
      color: '#0F172A'
  },
  statDesc: {
      fontFamily: 'Poppins_400Regular',
      fontSize: 12,
      color: '#334155',
      lineHeight: 16,
      marginTop: 2
  },
  actionBtn: {
      backgroundColor: '#0F172A',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      borderRadius: 8,
      marginTop: 4
  },
  actionBtnText: {
      color: '#fff',
      fontFamily: 'Poppins_600SemiBold',
      fontSize: 11
  },

  legendRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 8
  },
  legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
  },
  legendDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginRight: 6
  },
  legendText: {
      fontFamily: "Poppins_500Medium",
      fontSize: 11,
      color: "#64748B"
  },

  insightGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between'
  },
  insightCard: {
      width: '48%',
      backgroundColor: '#fff',
      padding: 16,
      borderRadius: 20,
      shadowColor: "#64748b",
      shadowOpacity: 0.08,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
  },
  insightIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  insightTitle: {
      fontFamily: "Poppins_500Medium",
      fontSize: 12,
      color: "#64748B"
  },
  insightValue: {
      fontFamily: "Poppins_700Bold",
      fontSize: 16,
      color: "#0F172A",
      marginTop: 2
  }
});
