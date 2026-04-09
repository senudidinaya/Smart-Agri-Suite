import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

// 5 CORE SPICES - BRIDGED DATA STRUCTURE
const SPICES = [
    { id: '1', name: 'Cinnamon', color: '#F59E0B', regions: ['Colombo', 'Galle', 'Negombo'] }, 
    { id: '2', name: 'Pepper', color: '#1E293B', regions: ['Matale', 'Kandy', 'Dambulla'] }, 
    { id: '3', name: 'Cardamom', color: '#10B981', regions: ['Kandy', 'Nuwara Eliya', 'Matale'] }, 
    { id: '4', name: 'Clove', color: '#8B5CF6', regions: ['Gampola', 'Kegalle', 'Kandy'] }, 
    { id: '5', name: 'Nutmeg', color: '#EC4899', regions: ['Mawanella', 'Kegalle', 'Colombo'] },
];

const REGION_COORDS: Record<string, { lat: number, lng: number, demand: number }> = {
    'Colombo': { lat: 6.9271, lng: 79.8612, demand: 94 },
    'Kandy': { lat: 7.2906, lng: 80.6337, demand: 80 },
    'Matale': { lat: 7.4675, lng: 80.6234, demand: 70 },
    'Galle': { lat: 6.0535, lng: 80.2210, demand: 58 },
    'Dambulla': { lat: 7.8601, lng: 80.6517, demand: 84 },
    'Negombo': { lat: 7.2089, lng: 79.8351, demand: 50 },
    'Nuwara Eliya': { lat: 6.9497, lng: 80.7891, demand: 45 },
    'Gampola': { lat: 7.1654, lng: 80.5739, demand: 40 },
    'Kegalle': { lat: 7.2520, lng: 80.3450, demand: 66 },
    'Mawanella': { lat: 7.2550, lng: 80.4480, demand: 60 },
};

