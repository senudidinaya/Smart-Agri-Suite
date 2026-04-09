import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function WelcomeCard() {
  return (
    <Animated.View entering={FadeInDown.springify()} style={styles.card}>
      <View style={styles.header}>
        <View style={styles.textContainer}>
          <Text style={styles.greeting}>Good Morning Farmer 🌱</Text>
          <Text style={styles.title}>Welcome to Smart Agri-Suite</Text>
          <Text style={styles.subtitleTag}>Your Intelligent Farming Companion</Text>
        </View>
        <View style={styles.iconContainer}>
          <Ionicons name="leaf" size={28} color="#16A34A" />
        </View>
      </View>

      <View style={styles.descriptionContainer}>
        <Text style={styles.descriptionBold}>
          Make smarter decisions for your harvest.
        </Text>
        <Text style={styles.description}>
          Smart Agri-Suite analyzes market demand, pricing trends, logistics costs, and seasonal conditions to help Sri Lankan spice farmers maximize profits.
        </Text>
      </View>

      <View style={styles.divider} />

      <Text style={styles.guideTitle}>With Smart Agri-Suite you can:</Text>
      <View style={styles.guideList}>
        <View style={styles.guideItem}>
          <Ionicons name="checkmark-circle" size={18} color="#2563EB" />
          <Text style={styles.guideText}>Simulate harvest pricing</Text>
        </View>
        <View style={styles.guideItem}>
          <Ionicons name="checkmark-circle" size={18} color="#2563EB" />
          <Text style={styles.guideText}>Analyze profit scenarios</Text>
        </View>
        <View style={styles.guideItem}>
          <Ionicons name="checkmark-circle" size={18} color="#2563EB" />
          <Text style={styles.guideText}>Optimize transport logistics</Text>
        </View>
        <View style={styles.guideItem}>
          <Ionicons name="checkmark-circle" size={18} color="#2563EB" />
          <Text style={styles.guideText}>Track market demand</Text>
        </View>
        <View style={styles.guideItem}>
          <Ionicons name="checkmark-circle" size={18} color="#2563EB" />
          <Text style={styles.guideText}>Explore seasonal price trends</Text>
        </View>
      </View>

      <Pressable 
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]} 
        onPress={() => router.push('/(tabs)/order')}
      >
        <Text style={styles.buttonText}>Start Exploring</Text>
        <Ionicons name="arrow-forward" size={18} color="#ffffff" style={{ marginLeft: 8 }} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 26,
    marginBottom: 24,
    shadowColor: '#64748b',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  textContainer: {
    flex: 1,
    paddingRight: 16,
  },
  greeting: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: '#F59E0B',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: {
    color: '#0F172A',
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
    lineHeight: 32,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subtitleTag: {
    color: '#16A34A',
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
  },
  iconContainer: {
    backgroundColor: '#DCFCE7',
    padding: 14,
    borderRadius: 18,
  },
  descriptionContainer: {
    backgroundColor: '#F8FAFC',
    padding: 18,
    borderRadius: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#16A34A',
  },
  descriptionBold: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: '#1E293B',
    marginBottom: 6,
  },
  description: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: '#64748B',
    lineHeight: 22,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 20,
  },
  guideTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: '#0F172A',
    marginBottom: 14,
  },
  guideList: {
    gap: 12,
    marginBottom: 28,
  },
  guideItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  guideText: {
    marginLeft: 12,
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    color: '#334155',
  },
  button: {
    backgroundColor: '#16A34A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    shadowColor: '#16A34A',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  buttonText: {
    color: '#ffffff',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    letterSpacing: 0.3,
  },
});
