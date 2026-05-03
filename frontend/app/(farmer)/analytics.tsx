import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { PieChart } from 'react-native-chart-kit';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { useUser } from '../../context/UserContext';
import { predictYield, predictPrice } from '../../lib/priceApi';

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
    const [harvestMonth, setHarvestMonth] = useState(new Date().getMonth() + 1);
    
    // API Data
    const [expectedYield, setExpectedYield] = useState<number | null>(null);
    const [expectedPrice, setExpectedPrice] = useState<number | null>(null);
    const [yieldFetching, setYieldFetching] = useState(false);
    
    const [spiceProfits, setSpiceProfits] = useState<any[]>([]);
    const [compFetching, setCompFetching] = useState(false);

    // Call yield API
    const fetchYield = useCallback(async () => {
        setYieldFetching(true);
        const [resYield, resPrice] = await Promise.all([
            predictYield(selectedSpice, region, temp, rainfall, harvestMonth),
            predictPrice(selectedSpice, region, 12, harvestMonth)
        ]);
        setExpectedYield(resYield.yield_kg);
        setExpectedPrice(resPrice.price);
        setYieldFetching(false);
    }, [selectedSpice, region, temp, rainfall, harvestMonth]);

    // Fetch comparative profits for ALL spices
    const fetchComparativeProfits = useCallback(async () => {
        setCompFetching(true);
        const results = await Promise.all(
            SPICES.map(async (spice) => {
                const [resYield, resPrice] = await Promise.all([
                    predictYield(spice, region, temp, rainfall, harvestMonth),
                    predictPrice(spice, region, 12, harvestMonth)
                ]);
                const revenue = resYield.yield_kg * resPrice.price;
                const profit = revenue * (1 - 0.42);
                return { spice, profit };
            })
        );
        setSpiceProfits(results);
        setCompFetching(false);
    }, [region, temp, rainfall, harvestMonth]);

    useEffect(() => {
        // Debounce yield so it doesn't spam while sliding
        const timer = setTimeout(() => {
            fetchYield();
        }, 500);
        return () => clearTimeout(timer);
    }, [fetchYield]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchComparativeProfits();
        }, 500);
        return () => clearTimeout(timer);
    }, [fetchComparativeProfits]);

    // Helpers
    const changeTemp = (delta: number) => setTemp(prev => Math.max(15, Math.min(40, prev + delta)));
    const changeRain = (delta: number) => setRainfall(prev => Math.max(0, Math.min(200, prev + delta)));
    const changeMonth = (delta: number) => {
        setHarvestMonth(prev => {
            const newMonth = prev + delta;
            if (newMonth > 12) return 1;
            if (newMonth < 1) return 12;
            return newMonth;
        });
    };

    const estRevenue = expectedYield !== null && expectedPrice !== null ? expectedYield * expectedPrice : null;
    const estProfit = estRevenue !== null ? estRevenue * (1 - 0.42) : null;

    // Recommendation logic (Simple: Compare selected spice to max profit spice)
    const maxProfitSpice = spiceProfits.length > 0 ? spiceProfits.reduce((prev, current) => (prev.profit > current.profit) ? prev : current) : null;
    const isOptimal = maxProfitSpice && maxProfitSpice.spice === selectedSpice;

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
                    <Text style={[styles.cardLabel, { color: theme.textSecondary }]}>EXPECTED HARVEST IN {monthNames[harvestMonth - 1].toUpperCase()}</Text>
                    
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

                    <Text style={[styles.inputLabel, { color: theme.textMuted }]}>Climate Simulator & Timing</Text>
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
                        {/* Month Control */}
                        <View style={[styles.controlBox, { backgroundColor: theme.bgSecondary, minWidth: '100%' }]}>
                            <Text style={[styles.controlLabel, { color: theme.textMuted }]}>Harvest Month</Text>
                            <View style={styles.controlRow}>
                                <Pressable onPress={() => changeMonth(-1)} style={[styles.ctrlBtn, { backgroundColor: theme.bgCard }]}><Ionicons name="remove" size={16} color={theme.textPrimary}/></Pressable>
                                <Text style={[styles.controlVal, { color: theme.textPrimary }]}>{monthNames[harvestMonth - 1]}</Text>
                                <Pressable onPress={() => changeMonth(1)} style={[styles.ctrlBtn, { backgroundColor: theme.bgCard }]}><Ionicons name="add" size={16} color={theme.textPrimary}/></Pressable>
                            </View>
                        </View>
                    </View>

                    {estRevenue !== null && estProfit !== null && !yieldFetching && (
                        <View style={{ marginTop: 24, padding: 16, backgroundColor: theme.bgSecondary, borderRadius: 16 }}>
                            <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: theme.textMuted, marginBottom: 12 }}>ESTIMATED FINANCIALS FOR {monthNames[harvestMonth - 1].toUpperCase()}</Text>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                <Text style={{ color: theme.textSecondary, fontFamily: 'Poppins_500Medium', fontSize: 13 }}>Selling Price</Text>
                                <Text style={{ fontFamily: 'Poppins_600SemiBold', color: theme.textPrimary, fontSize: 13 }}>Rs. {expectedPrice?.toLocaleString()}/kg</Text>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                <Text style={{ color: theme.textSecondary, fontFamily: 'Poppins_500Medium', fontSize: 13 }}>Gross Revenue</Text>
                                <Text style={{ fontFamily: 'Poppins_600SemiBold', color: theme.textPrimary, fontSize: 13 }}>Rs. {estRevenue.toLocaleString(undefined, {maximumFractionDigits:0})}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.border }}>
                                <Text style={{ color: theme.textSecondary, fontFamily: 'Poppins_600SemiBold', fontSize: 14 }}>Net Profit</Text>
                                <Text style={{ fontFamily: 'Poppins_700Bold', color: theme.green, fontSize: 16 }}>Rs. {estProfit.toLocaleString(undefined, {maximumFractionDigits:0})}</Text>
                            </View>
                        </View>
                    )}
                </Animated.View>

                {/* 2. Profit Comparison (Pie Chart) */}
                <Animated.View entering={FadeInDown.delay(100)} style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                    <View style={[styles.cardIndicator, { backgroundColor: theme.indigo }]} />
                    <Text style={[styles.cardLabel, { color: theme.textSecondary }]}>COMPARATIVE PROFITABILITY</Text>

                    {compFetching || spiceProfits.length === 0 ? (
                        <View style={{ height: 180, justifyContent: 'center' }}>
                            <ActivityIndicator size="large" color={theme.indigo} />
                        </View>
                    ) : (
                        <View style={{ alignItems: 'center', marginTop: 10 }}>
                            <PieChart
                                data={spiceProfits.map(item => ({
                                    name: item.spice,
                                    population: item.profit,
                                    color: item.spice === selectedSpice ? theme.indigo : (theme.mode === 'dark' ? '#334155' : '#E2E8F0'),
                                    legendFontColor: theme.textSecondary,
                                    legendFontSize: 11
                                }))}
                                width={Dimensions.get('window').width - 80}
                                height={180}
                                chartConfig={{ color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})` }}
                                accessor={"population"}
                                backgroundColor={"transparent"}
                                paddingLeft={"0"}
                                center={[0, 0]}
                                absolute={false}
                            />
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
                        
                        {isOptimal ? (
                            <Text style={styles.hVal}>
                                {selectedSpice} is highly profitable under these conditions. Focus on maximizing your yield for {monthNames[harvestMonth - 1]}!
                            </Text>
                        ) : (
                            <Text style={styles.hVal}>
                                <Text style={{ color: '#10B981' }}>{maxProfitSpice?.spice}</Text> yields a higher projected profit (Rs. {maxProfitSpice?.profit.toLocaleString(undefined, {maximumFractionDigits:0})}) under these conditions. Consider diversifying your harvest.
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
    climateGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
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
