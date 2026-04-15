import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { predictPrice } from '../../lib/priceApi';

const SPICES = ['Cinnamon', 'Pepper', 'Cardamom', 'Clove', 'Nutmeg'];
const MODEL_REGIONS = ['Galle', 'Kandy', 'Matale', 'Kurunegala', 'Matara', 'Kegalle'];
const COST_FACTOR = 0.42;

export default function OperationalPredictor() {
    const { t } = useLanguage();
    const { theme } = useTheme();

    const [selectedSpice,  setSelectedSpice]  = useState(SPICES[0]);
    const [yieldKg,        setYieldKg]        = useState('100');
    const [moisture,       setMoisture]       = useState('12');
    const [selectedRegion, setSelectedRegion] = useState('Kandy');
    const [modelPrice,     setModelPrice]     = useState<number | null>(null);
    const [priceFetching,  setPriceFetching]  = useState(false);
    const [priceFromModel, setPriceFromModel] = useState(false);
    const [regionPrices,   setRegionPrices]  = useState<{ region: string; price: number }[]>([]);
    const [regionFetching, setRegionFetching] = useState(false);

    const fetchMainPrice = useCallback(async () => {
        setPriceFetching(true);
        const result = await predictPrice(selectedSpice, selectedRegion, parseFloat(moisture || '12'));
        setModelPrice(result.price); setPriceFromModel(result.fromModel); setPriceFetching(false);
    }, [selectedSpice, selectedRegion, moisture]);

    useEffect(() => { fetchMainPrice(); }, [fetchMainPrice]);

    const fetchRegionPrices = useCallback(async () => {
        setRegionFetching(true);
        const results = await Promise.all(
            MODEL_REGIONS.map(async r => {
                const res = await predictPrice(selectedSpice, r, parseFloat(moisture || '12'));
                return { region: r, price: res.price };
            })
        );
        setRegionPrices(results.sort((a, b) => b.price - a.price));
        setRegionFetching(false);
    }, [selectedSpice, moisture]);

    useEffect(() => { fetchRegionPrices(); }, [fetchRegionPrices]);

    const price   = modelPrice ?? 0;
    const kgs     = parseFloat(yieldKg || '0');
    const revenue = Math.round(price * kgs);
    const cost    = Math.round(revenue * COST_FACTOR);
    const profit  = revenue - cost;
    const margin  = kgs > 0 && price > 0 ? Math.round((1 - COST_FACTOR) * 100) : 0;
    const moistureNum  = parseFloat(moisture || '12');
    const qualityLabel = moistureNum <= 10 ? 'A+ Premium' : moistureNum <= 14 ? 'Grade A' : moistureNum <= 18 ? 'Grade B' : 'Grade C';
    const qualityColor = moistureNum <= 10 ? '#10B981' : moistureNum <= 14 ? '#6366F1' : moistureNum <= 18 ? '#F59E0B' : '#EF4444';

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top']}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Header */}
                <View style={styles.header}>
                    <Text style={[styles.title, { color: theme.textPrimary }]}>{t('pricePredictor')}</Text>
                    <View style={[styles.sourceBadge, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                        <Ionicons name={priceFromModel ? 'analytics' : 'calculator-outline'} size={12} color={priceFromModel ? theme.green : theme.amber} />
                        <Text style={[styles.sourceText, { color: priceFromModel ? theme.green : theme.amber }]}>
                            {priceFromModel ? t('liveModel') : t('localEstimate')}
                        </Text>
                    </View>
                </View>

                {/* Input Card */}
                <Animated.View entering={FadeInDown} style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                    <View style={[styles.cardIndicator, { backgroundColor: theme.indigo }]} />
                    <Text style={[styles.cardLabel, { color: theme.textSecondary }]}>{t('harvestQualityMatrix')}</Text>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.spiceScroll}>
                        {SPICES.map(s => (
                            <Pressable key={s} onPress={() => setSelectedSpice(s)}
                                style={[styles.spiceChip, { backgroundColor: theme.bgSecondary, borderColor: theme.border },
                                    selectedSpice === s && { backgroundColor: theme.indigo, borderColor: theme.indigo }]}>
                                <Text style={[styles.chipText, { color: selectedSpice === s ? '#fff' : theme.textMuted }]}>{s}</Text>
                            </Pressable>
                        ))}
                    </ScrollView>

                    <Text style={[styles.inputLabel, { color: theme.textMuted }]}>{t('targetRegion')}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
                        {MODEL_REGIONS.map(r => (
                            <Pressable key={r} onPress={() => setSelectedRegion(r)}
                                style={[styles.regionChip, { backgroundColor: theme.bgSecondary, borderColor: theme.border },
                                    selectedRegion === r && { backgroundColor: theme.green, borderColor: theme.green }]}>
                                <Text style={[styles.chipText, { color: selectedRegion === r ? '#fff' : theme.textMuted }]}>{r}</Text>
                            </Pressable>
                        ))}
                    </ScrollView>

                    <View style={styles.inputGrid}>
                        {[
                            { label: t('harvestVolume'), val: yieldKg, set: setYieldKg },
                            { label: t('moistureLevelPct'), val: moisture, set: setMoisture },
                        ].map(f => (
                            <View key={f.label} style={{ flex: 1 }}>
                                <Text style={[styles.inputLabel, { color: theme.textMuted }]}>{f.label}</Text>
                                <View style={[styles.inputWrapper, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}>
                                    <TextInput
                                        style={[styles.input, { color: theme.textPrimary }]}
                                        value={f.val} onChangeText={f.set as any} keyboardType="numeric"
                                        placeholderTextColor={theme.textMuted}
                                    />
                                </View>
                            </View>
                        ))}
                    </View>

                    <View style={styles.qualityRow}>
                        <View style={[styles.qualityDot, { backgroundColor: qualityColor }]} />
                        <Text style={[styles.qualityLabel, { color: qualityColor }]}>{qualityLabel}</Text>
                        <Text style={[styles.qualityHint, { color: theme.textMuted }]}>
                            {' — '}{moistureNum <= 12 ? t('optimalMoisture') : moistureNum <= 16 ? t('acceptableMoisture') : t('highMoistureWarning')}
                        </Text>
                    </View>
                </Animated.View>

                {/* Hero Profit Card */}
                <Animated.View entering={FadeInDown.delay(200)} style={styles.heroWrapper}>
                    <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.heroCard}>
                        <View style={styles.totalRow}>
                            <View>
                                <Text style={styles.hLabel}>{t('projectedNetProfit')}</Text>
                                {priceFetching
                                    ? <ActivityIndicator size="large" color="#10B981" style={{ marginTop: 8 }} />
                                    : <Text style={styles.hVal}>LKR {profit.toLocaleString()}</Text>
                                }
                            </View>
                            <View style={styles.modelBadge}>
                                <Ionicons name={priceFromModel ? 'shield-checkmark' : 'calculator-outline'} size={14} color={priceFromModel ? '#10B981' : '#F59E0B'} />
                                <Text style={[styles.modelText, { color: priceFromModel ? '#10B981' : '#F59E0B' }]}>
                                    {priceFromModel ? 'MODEL' : 'ESTIMATE'}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.progressTrack}>
                            <View style={[styles.progressBar, { width: `${margin}%` as any }]} />
                        </View>
                        <Text style={styles.marginLabel}>{margin}% {t('marginOn')} LKR {revenue.toLocaleString()} revenue</Text>
                        <View style={styles.statRow}>
                            {[
                                { l: t('unitPrice'),  v: `LKR ${price.toLocaleString()}` },
                                { l: t('volume'),     v: `${kgs} ${t('kg')}` },
                                { l: t('yieldGrade'), v: qualityLabel, c: qualityColor },
                            ].map((s, i, arr) => (
                                <React.Fragment key={s.l}>
                                    <View style={styles.stat}>
                                        <Text style={styles.sLabel}>{s.l}</Text>
                                        <Text style={[styles.sVal, s.c ? { color: s.c } : {}]}>{s.v}</Text>
                                    </View>
                                    {i < arr.length - 1 && <View style={styles.sDivider} />}
                                </React.Fragment>
                            ))}
                        </View>
                    </LinearGradient>
                    <View style={styles.heroShadow} />
                </Animated.View>

                {/* Regional Opportunity Index */}
                <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{t('regionalOpportunity')}</Text>
                <Text style={[styles.sectionDesc, { color: theme.textMuted }]}>
                    {t('modelPredictedPrices')} {selectedSpice}
                </Text>

                {regionFetching ? (
                    <View style={[styles.regionLoader, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                        <ActivityIndicator size="small" color={theme.indigo} />
                        <Text style={[styles.regionLoaderText, { color: theme.textMuted }]}>{t('queryingPrices')}</Text>
                    </View>
                ) : (
                    <View style={styles.opportunityGrid}>
                        {regionPrices.map((opp, index) => {
                            const isSelected = opp.region === selectedRegion;
                            const gain = modelPrice ? opp.price - modelPrice : 0;
                            const isBest = index === 0;
                            return (
                                <Animated.View key={opp.region} entering={FadeInRight.delay(index * 100)}
                                    style={[styles.oppCard, { backgroundColor: theme.bgCard, borderColor: theme.border },
                                        isSelected && { borderColor: theme.indigo, borderWidth: 2, backgroundColor: theme.mode === 'dark' ? '#12133a' : '#F5F3FF' }]}>
                                    {isBest && (
                                        <View style={[styles.bestBadge, { backgroundColor: theme.green }]}>
                                            <Text style={styles.bestBadgeText}>BEST</Text>
                                        </View>
                                    )}
                                    <Pressable onPress={() => setSelectedRegion(opp.region)}>
                                        <View style={styles.oppHeader}>
                                            <View style={[styles.oppDot, { backgroundColor: isBest ? theme.green : theme.indigo }]} />
                                            <Text style={[styles.oppDistrict, { color: theme.textSecondary }]}>{opp.region}</Text>
                                        </View>
                                        <Text style={[styles.oppPrice, { color: theme.textPrimary }]}>LKR {opp.price.toLocaleString()}</Text>
                                        {modelPrice && gain !== 0 && (
                                            <View style={styles.gainRow}>
                                                <Ionicons name={gain > 0 ? 'trending-up' : 'trending-down'} size={12} color={gain > 0 ? theme.green : theme.red} />
                                                <Text style={[styles.gainVal, { color: gain > 0 ? theme.green : theme.red }]}>
                                                    {gain > 0 ? '+' : ''}LKR {gain.toLocaleString()}
                                                </Text>
                                            </View>
                                        )}
                                    </Pressable>
                                </Animated.View>
                            );
                        })}
                    </View>
                )}

                {/* Drying Opportunity Hint */}
                {modelPrice && moistureNum > 12 && (
                    <Animated.View entering={FadeInDown.delay(600)} style={[styles.maturityCard, { backgroundColor: theme.mode === 'dark' ? '#12133a' : '#EEF2FF', borderColor: theme.mode === 'dark' ? theme.indigo + '40' : '#E0E7FF' }]}>
                        <View style={[styles.maturityIcon, { backgroundColor: theme.bgCard }]}>
                            <Ionicons name="bulb-outline" size={28} color={theme.indigo} />
                        </View>
                        <View style={styles.maturityContent}>
                            <Text style={[styles.maturityTitle, { color: theme.textPrimary }]}>{t('dryingOpportunity')}</Text>
                            <Text style={[styles.maturityDesc, { color: theme.textMuted }]}>
                                {t('dryingDesc1')} <Text style={{ color: theme.amber, fontFamily: 'Poppins_700Bold' }}>{moistureNum}%</Text>
                                {' '}{t('dryingDesc2')}{' '}
                                <Text style={{ color: theme.green, fontFamily: 'Poppins_700Bold' }}>12%</Text>
                                {' '}{t('dryingDesc3')}{' '}
                                <Text style={{ color: theme.green, fontFamily: 'Poppins_700Bold' }}>
                                    LKR {Math.round(modelPrice * (moistureNum - 12) * 0.008).toLocaleString()}/kg
                                </Text>.
                            </Text>
                        </View>
                    </Animated.View>
                )}

                <View style={{ height: 120 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { padding: 24 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 },
    title: { fontFamily: 'Poppins_700Bold', fontSize: 28 },
    sourceBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1 },
    sourceText: { fontFamily: 'Poppins_700Bold', fontSize: 10 },
    card: { borderRadius: 32, padding: 28, marginBottom: 32, elevation: 4, borderWidth: 1, position: 'relative' },
    cardIndicator: { position: 'absolute', top: 28, left: 12, width: 4, height: 20, borderRadius: 2 },
    cardLabel: { fontFamily: 'Poppins_700Bold', fontSize: 12, textTransform: 'uppercase', marginBottom: 20, marginLeft: 8 },
    spiceScroll: { marginBottom: 20, overflow: 'visible' },
    spiceChip: { paddingHorizontal: 22, paddingVertical: 12, borderRadius: 16, marginRight: 10, borderWidth: 1 },
    regionChip: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 14, marginRight: 8, borderWidth: 1 },
    chipText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13 },
    inputGrid: { flexDirection: 'row', gap: 16 },
    inputLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, marginBottom: 8, paddingLeft: 4 },
    inputWrapper: { borderRadius: 18, borderWidth: 1 },
    input: { padding: 18, fontFamily: 'Poppins_700Bold', fontSize: 16 },
    qualityRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14, gap: 6 },
    qualityDot: { width: 8, height: 8, borderRadius: 4 },
    qualityLabel: { fontFamily: 'Poppins_700Bold', fontSize: 12 },
    qualityHint: { fontFamily: 'Poppins_400Regular', fontSize: 11, flex: 1 },
    heroWrapper: { marginBottom: 40, position: 'relative' },
    heroCard: { borderRadius: 40, padding: 32, zIndex: 2 },
    heroShadow: { position: 'absolute', bottom: -10, left: 20, right: 20, height: 30, backgroundColor: '#0F172A', borderRadius: 40, opacity: 0.2, zIndex: 1 },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
    hLabel: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: '#94A3B8' },
    hVal: { fontFamily: 'Poppins_700Bold', fontSize: 32, color: '#fff', marginTop: 4 },
    modelBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16,185,129,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, gap: 6 },
    modelText: { fontFamily: 'Poppins_700Bold', fontSize: 9 },
    progressTrack: { height: 8, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 4, marginBottom: 8 },
    progressBar: { height: '100%', backgroundColor: '#10B981', borderRadius: 4 },
    marginLabel: { fontFamily: 'Poppins_500Medium', fontSize: 11, color: '#64748B', marginBottom: 28 },
    statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    stat: { flex: 1, alignItems: 'center' },
    sLabel: { fontFamily: 'Poppins_500Medium', fontSize: 11, color: '#94A3B8' },
    sVal: { fontFamily: 'Poppins_700Bold', fontSize: 16, color: '#fff', marginTop: 4 },
    sDivider: { width: 1, height: 25, backgroundColor: 'rgba(255,255,255,0.1)' },
    sectionTitle: { fontFamily: 'Poppins_700Bold', fontSize: 20 },
    sectionDesc: { fontFamily: 'Poppins_400Regular', fontSize: 13, marginTop: 4, marginBottom: 20 },
    regionLoader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 24, borderRadius: 20, marginBottom: 24, justifyContent: 'center', borderWidth: 1 },
    regionLoaderText: { fontFamily: 'Poppins_500Medium', fontSize: 13 },
    opportunityGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 24 },
    oppCard: { width: '48%', borderRadius: 24, padding: 18, marginBottom: 14, borderWidth: 1, elevation: 2, position: 'relative' },
    bestBadge: { position: 'absolute', top: -8, right: 12, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, zIndex: 5 },
    bestBadgeText: { fontFamily: 'Poppins_700Bold', fontSize: 8, color: '#fff' },
    oppHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    oppDot: { width: 6, height: 6, borderRadius: 3 },
    oppDistrict: { fontFamily: 'Poppins_700Bold', fontSize: 13 },
    oppPrice: { fontFamily: 'Poppins_700Bold', fontSize: 16 },
    gainRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
    gainVal: { fontFamily: 'Poppins_700Bold', fontSize: 11 },
    maturityCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 28, padding: 24, borderWidth: 1 },
    maturityIcon: { width: 58, height: 58, borderRadius: 18, justifyContent: 'center', alignItems: 'center', elevation: 3 },
    maturityContent: { flex: 1, marginLeft: 18 },
    maturityTitle: { fontFamily: 'Poppins_700Bold', fontSize: 15 },
    maturityDesc: { fontFamily: 'Poppins_400Regular', fontSize: 12, lineHeight: 18, marginTop: 4 },
});
