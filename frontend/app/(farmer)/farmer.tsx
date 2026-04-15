import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeInUp, useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { useOrders } from '../../context/OrderContext';
import { useStock } from '../../context/StockContext';
import { useUser } from '../../context/UserContext';

const SPICE_TRENDS = [
    { name: 'Cinnamon', momentum: '+12%', color: '#F59E0B', icon: 'leaf-outline' },
    { name: 'Pepper',   momentum: '-2%',  color: '#94A3B8', icon: 'radio-button-on-outline' },
    { name: 'Cardamom', momentum: '+5%',  color: '#10B981', icon: 'sparkles-outline' },
    { name: 'Clove',    momentum: '+8%',  color: '#8B5CF6', icon: 'color-filter-outline' },
    { name: 'Nutmeg',   momentum: 'Stable', color: '#EC4899', icon: 'ellipse-outline' },
];

export default function FarmerHome() {
    const router = useRouter();
    const { t } = useLanguage();
    const { theme } = useTheme();
    const { totalRevenue, totalProfit, orders } = useOrders();
    const { myListings } = useStock();
    const { profile } = useUser();

    // Calculate Stock Progress for preferred spice
    const preferredSpice = profile.preferredSpice || 'Cinnamon';
    const activeListings = myListings(profile.name).filter(l => l.spice === preferredSpice && l.status !== 'Paused');
    const totalStockCapacity = activeListings.reduce((sum, l) => sum + (l.totalStock || 0), 0);
    const remainingStock = activeListings.reduce((sum, l) => sum + (l.stock || 0), 0);
    const soldStock = totalStockCapacity - remainingStock;
    const stockProgress = totalStockCapacity > 0 ? (soldStock / totalStockCapacity) * 100 : 0;

    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const profitTarget = 50; // assuming a nice 50% margin target
    const profitProgress = Math.min((profitMargin / profitTarget) * 100, 100);

    // Weather Warning Mock logic
    const farmerRegion = profile.location?.address || 'Kandy';
    const mockWeatherWarning = {
        active: true,
        region: farmerRegion,
        title: "Flash Weather Warning",
        message: `Expected +20mm rainfall next week in ${farmerRegion}. Ensure storage is sealed to avoid the standard 0.8% LKR penalty on moisture.`
    };

    const sections = [
        { title: t('demandMap'),   desc: t('demandMapDesc'),   icon: "map-outline",       colors: ["#6366F1", "#4F46E5"] as [string,string], route: "/(farmer)/srilanka-demand-map" },
        { title: t('forecaster'),  desc: t('forecasterDesc'),  icon: "bar-chart-outline", colors: ["#10B981", "#059669"] as [string,string], route: "/(farmer)/simulator" },
        { title: t('logistics'),   desc: t('logisticsDesc'),   icon: "bus-outline",       colors: ["#F59E0B", "#D97706"] as [string,string], route: "/(farmer)/transport" },
        { title: t('marketplace'), desc: t('marketplaceDesc'), icon: "cube-outline",      colors: ["#EC4899", "#BE185D"] as [string,string], route: "/(farmer)/stock" },
    ];

    const pulse = useSharedValue(1);
    useEffect(() => {
        pulse.value = withRepeat(withSequence(withTiming(1.1, { duration: 1500 }), withTiming(1, { duration: 1500 })), -1);
    }, []);
    const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }], opacity: 0.8 }));

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top']}>
            <LinearGradient colors={theme.heroGradient} style={StyleSheet.absoluteFill} />
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Hero */}
                <Animated.View entering={FadeInDown.delay(100)} style={styles.heroWrapper}>
                    <View style={[styles.heroShadow, { backgroundColor: theme.mode === 'dark' ? '#0a2010' : '#D1FAE5' }]} />
                    <LinearGradient
                        colors={theme.mode === 'dark' ? ['rgba(30,41,59,0.97)', 'rgba(30,41,59,0.85)'] : ['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.8)']}
                        style={[styles.hero, { borderColor: theme.mode === 'dark' ? theme.border : '#fff' }]}
                    >
                        <View style={styles.heroText}>
                            <Text style={[styles.welcome, { color: theme.textMuted }]}>{t('operationalDashboard')}</Text>
                            <Text style={[styles.brandTitle, { color: theme.mode === 'dark' ? '#34d399' : '#065F46' }]}>{t('agriCommand')}</Text>
                            <Text style={[styles.brandSubtitle, { color: theme.green }]}>{t('centralIntelligenceHub')}</Text>
                            <View style={[styles.statusBox, { backgroundColor: theme.mode === 'dark' ? '#0a2010' : '#F0FDF4' }]}>
                                <Animated.View style={[styles.activeDot, pulseStyle]} />
                                <Text style={[styles.statusLabel, { color: theme.mode === 'dark' ? '#34d399' : '#166534' }]}>{t('networkSynced')}</Text>
                            </View>
                        </View>
                        <View style={styles.heroIcons}>
                            <LinearGradient colors={['#10B981', '#059669']} style={styles.mainIcon}>
                                <Ionicons name="stats-chart" size={32} color="#fff" />
                            </LinearGradient>
                        </View>
                    </LinearGradient>
                </Animated.View>

                {/* Proactive Weather Warning */}
                {mockWeatherWarning.active && (
                    <Animated.View entering={FadeInDown.delay(150)} style={[styles.warningCard, { backgroundColor: theme.mode === 'dark' ? 'rgba(239,68,68,0.1)' : '#FEF2F2', borderColor: theme.mode === 'dark' ? 'rgba(239,68,68,0.3)' : '#FECACA' }]}>
                        <View style={styles.warningHeader}>
                            <Ionicons name="warning" size={20} color="#EF4444" />
                            <Text style={[styles.warningTitle, { color: '#B91C1C' }]}>{mockWeatherWarning.title}</Text>
                        </View>
                        <Text style={[styles.warningMessage, { color: theme.mode === 'dark' ? '#FCA5A5' : '#991B1B' }]}>
                            {mockWeatherWarning.message}
                        </Text>
                    </Animated.View>
                )}

                {/* Stats Row */}
                <View style={[styles.statsRow, { backgroundColor: theme.bgCard }]}>
                    {[
                        { label: t('revenue'), val: `LKR ${totalRevenue.toLocaleString()}`, color: theme.textPrimary },
                        { label: t('profit'),  val: `LKR ${totalProfit.toLocaleString()}`,  color: theme.green },
                        { label: t('active'),  val: `${orders.filter(o => o.status === 'ACCEPTED' || o.status === 'IN_TRANSIT').length}`, color: theme.indigo },
                        { label: t('pending'), val: `${orders.filter(o => o.status === 'PENDING').length}`, color: theme.amber },
                    ].map((s, i, arr) => (
                        <React.Fragment key={s.label}>
                            <View style={styles.statItem}>
                                <Text style={[styles.statLabel, { color: theme.textMuted }]}>{s.label}</Text>
                                <Text style={[styles.statVal, { color: s.color }]}>{s.val}</Text>
                            </View>
                            {i < arr.length - 1 && <View style={[styles.divider, { backgroundColor: theme.border }]} />}
                        </React.Fragment>
                    ))}
                </View>

                {/* Progress Trackers */}
                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{t('performanceMetrics' as any) || 'Performance Tracking'}</Text>
                
                <Animated.View entering={FadeInDown.delay(200)} style={styles.progressContainer}>
                    {/* Stock Progress */}
                    <View style={[styles.progressCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                        <View style={styles.progHeaderRow}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Ionicons name="cube-outline" size={16} color={theme.indigo} />
                                <Text style={[styles.progTitle, { color: theme.textPrimary }]}>{preferredSpice} Sold</Text>
                            </View>
                            <Text style={[styles.progPercent, { color: theme.indigo }]}>{stockProgress.toFixed(0)}%</Text>
                        </View>
                        <Text style={[styles.progSubtitle, { color: theme.textMuted }]}>
                            {soldStock} kg sold out of {totalStockCapacity} kg total
                        </Text>
                        <View style={[styles.progTrack, { backgroundColor: theme.mode === 'dark' ? '#1e293b' : '#e2e8f0' }]}>
                            <Animated.View style={[styles.progFill, { width: `${Math.max(2, stockProgress)}%`, backgroundColor: theme.indigo }]} />
                        </View>
                    </View>

                    {/* Profit Margin Progress */}
                    <View style={[styles.progressCard, { backgroundColor: theme.bgCard, borderColor: theme.border, marginTop: 12 }]}>
                        <View style={styles.progHeaderRow}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Ionicons name="cash-outline" size={16} color={theme.green} />
                                <Text style={[styles.progTitle, { color: theme.textPrimary }]}>Profit Margin</Text>
                            </View>
                            <Text style={[styles.progPercent, { color: theme.green }]}>{profitMargin.toFixed(1)}%</Text>
                        </View>
                        <Text style={[styles.progSubtitle, { color: theme.textMuted }]}>
                            Target margin is {profitTarget}%.
                        </Text>
                        <View style={[styles.progTrack, { backgroundColor: theme.mode === 'dark' ? '#0f2e22' : '#dcfce7' }]}>
                            <Animated.View style={[styles.progFill, { width: `${Math.max(2, profitProgress)}%`, backgroundColor: theme.green }]} />
                        </View>
                    </View>
                </Animated.View>

                {/* Momentum Ticker */}
                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{t('globalModelPredictions')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.ticker}>
                    {SPICE_TRENDS.map(spice => (
                        <View key={spice.name} style={styles.tickerCardWrapper}>
                            <View style={[styles.tickerCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                                <View style={[styles.tickerHeader, { backgroundColor: spice.color + '18' }]}>
                                    <Ionicons name={spice.icon as any} size={14} color={spice.color} />
                                    <Text style={[styles.tickerName, { color: spice.color }]}>{spice.name}</Text>
                                </View>
                                <Text style={[styles.tickerRate, { color: theme.textPrimary }]}>{spice.momentum}</Text>
                                <Text style={[styles.tickerLabel, { color: theme.textMuted }]}>{t('priceMomentum')}</Text>
                            </View>
                            <View style={[styles.tickerShadow, { backgroundColor: theme.cardShadowBg }]} />
                        </View>
                    ))}
                </ScrollView>

                {/* Operations Grid */}
                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{t('operationalTools')}</Text>
                <View style={styles.grid}>
                    {sections.map((section, index) => (
                        <Animated.View key={index} entering={FadeInUp.delay(300 + index * 100)} style={styles.gridItemWrapper}>
                            <Pressable
                                style={({ pressed }) => [
                                    styles.gridCard,
                                    { backgroundColor: theme.bgCard, borderColor: theme.border },
                                    pressed && { transform: [{ scale: 0.98 }] }
                                ]}
                                onPress={() => router.push(section.route as any)}
                            >
                                <LinearGradient colors={section.colors} style={styles.gridIconBox}>
                                    <Ionicons name={section.icon as any} size={28} color="#fff" />
                                </LinearGradient>
                                <Text style={[styles.gridTitle, { color: theme.textPrimary }]}>{section.title}</Text>
                                <Text style={[styles.gridDesc, { color: theme.textMuted }]}>{section.desc}</Text>
                            </Pressable>
                            <View style={[styles.gridShadow, { backgroundColor: section.colors[1] }]} />
                        </Animated.View>
                    ))}
                </View>

                {/* Switch Role */}
                <Animated.View entering={FadeInUp.delay(800)} style={styles.switchWrapper}>
                    <Pressable
                        style={[styles.switchBtn, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
                        onPress={() => router.replace('/auth')}
                    >
                        <Ionicons name="arrow-back" size={18} color={theme.textMuted} />
                        <Text style={[styles.switchText, { color: theme.textMuted }]}>{t('goBackRole')}</Text>
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
    heroShadow: { position: 'absolute', bottom: -12, left: 15, right: 15, height: 40, borderRadius: 32, opacity: 0.4 },
    hero: { borderRadius: 32, padding: 28, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1 },
    heroText: { flex: 1 },
    welcome: { fontFamily: 'Poppins_500Medium', fontSize: 13 },
    brandTitle: { fontFamily: 'Poppins_700Bold', fontSize: 32, lineHeight: 36 },
    brandSubtitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, marginTop: 2 },
    statusBox: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start', marginTop: 12 },
    activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', marginRight: 6 },
    statusLabel: { fontFamily: 'Poppins_700Bold', fontSize: 9 },
    heroIcons: { alignItems: 'center' },
    mainIcon: { width: 70, height: 70, borderRadius: 24, justifyContent: 'center', alignItems: 'center', elevation: 15 },
    warningCard: { padding: 16, borderRadius: 20, borderWidth: 1, marginBottom: 32 },
    warningHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    warningTitle: { fontFamily: 'Poppins_700Bold', fontSize: 14 },
    warningMessage: { fontFamily: 'Poppins_500Medium', fontSize: 12, lineHeight: 18 },
    statsRow: { flexDirection: 'row', borderRadius: 28, padding: 12, justifyContent: 'space-between', marginBottom: 32, elevation: 4, shadowOpacity: 0.05 },
    statItem: { flex: 1, alignItems: 'center' },
    statLabel: { fontFamily: 'Poppins_500Medium', fontSize: 10 },
    statVal: { fontFamily: 'Poppins_700Bold', fontSize: 12, marginTop: 4 },
    divider: { width: 1, height: 25, marginTop: 8 },
    sectionTitle: { fontFamily: 'Poppins_700Bold', fontSize: 18, marginBottom: 16 },
    progressContainer: { marginBottom: 32 },
    progressCard: { padding: 18, borderRadius: 20, borderWidth: 1, elevation: 1 },
    progHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
    progTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 13 },
    progPercent: { fontFamily: 'Poppins_700Bold', fontSize: 14 },
    progSubtitle: { fontFamily: 'Poppins_400Regular', fontSize: 11, marginBottom: 12 },
    progTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
    progFill: { height: '100%', borderRadius: 4 },
    ticker: { marginBottom: 32, overflow: 'visible' },
    tickerCardWrapper: { marginRight: 16, width: 140, height: 110, position: 'relative' },
    tickerCard: { flex: 1, borderRadius: 20, padding: 16, zIndex: 2, borderWidth: 1 },
    tickerShadow: { position: 'absolute', bottom: -4, left: 10, right: 10, height: 10, borderRadius: 20, zIndex: 1, opacity: 0.4 },
    tickerHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 12 },
    tickerName: { fontFamily: 'Poppins_700Bold', fontSize: 10 },
    tickerRate: { fontFamily: 'Poppins_700Bold', fontSize: 18 },
    tickerLabel: { fontFamily: 'Poppins_500Medium', fontSize: 10, marginTop: 2 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 16 },
    gridItemWrapper: { width: '47%', height: 180, position: 'relative' },
    gridCard: { flex: 1, borderRadius: 24, padding: 20, alignItems: 'center', justifyContent: 'center', zIndex: 2, borderWidth: 1 },
    gridShadow: { position: 'absolute', bottom: -6, left: 10, right: 10, height: 10, borderRadius: 20, opacity: 0.12, zIndex: 1 },
    gridIconBox: { width: 60, height: 60, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 16, elevation: 8 },
    gridTitle: { fontFamily: 'Poppins_700Bold', fontSize: 16 },
    gridDesc: { fontFamily: 'Poppins_400Regular', fontSize: 11, textAlign: 'center', marginTop: 6 },
    switchWrapper: { marginTop: 32, marginBottom: 40, alignItems: 'center' },
    switchBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 20, borderWidth: 1, elevation: 2 },
    switchText: { fontFamily: 'Poppins_600SemiBold', fontSize: 14 },
});
