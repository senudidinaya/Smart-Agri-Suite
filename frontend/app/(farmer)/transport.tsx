import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const TRANSPORT_MODES = [
    { id: 'lorry', label: 'Heavy Lorry', rate: 120, icon: 'bus', color: '#10B981', time: '1h 20m' },
    { id: 'van', label: 'Pro Van', rate: 80, icon: 'car', color: '#3B82F6', time: '55m' },
    { id: 'shared', label: 'Eco Shared', rate: 45, icon: 'people', color: '#F59E0B', time: '2h 10m' },
];

export default function FarmerLogistics() {
    const [selectedMode, setSelectedMode] = useState(TRANSPORT_MODES[0]);
    const distance = 42.5; // Mock dist to next hub

    const logisticsEstimate = useMemo(() => {
        const totalCost = distance * selectedMode.rate;
        return {
            cost: Math.round(totalCost),
            savings: Math.round(totalCost * 0.15),
            carbon: '12kg Reduced'
        };
    }, [selectedMode, distance]);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <Text style={styles.title}>Transport Center</Text>
                    <Text style={styles.subtitle}>Optimize distribution & fulfillment costs</Text>
                </View>

                {/* 3D Map Visualization Card */}
                <Animated.View entering={FadeInDown} style={styles.mapWrapper}>
                    <View style={styles.mapCard}>
                        <LinearGradient colors={['#EFF6FF', '#DBEAFE']} style={styles.mapMock}>
                             <View style={styles.mapLine} />
                             <View style={styles.markerStart} />
                             <View style={styles.markerEnd} />
                             <View style={styles.routeTag}>
                                 <Ionicons name="location-sharp" size={12} color="#fff" />
                                 <Text style={styles.routeTagText}>Kandy → Colombo Hub</Text>
                             </View>
                        </LinearGradient>
                        <View style={styles.mapOver}>
                            <View style={styles.distLabel}>
                                <Text style={styles.distVal}>{distance}</Text>
                                <Text style={styles.distUnit}>KM TOTAL</Text>
                            </View>
                        </View>
                    </View>
                    <View style={styles.mapShadow} />
                </Animated.View>

                {/* Transport Mode Selection */}
                <Text style={styles.sectionTitle}>Select Optimized Mode</Text>
                <View style={styles.modeGrid}>
                    {TRANSPORT_MODES.map((mode, idx) => (
                        <Pressable 
                            key={mode.id} 
                            onPress={() => setSelectedMode(mode)}
                            style={[styles.modeCard, selectedMode.id === mode.id && { borderColor: mode.color, backgroundColor: mode.color + '05' }]}
                        >
                            <View style={[styles.modeIcon, { backgroundColor: selectedMode.id === mode.id ? mode.color : '#F1F5F9' }]}>
                                <Ionicons name={mode.icon as any} size={20} color={selectedMode.id === mode.id ? '#fff' : '#64748B'} />
                            </View>
                            <Text style={[styles.modeLabel, selectedMode.id === mode.id && { color: mode.color }]}>{mode.label}</Text>
                            <Text style={styles.modeTime}>{mode.time}</Text>
                        </Pressable>
                    ))}
                </View>

                {/* Logistics Result Glass Card */}
                <Animated.View entering={FadeInDown.delay(200)} style={styles.glassWrapper}>
                    <LinearGradient
                        colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.7)']}
                        style={styles.glassCard}
                    >
                        <View style={styles.resHeader}>
                            <View>
                                <Text style={styles.resTitle}>Logistics Premium</Text>
                                <Text style={styles.resSub}>Model-derived delivery cost</Text>
                            </View>
                            <View style={styles.rateBadge}>
                                <Text style={styles.rateText}>LKR {selectedMode.rate}/km</Text>
                            </View>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.costRow}>
                             <View>
                                <Text style={styles.totalLabel}>Total Estimate</Text>
                                <Text style={styles.totalVal}>LKR {logisticsEstimate.cost.toLocaleString()}</Text>
                             </View>
                             <View style={styles.savingsBox}>
                                 <Text style={styles.savingsLabel}>Est. Savings</Text>
                                 <Text style={styles.savingsVal}>LKR {logisticsEstimate.savings}</Text>
                             </View>
                        </View>
                    </LinearGradient>
                    <View style={styles.glassShadow} />
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
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    scrollContent: { padding: 24 },
    header: { marginBottom: 32 },
    title: { fontFamily: 'Poppins_700Bold', fontSize: 28, color: '#0F172A' },
    subtitle: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: '#64748B' },

    mapWrapper: { marginBottom: 32, position: 'relative' },
    mapCard: { height: 200, borderRadius: 32, overflow: 'hidden', zIndex: 2, borderWidth: 1, borderColor: '#fff' },
    mapMock: { flex: 1, padding: 20 },
    mapShadow: { position: 'absolute', bottom: -10, left: 15, right: 15, height: 40, backgroundColor: '#3B82F6', borderRadius: 32, opacity: 0.1, zIndex: 1 },
    mapLine: { position: 'absolute', top: 100, left: 50, right: 50, height: 4, backgroundColor: '#3B82F6', opacity: 0.2, borderStyle: 'dotted' },
    markerStart: { position: 'absolute', top: 92, left: 50, width: 20, height: 20, borderRadius: 10, backgroundColor: '#10B981', borderWidth: 3, borderColor: '#fff' },
    markerEnd: { position: 'absolute', top: 92, right: 50, width: 20, height: 20, borderRadius: 10, backgroundColor: '#F59E0B', borderWidth: 3, borderColor: '#fff' },
    routeTag: { position: 'absolute', bottom: 20, left: 20, flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, gap: 4 },
    routeTagText: { fontFamily: 'Poppins_700Bold', fontSize: 10, color: '#fff' },
    mapOver: { position: 'absolute', top: 20, right: 20, backgroundColor: 'rgba(255,255,255,0.9)', padding: 12, borderRadius: 20, alignItems: 'center' },
    distVal: { fontFamily: 'Poppins_700Bold', fontSize: 20, color: '#1E293B' },
    distUnit: { fontFamily: 'Poppins_700Bold', fontSize: 8, color: '#94A3B8' },

    sectionTitle: { fontFamily: 'Poppins_700Bold', fontSize: 18, color: '#1E293B', marginBottom: 16 },
    modeGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 },
    modeCard: { width: '30%', backgroundColor: '#fff', borderRadius: 24, padding: 16, alignItems: 'center', borderWidth: 2, borderColor: '#F1F5F9' },
    modeIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    modeLabel: { fontFamily: 'Poppins_700Bold', fontSize: 12, color: '#475569' },
    modeTime: { fontFamily: 'Poppins_500Medium', fontSize: 10, color: '#94A3B8', marginTop: 2 },

    glassWrapper: { marginBottom: 32, position: 'relative' },
    glassCard: { borderRadius: 32, padding: 24, zIndex: 2, borderWidth: 1, borderColor: '#fff' },
    glassShadow: { position: 'absolute', bottom: -5, left: 15, right: 15, height: 30, backgroundColor: '#F1F5F9', borderRadius: 32, zIndex: 1 },
    resHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    resTitle: { fontFamily: 'Poppins_700Bold', fontSize: 18, color: '#1E293B' },
    resSub: { fontFamily: 'Poppins_400Regular', fontSize: 11, color: '#64748B' },
    rateBadge: { backgroundColor: '#F0FDF4', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
    rateText: { fontFamily: 'Poppins_700Bold', fontSize: 12, color: '#10B981' },
    divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 20 },
    costRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    totalLabel: { fontFamily: 'Poppins_500Medium', fontSize: 12, color: '#94A3B8' },
    totalVal: { fontFamily: 'Poppins_700Bold', fontSize: 24, color: '#0F172A' },
    savingsBox: { alignItems: 'flex-end' },
    savingsLabel: { fontFamily: 'Poppins_500Medium', fontSize: 11, color: '#10B981' },
    savingsVal: { fontFamily: 'Poppins_700Bold', fontSize: 16, color: '#10B981' },

    confirmBtn: { height: 64, borderRadius: 24, overflow: 'hidden', elevation: 12, shadowOpacity: 0.2, shadowRadius: 10 },
    btnGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    btnText: { fontFamily: 'Poppins_700Bold', fontSize: 16, color: '#fff' }
});
