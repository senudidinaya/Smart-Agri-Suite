import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { useUser } from '../../context/UserContext';
import { predictYield, getProfitProjection } from '../../lib/priceApi';

const SPICES = ['Cinnamon', 'Pepper', 'Cardamom', 'Clove', 'Nutmeg'];

export default function FarmerAnalytics() {
    const { t } = useLanguage();
    const { theme } = useTheme();
    const { profile } = useUser();

    // Default to user's region or Kandy
    const region = profile.location?.address || 'Kandy';
    
    // State
    const [selectedSpice, setSelectedSpice] = useState(SPICES[0]);
    const [temp, setTemp] = useState(27);
    const [rainfall, setRainfall] = useState(60);
    
    // API Data
    const [expectedYield, setExpectedYield] = useState<number | null>(null);
    const [yieldFetching, setYieldFetching] = useState(false);
    
    const [projections, setProjections] = useState<any[]>([]);
    const [projFetching, setProjFetching] = useState(false);

    // Call yield API
    const fetchYield = useCallback(async () => {
        setYieldFetching(true);
        const res = await predictYield(selectedSpice, region, temp, rainfall);
        setExpectedYield(res.yield_kg);
        setYieldFetching(false);
    }, [selectedSpice, region, temp, rainfall]);

    // Call profit API
    const fetchProjections = useCallback(async () => {
        setProjFetching(true);
        const res = await getProfitProjection(selectedSpice, region, new Date().getMonth() + 1, 0.42);
        setProjections(res.projection || []);
        setProjFetching(false);
    }, [selectedSpice, region]);

    useEffect(() => {
        // Debounce yield so it doesn't spam while sliding
        const timer = setTimeout(() => {
            fetchYield();
        }, 500);
        return () => clearTimeout(timer);
    }, [fetchYield]);

    useEffect(() => {
        fetchProjections();
    }, [fetchProjections]);

    // Helpers
    const changeTemp = (delta: number) => setTemp(prev => Math.max(15, Math.min(40, prev + delta)));
    const changeRain = (delta: number) => setRainfall(prev => Math.max(0, Math.min(200, prev + delta)));

    // Recommendation logic (Simple: Highest profit month)
    const bestMonthObj = projections.length > 0 ? projections.reduce((prev, current) => (prev.profit > current.profit) ? prev : current) : null;
    const currentMonthObj = projections[0];
    const shouldHold = bestMonthObj && currentMonthObj && bestMonthObj.month !== currentMonthObj.month && bestMonthObj.profit > currentMonthObj.profit * 1.05;

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top']}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                
                {/* Header */}
                <View style={styles.header}>
                    <Text style={[styles.title, { color: theme.textPrimary }]}>Analytics</Text>
                    <Text style={[styles.subtitle, { color: theme.textMuted }]}>Yield Predictor & Profit Projections</Text>
                </View>

                {/* Spice Selector */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.spiceScroll}>
                    {SPICES.map(s => (
                        <Pressable key={s} onPress={() => setSelectedSpice(s)}
                            style={[styles.spiceChip, { backgroundColor: theme.bgCard, borderColor: theme.border },
                                selectedSpice === s && { backgroundColor: theme.indigo, borderColor: theme.indigo }]}>
                            <Text style={[styles.chipText, { color: selectedSpice === s ? '#fff' : theme.textMuted }]}>{s}</Text>
                        </Pressable>
                    ))}
                </ScrollView>

                {/* 1. Yield Predictor */}
                <Animated.View entering={FadeInDown} style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                    <View style={[styles.cardIndicator, { backgroundColor: theme.green }]} />
                    <Text style={[styles.cardLabel, { color: theme.textSecondary }]}>EXPECTED HARVEST YIELD</Text>
                    
                    <View style={styles.heroRow}>
                        {yieldFetching || expectedYield === null ? (
                            <ActivityIndicator size="large" color={theme.green} />
                        ) : (
                            <Text style={[styles.heroVal, { color: theme.textPrimary }]}>{expectedYield.toLocaleString()} <Text style={{ fontSize: 16 }}>kg</Text></Text>
                        )}
                        <View style={[styles.badge, { backgroundColor: 'rgba(16,185,129,0.1)' }]}>
                            <Ionicons name="leaf-outline" size={14} color={theme.green} />
                            <Text style={[styles.badgeText, { color: theme.green }]}>{region}</Text>
                        </View>
                    </View>

                    <Text style={[styles.inputLabel, { color: theme.textMuted }]}>Climate Simulator</Text>
                    <View style={styles.climateGrid}>
                        {/* Temp Control */}
                        <View style={[styles.controlBox, { backgroundColor: theme.bgSecondary }]}>
                            <Text style={[styles.controlLabel, { color: theme.textMuted }]}>Avg Temp (°C)</Text>
                            <View style={styles.controlRow}>
                                <Pressable onPress={() => changeTemp(-1)} style={[styles.ctrlBtn, { backgroundColor: theme.bgCard }]}><Ionicons name="remove" size={16} color={theme.textPrimary}/></Pressable>
                                <Text style={[styles.controlVal, { color: theme.textPrimary }]}>{temp.toFixed(1)}°</Text>
                                <Pressable onPress={() => changeTemp(1)} style={[styles.ctrlBtn, { backgroundColor: theme.bgCard }]}><Ionicons name="add" size={16} color={theme.textPrimary}/></Pressable>
                            </View>
                        </View>
                        {/* Rain Control */}
                        <View style={[styles.controlBox, { backgroundColor: theme.bgSecondary }]}>
                            <Text style={[styles.controlLabel, { color: theme.textMuted }]}>Rainfall (mm)</Text>
                            <View style={styles.controlRow}>
                                <Pressable onPress={() => changeRain(-5)} style={[styles.ctrlBtn, { backgroundColor: theme.bgCard }]}><Ionicons name="remove" size={16} color={theme.textPrimary}/></Pressable>
                                <Text style={[styles.controlVal, { color: theme.textPrimary }]}>{rainfall.toFixed(0)}</Text>
                                <Pressable onPress={() => changeRain(5)} style={[styles.ctrlBtn, { backgroundColor: theme.bgCard }]}><Ionicons name="add" size={16} color={theme.textPrimary}/></Pressable>
                            </View>
                        </View>
                    </View>
                </Animated.View>

                {/* 2. Profit Projection (6 months) */}
                <Animated.View entering={FadeInDown.delay(100)} style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                    <View style={[styles.cardIndicator, { backgroundColor: theme.indigo }]} />
                    <Text style={[styles.cardLabel, { color: theme.textSecondary }]}>6-MONTH PROFIT FORECAST</Text>

                    {projFetching || projections.length === 0 ? (
                        <View style={{ height: 150, justifyContent: 'center' }}>
                            <ActivityIndicator size="large" color={theme.indigo} />
                        </View>
                    ) : (
                        <View style={styles.chartArea}>
                            <View style={styles.chartBars}>
                                {projections.map((p, i) => {
                                    const maxProfit = Math.max(...projections.map(x => x.profit));
                                    const heightPct = Math.max(10, (p.profit / maxProfit) * 100);
                                    const isBest = p.profit === maxProfit;
                                    
                                    return (
                                        <View key={i} style={styles.barWrapper}>
                                            <Text style={[styles.barValueText, { color: theme.textMuted }]}>{(p.profit / 1000).toFixed(0)}k</Text>
                                            <View style={[styles.barTrack, { backgroundColor: theme.bgSecondary }]}>
                                                <LinearGradient 
                                                    colors={isBest ? ['#10B981', '#059669'] : ['#6366F1', '#4F46E5']} 
                                                    style={[styles.barFill, { height: `${heightPct}%` }]} 
                                                />
                                            </View>
                                            <Text style={[styles.barLabelText, { color: isBest ? theme.green : theme.textPrimary }]}>
                                                {monthNames[p.month - 1]}
                                            </Text>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>
                    )}
                </Animated.View>

                {/* 3. Smart Insights */}
                <Animated.View entering={FadeInDown.delay(200)} style={styles.heroWrapper}>
                    <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.heroCard}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                            <Ionicons name="sparkles" size={18} color="#10B981" />
                            <Text style={styles.hLabel}>Smart Selling Recommendation</Text>
                        </View>
                        
                        {shouldHold ? (
                            <Text style={styles.hVal}>
                                Hold your {selectedSpice} stock until {monthNames[bestMonthObj.month - 1]}. 
                                Prices are projected to peak, yielding a <Text style={{ color: '#10B981' }}>+{( (bestMonthObj.profit - currentMonthObj.profit) / currentMonthObj.profit * 100).toFixed(1)}%</Text> profit increase.
                            </Text>
                        ) : (
                            <Text style={styles.hVal}>
                                Sell your {selectedSpice} now. Current market conditions in {region} are optimal, and future profits are projected to decline or stagnate.
                            </Text>
                        )}
                        
                    </LinearGradient>
                    <View style={styles.heroShadow} />
                </Animated.View>

                <View style={{ height: 120 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { padding: 24 },
    header: { marginBottom: 28 },
    title: { fontFamily: 'Poppins_700Bold', fontSize: 28 },
    subtitle: { fontFamily: 'Poppins_400Regular', fontSize: 13, marginTop: 4 },
    spiceScroll: { marginBottom: 20, overflow: 'visible', flexGrow: 0 },
    spiceChip: { paddingHorizontal: 22, paddingVertical: 12, borderRadius: 16, marginRight: 10, borderWidth: 1 },
    chipText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13 },
    
    card: { borderRadius: 32, padding: 28, marginBottom: 24, elevation: 4, borderWidth: 1, position: 'relative' },
    cardIndicator: { position: 'absolute', top: 28, left: 12, width: 4, height: 20, borderRadius: 2 },
    cardLabel: { fontFamily: 'Poppins_700Bold', fontSize: 12, textTransform: 'uppercase', marginBottom: 20, marginLeft: 8 },
    
    heroRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 },
    heroVal: { fontFamily: 'Poppins_700Bold', fontSize: 38, lineHeight: 46 },
    badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    badgeText: { fontFamily: 'Poppins_700Bold', fontSize: 10 },
    
    inputLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, marginBottom: 12 },
    climateGrid: { flexDirection: 'row', gap: 12 },
    controlBox: { flex: 1, borderRadius: 20, padding: 16 },
    controlLabel: { fontFamily: 'Poppins_500Medium', fontSize: 11, marginBottom: 8 },
    controlRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    ctrlBtn: { width: 28, height: 28, borderRadius: 10, justifyContent: 'center', alignItems: 'center', elevation: 2 },
    controlVal: { fontFamily: 'Poppins_700Bold', fontSize: 16 },

    chartArea: { height: 180, marginTop: 10 },
    chartBars: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    barWrapper: { alignItems: 'center', width: '14%' },
    barValueText: { fontFamily: 'Poppins_500Medium', fontSize: 9, marginBottom: 6 },
    barTrack: { width: '100%', height: 120, borderRadius: 6, overflow: 'hidden', justifyContent: 'flex-end', padding: 2 },
    barFill: { width: '100%', borderRadius: 4 },
    barLabelText: { fontFamily: 'Poppins_700Bold', fontSize: 11, marginTop: 10 },

    heroWrapper: { position: 'relative', marginTop: 10 },
    heroCard: { borderRadius: 32, padding: 32, zIndex: 2 },
    heroShadow: { position: 'absolute', bottom: -10, left: 20, right: 20, height: 30, backgroundColor: '#0F172A', borderRadius: 40, opacity: 0.2, zIndex: 1 },
    hLabel: { fontFamily: 'Poppins_700Bold', fontSize: 14, color: '#10B981' },
    hVal: { fontFamily: 'Poppins_500Medium', fontSize: 15, color: '#fff', lineHeight: 24 },
});
