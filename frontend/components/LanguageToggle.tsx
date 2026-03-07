import React from 'react';
import { View, Text, Switch, StyleSheet, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useLanguage } from '../context/LanguageContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function LanguageToggle() {
  const { language, setLanguage } = useLanguage();
  const insets = useSafeAreaInsets();

  const handleLanguageToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLanguage(language === "en" ? "si" : "en");
  };

  return (
    <Animated.View
      entering={FadeInDown.delay(500).springify()}
      style={[styles.container, { top: Math.max(insets.top, 20) + 10 }]}
    >
      <View style={styles.langToggleContainer}>
        <Text style={styles.langText}>EN</Text>
        <Switch
          trackColor={{ false: "#CBD5E1", true: "#10B981" }}
          thumbColor={"#ffffff"}
          ios_backgroundColor="#CBD5E1"
          onValueChange={handleLanguageToggle}
          value={language === "si"}
          style={{ transform: [{ scale: Platform.OS === 'ios' ? 0.7 : 0.8 }] }}
        />
        <Text style={styles.langText}>SI</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 16,
    zIndex: 9999,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: "#0F172A",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(241, 245, 249, 0.8)',
  },
  langToggleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  langText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: "#64748B",
    marginHorizontal: 4,
  },
});