export default function DemandMapTracker() {
    // State Persistence
    const [spice, setSpice] = useState(SPICES[0]);
    const [activeRegion, setActiveRegion] = useState('Colombo');

    // High-Assurance Analysis Engine
    const analysis = useMemo(() => {
        const reg = REGION_COORDS[activeRegion] || REGION_COORDS['Colombo'];
        const isHot = (spice?.regions || []).includes(activeRegion);
        
        const score = isHot ? reg.demand + 12 : reg.demand - 12;
        
        return {
            status: score > 88 ? 'PEAK DEMAND' : score > 68 ? 'HIGH INTEREST' : 'STABLE',
            color: score > 88 ? '#EF4444' : score > 68 ? '#F59E0B' : '#10B981',
            price: 1580 + (score * 14),
            momentum: isHot ? '+18% Peak' : 'Constant',
            logistics: isHot ? 'Route Priority' : 'Standard'
        };
    }, [spice, activeRegion]);

    const handleSpiceSelect = useCallback((s: typeof SPICES[0]) => {
        setSpice(s);
    }, []);

    return (
        <View style={styles.container}>
            {/* Header Intelligence Hub */}
            <SafeAreaView style={styles.topHeader} edges={['top']}>
                <View style={styles.topInner}>
                    <View>
                        <Text style={styles.title}>Heatmap Studio</Text>
                        <Text style={styles.subtitle}>Regional Supply Intelligence Index</Text>
                    </View>
                    <View style={styles.verifiedBox}>
                        <View style={styles.verifiedDot} />
                        <Text style={styles.verifiedText}>MODEL VERIFIED</Text>
                    </View>
                </View>
                
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.spiceList}>
                    {SPICES.map((s) => (
                        <Pressable 
                            key={`spice-${s.name}`} 
                            onPress={() => handleSpiceSelect(s)}
                            style={[styles.spicePill, spice.name === s.name && { backgroundColor: s.color, borderColor: s.color }]}
                        >
                            <Text style={[styles.pillLabel, spice.name === s.name && { color: '#fff' }]}>{s.name}</Text>
                        </Pressable>
                    ))}
                </ScrollView>
            </SafeAreaView>

            {/* INTERACTIVE GEOMAP - CRASH-SAFE & UNIFORM */}
            <MapView
                provider={PROVIDER_GOOGLE}
                style={styles.mapView}
                initialRegion={{
                    latitude: 7.25,
                    longitude: 80.6,
                    latitudeDelta: 2.5,
                    longitudeDelta: 2.5,
                }}
            >
                {/* Heat Radius Overlay - Unified Format for all 5 Spices */}
                {spice.regions.map((regionName, index) => {
                    const coords = REGION_COORDS[regionName];
                    if (!coords) return null;
                    return (
                        <Circle 
                            key={`radius-${spice.name}-${regionName}-${index}`}
                            center={{ latitude: coords.lat, longitude: coords.lng }}
                            radius={22000} // Uniform 22km Radius
                            fillColor={`${spice.color}25`} // Uniform 15% Branded Wash
                            strokeColor={spice.color}
                            strokeWidth={2}
                        />
                    );
                })}

                {/* Regional Hotspots */}
                {Object.keys(REGION_COORDS).map((name) => (
                    <Marker 
                        key={`mark-${name}`}
                        coordinate={{ latitude: REGION_COORDS[name].lat, longitude: REGION_COORDS[name].lng }}
                        onPress={() => setActiveRegion(name)}
                    >
                        <View style={[
                            styles.pinContainer, 
                            activeRegion === name && { borderColor: spice.color, transform: [{scale: 1.15}] }
                        ]}>
                             <View style={[
                                 styles.pinDot, 
                                 { backgroundColor: (spice?.regions || []).includes(name) ? spice.color : '#CBD5E1' }
                             ]} />
                        </View>
                    </Marker>
                ))}
            </MapView>

            {/* Floating Intelligence Sheet */}
            <Animated.View entering={FadeInUp} style={styles.sheetContainer}>
                <View style={styles.sheetBody}>
                    <View style={styles.handleBar} />
                    
                    <View style={styles.sheetHeader}>
                        <View>
                            <Text style={styles.regTitle}>{activeRegion}</Text>
                            <View style={[styles.statusTag, { backgroundColor: analysis.color + '15' }]}>
                                <Text style={[styles.statusLabel, { color: analysis.color }]}>{analysis.status}</Text>
                            </View>
                        </View>
                        <View style={styles.priceContainer}>
                            <Text style={styles.priceLabel}>Predicted Regional Value</Text>
                            <Text style={styles.priceValue}>LKR {analysis.price.toLocaleString()}/kg</Text>
                        </View>
                    </View>

                    <View style={styles.statsRow}>
                        <View style={styles.statCell}>
                            <Text style={styles.statL}>Market Interest</Text>
                            <Text style={[styles.statV, { color: analysis.momentum.includes('Peak') ? '#10B981' : '#64748B' }]}>
                                {analysis.momentum}
                            </Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statCell}>
                            <Text style={styles.statL}>Route Logistics</Text>
                            <Text style={styles.statV}>{analysis.logistics}</Text>
                        </View>
                    </View>

                    <Pressable style={styles.confirmBtn}>
                         <LinearGradient colors={['#1E293B', '#0F172A']} style={styles.btnInner}>
                             <Text style={styles.btnLabel}>Confirm Logistics for {activeRegion}</Text>
                             <Ionicons name="shield-checkmark" size={18} color="#fff" />
                         </LinearGradient>
                    </Pressable>
                </View>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    mapView: { width, height: height * 0.75 },

    topHeader: { 
        position: 'absolute', top: 0, left: 0, right: 0, 
        padding: 24, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.92)',
        borderBottomLeftRadius: 36, borderBottomRightRadius: 36
    },
    topInner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    title: { fontFamily: 'Poppins_700Bold', fontSize: 24, color: '#0F172A' },
    subtitle: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: '#64748B' },
    verifiedBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDF4', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    verifiedDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', marginRight: 8 },
    verifiedText: { fontFamily: 'Poppins_700Bold', fontSize: 9, color: '#166534' },

    spiceList: { overflow: 'visible' },
    spicePill: { 
        paddingHorizontal: 20, paddingVertical: 12, borderRadius: 18, 
        backgroundColor: '#fff', marginRight: 12, borderWidth: 1, borderColor: '#F1F5F9' 
    },
    pillLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: '#64748B' },

    pinContainer: { 
        width: 26, height: 26, borderRadius: 13, backgroundColor: '#fff', 
        justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff', elevation: 8 
    },
    pinDot: { width: 14, height: 14, borderRadius: 7 },

    sheetContainer: { position: 'absolute', bottom: 0, left: 0, right: 0 },
    sheetBody: { 
        backgroundColor: '#fff', borderTopLeftRadius: 40, borderTopRightRadius: 40, 
        padding: 32, paddingBottom: 115, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 30, elevation: 32 
    },
    handleBar: { width: 40, height: 4, backgroundColor: '#F1F5F9', borderRadius: 2, alignSelf: 'center', marginBottom: 28 },
    
    sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 },
    regTitle: { fontFamily: 'Poppins_700Bold', fontSize: 28, color: '#0F172A' },
    statusTag: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10, alignSelf: 'flex-start', marginTop: 8 },
    statusLabel: { fontFamily: 'Poppins_700Bold', fontSize: 10 },
    priceContainer: { alignItems: 'flex-end' },
    priceLabel: { fontFamily: 'Poppins_500Medium', fontSize: 10, color: '#94A3B8' },
    priceValue: { fontFamily: 'Poppins_700Bold', fontSize: 18, color: '#10B981', marginTop: 4 },

    statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 },
    statCell: { flex: 1, alignItems: 'center' },
    statL: { fontFamily: 'Poppins_500Medium', fontSize: 11, color: '#94A3B8' },
    statV: { fontFamily: 'Poppins_700Bold', fontSize: 14, color: '#1E293B', marginTop: 4 },
    statDivider: { width: 1, height: 30, backgroundColor: '#F1F5F9', marginTop: 8 },

    confirmBtn: { height: 64, borderRadius: 24, overflow: 'hidden' },
    btnInner: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 },
    btnLabel: { fontFamily: 'Poppins_700Bold', fontSize: 15, color: '#fff' }
});
