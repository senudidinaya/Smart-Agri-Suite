import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';

const TRANSPORT_MODES = [
    { id: 'lorry',  label: 'Heavy Lorry',  rate: 120, icon: 'bus',    color: '#10B981', time: '1h 20m' },
    { id: 'van',    label: 'Pro Van',       rate: 80,  icon: 'car',    color: '#3B82F6', time: '55m' },
    { id: 'shared', label: 'Eco Shared',   rate: 45,  icon: 'people', color: '#F59E0B', time: '2h 10m' },
];

export default function FarmerLogistics() {
    const { t } = useLanguage();
    const { theme } = useTheme();
    const [selectedMode, setSelectedMode] = useState(TRANSPORT_MODES[0]);
    const distance = 42.5;

    const estimate = useMemo(() => {
        const totalCost = distance * selectedMode.rate;
        // Increase savings logic specifically for shared
        const savingsMultiplier = selectedMode.id === 'shared' ? 0.35 : 0.15;
        return { cost: Math.round(totalCost), savings: Math.round(distance * 120 * savingsMultiplier) }; // Base standard is roughly 120 LKR/km
    }, [selectedMode, distance]);

    // Mock Pooling Intelligence based on region
    const poolActive = selectedMode.id === 'shared';
    const pooledCount = 2;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top']}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <Text style={[styles.title, { color: theme.textPrimary }]}>{t('transportTitle')}</Text>
                    <Text style={[styles.subtitle, { color: theme.textMuted }]}>{t('transportSub')}</Text>
                </View>

                {/* Route Visualization Card */}
                <Animated.View entering={FadeInDown} style={styles.mapWrapper}>
                    <View style={[styles.mapCard, { borderColor: theme.border }]}>
                        <LinearGradient
                            colors={theme.mode === 'dark' ? ['#1E293B', '#0F172A'] : ['#EFF6FF', '#DBEAFE']}
                            style={styles.mapMock}
                        >
                            <View style={[styles.mapLine, { backgroundColor: theme.blue }]} />
                            <View style={[styles.markerStart, { borderColor: theme.bgCard }]} />
                            <View style={[styles.markerEnd, { borderColor: theme.bgCard }]} />
                            <View style={[styles.routeTag, { backgroundColor: theme.mode === 'dark' ? '#334155' : '#1E293B' }]}>
                                <Ionicons name="location-sharp" size={12} color="#fff" />
                                <Text style={styles.routeTagText}>Kandy → Colombo Hub</Text>
                            </View>
                        </LinearGradient>
                        <View style={[styles.mapOver, { backgroundColor: theme.mode === 'dark' ? 'rgba(30,41,59,0.9)' : 'rgba(255,255,255,0.9)' }]}>
                            <Text style={[styles.distVal, { color: theme.textPrimary }]}>{distance}</Text>
                            <Text style={[styles.distUnit, { color: theme.textMuted }]}>KM TOTAL</Text>
                        </View>
                    </View>
                    <View style={[styles.mapShadow, { backgroundColor: theme.blue }]} />
                </Animated.View>

                {/* Mode Selection */}
                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Select Optimized Mode</Text>
                <View style={styles.modeGrid}>
                    {TRANSPORT_MODES.map(mode => {
                        const active = selectedMode.id === mode.id;
                        return (
                            <Pressable key={mode.id} onPress={() => setSelectedMode(mode)}
                                style={[styles.modeCard, { backgroundColor: theme.bgCard, borderColor: theme.border },
                                    active && { borderColor: mode.color, backgroundColor: mode.color + (theme.mode === 'dark' ? '18' : '08') }]}>
                                <View style={[styles.modeIcon, { backgroundColor: active ? mode.color : theme.bgSecondary }]}>
                                    <Ionicons name={mode.icon as any} size={20} color={active ? '#fff' : theme.textMuted} />
                                </View>
                                <Text style={[styles.modeLabel, { color: active ? mode.color : theme.textMuted }]}>{mode.label}</Text>
                                <Text style={[styles.modeTime, { color: theme.textMuted }]}>{mode.time}</Text>
                            </Pressable>
                        );
                    })}
                </View>

                {/* Estimate Card */}
                <Animated.View entering={FadeInDown.delay(200)} style={styles.glassWrapper}>
                    <LinearGradient
                        colors={theme.mode === 'dark'
                            ? ['rgba(30,41,59,0.97)', 'rgba(30,41,59,0.85)']
                            : ['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.8)']}
                        style={[styles.glassCard, { borderColor: theme.border }]}
                    >
                        <View style={styles.resHeader}>
                            <View>
                                <Text style={[styles.resTitle, { color: theme.textPrimary }]}>Logistics Premium</Text>
                                <Text style={[styles.resSub, { color: theme.textMuted }]}>Model-derived delivery cost</Text>
                            </View>
                            <View style={[styles.rateBadge, { backgroundColor: theme.mode === 'dark' ? '#0f2e22' : '#F0FDF4' }]}>
                                <Text style={[styles.rateText, { color: theme.green }]}>LKR {selectedMode.rate}/km</Text>
                            </View>
                        </View>
                        <View style={[styles.divider, { backgroundColor: theme.border }]} />
                        
                        {poolActive && (
                            <Animated.View entering={FadeInDown} style={[styles.poolBanner, { backgroundColor: theme.mode === 'dark' ? 'rgba(245,158,11,0.1)' : '#FEF3C7' }]}>
                                <Ionicons name="git-network-outline" size={16} color="#F59E0B" />
                                <Text style={[styles.poolBannerText, { color: theme.mode === 'dark' ? '#FDE68A' : '#B45309' }]}>
                                    Smart Pooling Active: Paired with {pooledCount} nearby pending shipments.
                                </Text>
                            </Animated.View>
                        )}

                        <View style={styles.costRow}>
                            <View>
                                <Text style={[styles.totalLabel, { color: theme.textMuted }]}>Total Estimate</Text>
                                <Text style={[styles.totalVal, { color: theme.textPrimary }]}>LKR {estimate.cost.toLocaleString()}</Text>
                            </View>
                            <View style={styles.savingsBox}>
                                <Text style={[styles.savingsLabel, { color: theme.green }]}>Est. Savings</Text>
                                <Text style={[styles.savingsVal, { color: theme.green }]}>LKR {estimate.savings}</Text>
                            </View>
                        </View>
                    </LinearGradient>
                    <View style={[styles.glassShadow, { backgroundColor: theme.cardShadowBg }]} />
                </Animated.View>

                <Pressable style={styles.confirmBtn}>
                    <LinearGradient colors={['#10B981', '#059669']} style={styles.btnGradient}>
                        <Text style={styles.btnText}>Dispatch Shipment</Text>
                    </LinearGradient>
                </Pressable>

                <View style={{ height: 120 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { padding: 24 },
    header: { marginBottom: 32 },
    title: { fontFamily: 'Poppins_700Bold', fontSize: 28 },
    subtitle: { fontFamily: 'Poppins_400Regular', fontSize: 13, marginTop: 4 },
    mapWrapper: { marginBottom: 32, position: 'relative' },
    mapCard: { height: 200, borderRadius: 32, overflow: 'hidden', borderWidth: 1 },
    mapMock: { flex: 1, padding: 20 },
    mapShadow: { position: 'absolute', bottom: -10, left: 15, right: 15, height: 40, borderRadius: 32, opacity: 0.1 },
    mapLine: { position: 'absolute', top: 100, left: 50, right: 50, height: 4, opacity: 0.3 },
    markerStart: { position: 'absolute', top: 92, left: 50, width: 20, height: 20, borderRadius: 10, backgroundColor: '#10B981', borderWidth: 3 },
    markerEnd: { position: 'absolute', top: 92, right: 50, width: 20, height: 20, borderRadius: 10, backgroundColor: '#F59E0B', borderWidth: 3 },
    routeTag: { position: 'absolute', bottom: 20, left: 20, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, gap: 4 },
    routeTagText: { fontFamily: 'Poppins_700Bold', fontSize: 10, color: '#fff' },
    mapOver: { position: 'absolute', top: 20, right: 20, padding: 12, borderRadius: 20, alignItems: 'center' },
    distVal: { fontFamily: 'Poppins_700Bold', fontSize: 20 },
    distUnit: { fontFamily: 'Poppins_700Bold', fontSize: 8 },
    sectionTitle: { fontFamily: 'Poppins_700Bold', fontSize: 18, marginBottom: 16 },
    modeGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32, gap: 12 },
    modeCard: { flex: 1, borderRadius: 24, padding: 16, alignItems: 'center', borderWidth: 2 },
    modeIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    modeLabel: { fontFamily: 'Poppins_700Bold', fontSize: 12 },
    modeTime: { fontFamily: 'Poppins_500Medium', fontSize: 10, marginTop: 2 },
    glassWrapper: { marginBottom: 32, position: 'relative' },
    glassCard: { borderRadius: 32, padding: 24, borderWidth: 1, elevation: 2 },
    glassShadow: { position: 'absolute', bottom: -5, left: 15, right: 15, height: 30, borderRadius: 32, opacity: 0.4 },
    resHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    resTitle: { fontFamily: 'Poppins_700Bold', fontSize: 18 },
    resSub: { fontFamily: 'Poppins_400Regular', fontSize: 11 },
    rateBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
    rateText: { fontFamily: 'Poppins_700Bold', fontSize: 12 },
    divider: { height: 1, marginVertical: 20 },
    costRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    totalLabel: { fontFamily: 'Poppins_500Medium', fontSize: 12 },
    totalVal: { fontFamily: 'Poppins_700Bold', fontSize: 24 },
    savingsBox: { alignItems: 'flex-end' },
    savingsLabel: { fontFamily: 'Poppins_500Medium', fontSize: 11 },
    savingsVal: { fontFamily: 'Poppins_700Bold', fontSize: 16 },
    confirmBtn: { height: 64, borderRadius: 24, overflow: 'hidden', elevation: 8 },
    btnGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    btnText: { fontFamily: 'Poppins_700Bold', fontSize: 16, color: '#fff' },
    poolBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, marginBottom: 20 },
    poolBannerText: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, flex: 1 },
});
