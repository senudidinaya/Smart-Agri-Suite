import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeInUp, useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '../../context/LanguageContext';
import { useOrders } from '../../context/OrderContext';

const { width } = Dimensions.get('window');

const SPICE_TRENDS = [
    { name: 'Cinnamon', momentum: '+12%', color: '#F59E0B', icon: 'leaf-outline' },
    { name: 'Pepper', momentum: '-2%', color: '#1E293B', icon: 'radio-button-on-outline' },
    { name: 'Cardamom', momentum: '+5%', color: '#10B981', icon: 'sparkles-outline' },
    { name: 'Clove', momentum: '+8%', color: '#8B5CF6', icon: 'color-filter-outline' },
    { name: 'Nutmeg', momentum: 'Stable', color: '#EC4899', icon: 'ellipse-outline' },
];

export default function FarmerHome() {
    const router = useRouter();
    const { t } = useLanguage();
    const { totalRevenue, totalProfit, orders } = useOrders();

    const sections = [
        {
            title: "Demand Map",
            desc: "Regional spice heatmaps & tracking",
            icon: "map-outline",
            colors: ["#6366F1", "#4F46E5"],
            route: "/(farmer)/srilanka-demand-map"
        },
        {
            title: "Forecaster",
            desc: "Price & Profit Prediction models",
            icon: "bar-chart-outline",
            colors: ["#10B981", "#059669"],
            route: "/(farmer)/simulator"
        },
        {
            title: "Logistics",
            desc: "Optimized route & mode analysis",
            icon: "bus-outline",
            colors: ["#F59E0B", "#D97706"],
            route: "/(farmer)/transport"
        },
        {
            title: "Marketplace",
            desc: "Sell harvests to global clients",
            icon: "cube-outline",
            colors: ["#EC4899", "#BE185D"],
            route: "/(farmer)/stock"
        }
    ];

    const pulse = useSharedValue(1);
    useEffect(() => {
        pulse.value = withRepeat(withSequence(withTiming(1.1, { duration: 1500 }), withTiming(1, { duration: 1500 })), -1);
    }, []);

    const pulseStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulse.value }],
        opacity: 0.8
    }));

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <LinearGradient colors={['#F0FDF4', '#F8FAFC']} style={StyleSheet.absoluteFill} />
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                
                {/* 3D Glass Hero - Sync with Global Theme */}
                <Animated.View entering={FadeInDown.delay(100)} style={styles.heroWrapper}>
                    <View style={styles.heroShadow} />
                    <LinearGradient
                        colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.8)']}
                        style={styles.hero}
                    >
                        <View style={styles.heroText}>
                            <Text style={styles.welcome}>Operational Dashboard</Text>
                            <Text style={styles.brandTitle}>Agri-Command</Text>
                            <Text style={styles.brandSubtitle}>Central Intelligence Hub</Text>
                            <View style={styles.statusBox}>
                                <Animated.View style={[styles.activeDot, pulseStyle]} />
                                <Text style={styles.statusLabel}>NETWORK SYNCED</Text>
                            </View>
                        </View>
                        <View style={styles.heroIcons}>
                             <LinearGradient colors={['#10B981', '#059669']} style={styles.mainIcon}>
                                <Ionicons name="stats-chart" size={32} color="#fff" />
                             </LinearGradient>
                        </View>
                    </LinearGradient>
                </Animated.View>

                {/* Performance Metrics Across Market */}
                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                         <Text style={styles.statLabel}>Revenue</Text>
                         <Text style={styles.statVal}>LKR {totalRevenue.toLocaleString()}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.statItem}>
                         <Text style={styles.statLabel}>Profit</Text>
                         <Text style={[styles.statVal, { color: '#10B981' }]}>LKR {totalProfit.toLocaleString()}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.statItem}>
                         <Text style={styles.statLabel}>Orders</Text>
                         <Text style={[styles.statVal, { color: '#6366F1' }]}>{orders.length}</Text>
                    </View>
                </View>

                {/* Momentum Analytics */}
                <Text style={styles.sectionTitle}>Global Model Predictions</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.ticker}>
                    {SPICE_TRENDS.map((spice, idx) => (
                        <View key={spice.name} style={styles.tickerCardWrapper}>
                            <View style={styles.tickerCard}>
                                <View style={[styles.tickerHeader, { backgroundColor: spice.color + '15' }]}>
                                    <Ionicons name={spice.icon as any} size={14} color={spice.color} />
                                    <Text style={[styles.tickerName, { color: spice.color }]}>{spice.name}</Text>
                                </View>
                                <Text style={styles.tickerRate}>{spice.momentum}</Text>
                                <Text style={styles.tickerLabel}>Price Momentum</Text>
                            </View>
                            <View style={styles.tickerShadow} />
                        </View>
                    ))}
                </ScrollView>

                {/* Farmer Operations Studio */}
                <Text style={styles.sectionTitle}>Operational Tools</Text>
                <View style={styles.grid}>
                    {sections.map((section, index) => (
                        <Animated.View key={index} entering={FadeInUp.delay(300 + index * 100)} style={styles.gridItemWrapper}>
                            <Pressable 
                                style={({pressed}) => [styles.gridCard, pressed && { transform: [{scale: 0.98}] }]}
                                onPress={() => router.push(section.route as any)}
                            >
                                <LinearGradient colors={section.colors} style={styles.gridIconBox}>
                                    <Ionicons name={section.icon as any} size={28} color="#fff" />
                                </LinearGradient>
                                <Text style={styles.gridTitle}>{section.title}</Text>
                                <Text style={styles.gridDesc}>{section.desc}</Text>
                            </Pressable>
                            <View style={[styles.gridShadow, { backgroundColor: section.colors[1] }]} />
                        </Animated.View>
                    ))}
                </View>

                {/* Role Switcher - Updated for Consistency */}
                <Animated.View entering={FadeInUp.delay(800)} style={styles.switchWrapper}>
                    <Pressable style={styles.switchBtn} onPress={() => router.replace('/auth')}>
                        <Ionicons name="arrow-back" size={18} color="#64748B" />
                        <Text style={styles.switchText}>{t('goBackRole')}</Text>
                    </Pressable>
                </Animated.View>

                <View style={{ height: 120 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { padding: 24 },
    
    heroWrapper: { marginBottom: 32, position: 'relative' },
    heroShadow: { position: 'absolute', bottom: -12, left: 15, right: 15, height: 40, backgroundColor: '#D1FAE5', borderRadius: 32, opacity: 0.5 },
    hero: { borderRadius: 32, padding: 28, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#fff' },
    heroText: { flex: 1 },
    welcome: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: '#64748B' },
    brandTitle: { fontFamily: 'Poppins_700Bold', fontSize: 32, color: '#065F46', lineHeight: 36 },
    brandSubtitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: '#10B981', marginTop: 2 },
    statusBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDF4', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start', marginTop: 12 },
    activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', marginRight: 6 },
    statusLabel: { fontFamily: 'Poppins_700Bold', fontSize: 9, color: '#166534' },
    
    heroIcons: { alignItems: 'center' },
    mainIcon: { width: 70, height: 70, borderRadius: 24, justifyContent: 'center', alignItems: 'center', elevation: 15 },

    statsRow: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 28, padding: 20, justifyContent: 'space-between', marginBottom: 32, elevation: 4, shadowOpacity: 0.05 },
    statItem: { flex: 1, alignItems: 'center' },
    statLabel: { fontFamily: 'Poppins_500Medium', fontSize: 11, color: '#94A3B8' },
    statVal: { fontFamily: 'Poppins_700Bold', fontSize: 14, color: '#0F172A', marginTop: 4 },
    divider: { width: 1, height: 30, backgroundColor: '#F1F5F9', marginTop: 10 },

    sectionTitle: { fontFamily: 'Poppins_700Bold', fontSize: 18, color: '#1E293B', marginBottom: 16 },
    ticker: { marginBottom: 32, overflow: 'visible' },
    tickerCardWrapper: { marginRight: 16, width: 140, height: 110, position: 'relative' },
    tickerCard: { flex: 1, backgroundColor: '#fff', borderRadius: 20, padding: 16, zIndex: 2, borderWidth: 1, borderColor: '#F1F5F9' },
    tickerShadow: { position: 'absolute', bottom: -4, left: 10, right: 10, height: 10, backgroundColor: '#E2E8F0', borderRadius: 20, zIndex: 1 },
    tickerHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 12 },
    tickerName: { fontFamily: 'Poppins_700Bold', fontSize: 10 },
    tickerRate: { fontFamily: 'Poppins_700Bold', fontSize: 18, color: '#0F172A' },
    tickerLabel: { fontFamily: 'Poppins_500Medium', fontSize: 10, color: '#94A3B8', marginTop: 2 },

    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 16 },
    gridItemWrapper: { width: '47%', height: 180, position: 'relative' },
    gridCard: { flex: 1, backgroundColor: '#fff', borderRadius: 24, padding: 20, alignItems: 'center', justifyContent: 'center', zIndex: 2, borderWidth: 1, borderColor: '#F1F5F9' },
    gridShadow: { position: 'absolute', bottom: -6, left: 10, right: 10, height: 10, borderRadius: 20, opacity: 0.1, zIndex: 1 },
    gridIconBox: { width: 60, height: 60, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 16, elevation: 8 },
    gridTitle: { fontFamily: 'Poppins_700Bold', fontSize: 16, color: '#0F172A' },
    gridDesc: { fontFamily: 'Poppins_400Regular', fontSize: 11, color: '#64748B', textAlign: 'center', marginTop: 6 },

    switchWrapper: { marginTop: 32, marginBottom: 40, alignItems: 'center' },
    switchBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', elevation: 2 },
    switchText: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: '#64748B' }
});
