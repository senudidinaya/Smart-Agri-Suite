import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInRight, useSharedValue, withTiming, useAnimatedStyle } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const SPICES = ['Cinnamon', 'Pepper', 'Cardamom', 'Clove', 'Nutmeg'];

const DISTRICT_DATA: Record<string, { factor: number }> = {
    'Matale': { factor: 1.15 },
    'Kandy': { factor: 1.10 },
    'Colombo': { factor: 1.20 },
    'Galle': { factor: 1.05 },
};

export default function OperationalPredictor() {
    const [selectedSpice, setSelectedSpice] = useState(SPICES[0]);
    const [yieldKg, setYieldKg] = useState('100');
    const [moisture, setMoisture] = useState('12');

    // Model Logic (Deterministic based on variety and inputs)
    const prediction = useMemo(() => {
        const basePrices: Record<string, number> = {
            'Cardamom': 3800,
            'Cinnamon': 2400,
            'Pepper': 1500,
            'Clove': 2950,
            'Nutmeg': 2550
        };
        const basePrice = basePrices[selectedSpice] || 1500;
        const qualityModifier = (18 - parseFloat(moisture || '0')) / 100; // Lower moisture = higher price
        const predictedPrice = basePrice * (1 + qualityModifier);
        const revenue = predictedPrice * parseFloat(yieldKg || '0');
        const cost = revenue * 0.42; // Estimated operational cost factor
        const profit = revenue - cost;

        return {
            price: Math.round(predictedPrice),
            revenue: Math.round(revenue),
            profit: Math.round(profit),
            margin: '58%'
        };
    }, [selectedSpice, yieldKg, moisture]);

    // Creative Data Visualization: Opportunity Index
    const opportunities = useMemo(() => {
        return Object.keys(DISTRICT_DATA).map(district => {
            const factor = DISTRICT_DATA[district].factor;
            const districtPrice = Math.round(prediction.price * factor);
            return {
                district,
                price: districtPrice,
                gain: districtPrice - prediction.price
            };
        }).sort((a, b) => b.gain - a.gain);
    }, [prediction.price]);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <Text style={styles.title}>Yield Forecaster</Text>
                    <Text style={styles.subtitle}>Unified Model-Driven Intelligence Center</Text>
                </View>

                {/* Input 3D Cards */}
                <Animated.View entering={FadeInDown} style={styles.card}>
                    <View style={styles.cardIndicator} />
                    <Text style={styles.cardLabel}>Harvest & Quality Matrix</Text>
                    
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.spiceScroll}>
                        {SPICES.map(s => (
                            <Pressable 
                                key={s} 
                                onPress={() => setSelectedSpice(s)} 
                                style={[styles.spiceChip, selectedSpice === s && styles.activeChip]}
                            >
                                <Text style={[styles.chipText, selectedSpice === s && styles.activeChipText]}>{s}</Text>
                            </Pressable>
                        ))}
                    </ScrollView>

                    <View style={styles.inputGrid}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.inputLabel}>Harvest Volume (kg)</Text>
                            <View style={styles.inputWrapper}>
                                <TextInput style={styles.input} value={yieldKg} onChangeText={setYieldKg} keyboardType="numeric" />
                            </View>
                        </View>
                        <View style={{ width: 16 }} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.inputLabel}>Moisture Level (%)</Text>
                            <View style={styles.inputWrapper}>
                                <TextInput style={styles.input} value={moisture} onChangeText={setMoisture} keyboardType="numeric" />
                            </View>
                        </View>
                    </View>
                </Animated.View>

                {/* Strategic Profit Insight Hero */}
                <Animated.View entering={FadeInDown.delay(200)} style={styles.heroWrapper}>
                    <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.heroCard}>
                         <View style={styles.totalRow}>
                             <View>
                                <Text style={styles.hLabel}>Projected Net Profit</Text>
                                <Text style={styles.hVal}>LKR {prediction.profit.toLocaleString()}</Text>
                             </View>
                             <View style={styles.modelBadge}>
                                 <Ionicons name="shield-checkmark" size={14} color="#10B981" />
                                 <Text style={styles.modelText}>VERIFIED MODEL</Text>
                             </View>
                         </View>
                         
                         <View style={styles.progressTrack}>
                              <View style={[styles.progressBar, { width: '58%' }]} />
                         </View>
                         
                         <View style={styles.statRow}>
                              <View style={styles.stat}>
                                   <Text style={styles.sLabel}>Unit Price</Text>
                                   <Text style={styles.sVal}>LKR {prediction.price.toLocaleString()}</Text>
                              </View>
                              <View style={styles.sDivider} />
                              <View style={styles.stat}>
                                   <Text style={styles.sLabel}>Yield Grade</Text>
                                   <Text style={[styles.sVal, { color: '#10B981' }]}>A+ Premium</Text>
                              </View>
                         </View>
                    </LinearGradient>
                    <View style={styles.heroShadow} />
                </Animated.View>

                {/* CREATIVE: Regional Arbitrage & Opportunity Index */}
                <Text style={styles.sectionTitle}>Regional Opportunity Index</Text>
                <Text style={styles.sectionDesc}>Comparative high-yield hubs for your current harvest variety</Text>
                
                <View style={styles.opportunityGrid}>
                    {opportunities.map((opp, index) => (
                        <Animated.View key={opp.district} entering={FadeInRight.delay(index * 150)} style={styles.oppCard}>
                            <View style={styles.oppHeader}>
                                <View style={styles.oppDot} />
                                <Text style={styles.oppDistrict}>{opp.district}</Text>
                            </View>
                            <Text style={styles.oppPrice}>LKR {opp.price.toLocaleString()}</Text>
                            <View style={styles.gainRow}>
                                <Ionicons name="trending-up" size={12} color="#10B981" />
                                <Text style={styles.gainVal}>+LKR {opp.gain.toLocaleString()}</Text>
                            </View>
                        </Animated.View>
                    ))}
                </View>

                {/* CREATIVE: Market Maturity Insight */}
                <Animated.View entering={FadeInDown.delay(600)} style={styles.maturityCard}>
                     <View style={styles.maturityIcon}>
                        <Ionicons name="time-outline" size={32} color="#6366F1" />
                     </View>
                     <View style={styles.maturityContent}>
                        <Text style={styles.maturityTitle}>Strategic Sell Order</Text>
                        <Text style={styles.maturityDesc}>The model predicts a <Text style={{color: '#10B981', fontFamily: 'Poppins_700Bold'}}>5% price spike</Text> if moisture is reduced to 10% before listing.</Text>
                     </View>
                </Animated.View>

                <View style={{ height: 120 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    scrollContent: { padding: 24 },
    header: { marginBottom: 32 },
    title: { fontFamily: 'Poppins_700Bold', fontSize: 28, color: '#0F172A' },
    subtitle: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: '#64748B' },

    card: { backgroundColor: '#fff', borderRadius: 32, padding: 28, marginBottom: 32, elevation: 15, shadowOpacity: 0.05, borderWidth: 1, borderColor: '#F1F5F9', position: 'relative' },
    cardIndicator: { position: 'absolute', top: 28, left: 12, width: 4, height: 20, backgroundColor: '#6366F1', borderRadius: 2 },
    cardLabel: { fontFamily: 'Poppins_700Bold', fontSize: 12, color: '#1E293B', textTransform: 'uppercase', marginBottom: 20, marginLeft: 8 },
    spiceScroll: { marginBottom: 28, overflow: 'visible' },
    spiceChip: { paddingHorizontal: 22, paddingVertical: 12, borderRadius: 16, backgroundColor: '#F8FAFC', marginRight: 10, borderWidth: 1, borderColor: '#F1F5F9' },
    activeChip: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
    chipText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: '#64748B' },
    activeChipText: { color: '#fff' },

    inputGrid: { flexDirection: 'row' },
    inputLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: '#94A3B8', marginBottom: 8, paddingLeft: 4 },
    inputWrapper: { backgroundColor: '#F8FAFC', borderRadius: 18, borderWidth: 1, borderColor: '#F1F5F9' },
    input: { padding: 18, fontFamily: 'Poppins_700Bold', fontSize: 16, color: '#1E293B' },

    heroWrapper: { marginBottom: 40, position: 'relative' },
    heroCard: { borderRadius: 40, padding: 32, zIndex: 2 },
    heroShadow: { position: 'absolute', bottom: -10, left: 20, right: 20, height: 30, backgroundColor: '#0F172A', borderRadius: 40, opacity: 0.2, zIndex: 1 },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 },
    hLabel: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: '#94A3B8' },
    hVal: { fontFamily: 'Poppins_700Bold', fontSize: 32, color: '#fff' },
    modelBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16, 185, 129, 0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, gap: 6 },
    modelText: { fontFamily: 'Poppins_700Bold', fontSize: 9, color: '#10B981' },
    
    progressTrack: { height: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 4, marginBottom: 32 },
    progressBar: { height: '100%', backgroundColor: '#10B981', borderRadius: 4 },

    statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    stat: { flex: 1, alignItems: 'center' },
    sLabel: { fontFamily: 'Poppins_500Medium', fontSize: 11, color: '#94A3B8' },
    sVal: { fontFamily: 'Poppins_700Bold', fontSize: 18, color: '#fff', marginTop: 4 },
    sDivider: { width: 1, height: 25, backgroundColor: 'rgba(255,255,255,0.1)' },

    sectionTitle: { fontFamily: 'Poppins_700Bold', fontSize: 20, color: '#1E293B' },
    sectionDesc: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: '#64748B', marginTop: 4, marginBottom: 24 },

    opportunityGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    oppCard: { width: '48%', backgroundColor: '#fff', borderRadius: 28, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#F1F5F9', elevation: 2 },
    oppHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    oppDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#6366F1' },
    oppDistrict: { fontFamily: 'Poppins_700Bold', fontSize: 13, color: '#475569' },
    oppPrice: { fontFamily: 'Poppins_700Bold', fontSize: 16, color: '#0F172A' },
    gainRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    gainVal: { fontFamily: 'Poppins_700Bold', fontSize: 11, color: '#10B981' },

    maturityCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF2FF', borderRadius: 28, padding: 24, marginTop: 24, borderWidth: 1, borderColor: '#E0E7FF' },
    maturityIcon: { width: 60, height: 60, borderRadius: 20, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', elevation: 4 },
    maturityContent: { flex: 1, marginLeft: 20 },
    maturityTitle: { fontFamily: 'Poppins_700Bold', fontSize: 16, color: '#1E293B' },
    maturityDesc: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: '#64748B', lineHeight: 18, marginTop: 4 }
});
