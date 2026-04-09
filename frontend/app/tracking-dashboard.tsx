import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, ScrollView, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import Animated, { FadeInDown, FadeInUp, useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useUser } from '../context/UserContext';

const { width, height } = Dimensions.get('window');

// Trained Hub Coordinates (FIXED: Property names changed to latitude/longitude to prevent native crash)
const HUBS: Record<string, { latitude: number, longitude: number }> = {
    "Kandy": { latitude: 7.2906, longitude: 80.6337 },
    "Colombo": { latitude: 6.9271, longitude: 79.8612 },
    "Matale": { latitude: 7.4675, longitude: 80.6234 },
    "Galle": { latitude: 6.0535, longitude: 80.2210 },
    "Kurunegala": { latitude: 7.4863, longitude: 80.3647 },
};

export default function TrackingDashboard() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { profile } = useUser();
    
    const spice = params.spice || "Black Pepper";
    const status = params.status || "IN_TRANSIT";
    const mode = params.mode || "Van";
    const id = params.id || "ORD-9821";

    // Dynamic Linking: Use the user's picked location from Profile
    const customerLoc = useMemo(() => {
        const loc = profile.location;
        return {
            latitude: loc?.latitude || 6.9271,
            longitude: loc?.longitude || 79.8612
        };
    }, [profile.location]);

    const userDistrict = profile.location?.address || "your location";

    // Mock Farmer Hub (Matched to Kandy pattern)
    const farmerLoc = HUBS["Kandy"]; 

    // Generate Route Line based on dynamic endpoints
    const routePoints = useMemo(() => [
        farmerLoc,
        { 
            latitude: (farmerLoc.latitude + customerLoc.latitude) / 2 + 0.05, 
            longitude: (farmerLoc.longitude + customerLoc.longitude) / 2 + 0.05 
        },
        customerLoc
    ], [farmerLoc, customerLoc]);

    // Pulse animation for driver
    const pulse = useSharedValue(1);
    useEffect(() => {
        pulse.value = withRepeat(withSequence(withTiming(1.2, { duration: 1000 }), withTiming(1, { duration: 1000 })), -1);
    }, []);

    const pulseStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulse.value }],
        opacity: 0.5
    }));

    return (
        <View style={styles.container}>
            {/* Header Over Map */}
            <SafeAreaView style={styles.header} edges={['top']}>
                <Pressable style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={24} color="#0F172A" />
                </Pressable>
                <View style={styles.headerText}>
                    <Text style={styles.hTitle}>Route Intelligence</Text>
                    <Text style={styles.hId}>{id} • {spice}</Text>
                </View>
                <View style={styles.statusTag}>
                    <Text style={styles.statusText}>{status.replace('_', ' ')}</Text>
                </View>
            </SafeAreaView>

            {/* Live Map with Dynamic Linking */}
            <MapView
                provider={PROVIDER_GOOGLE}
                style={styles.map}
                region={{
                    latitude: (farmerLoc.latitude + customerLoc.latitude) / 2,
                    longitude: (farmerLoc.longitude + customerLoc.longitude) / 2,
                    latitudeDelta: Math.abs(farmerLoc.latitude - customerLoc.latitude) + 0.8,
                    longitudeDelta: Math.abs(farmerLoc.longitude - customerLoc.longitude) + 0.8,
                }}
            >
                <Polyline 
                    coordinates={routePoints}
                    strokeColor="#6366F1"
                    strokeWidth={4}
                    lineDashPattern={[5, 5]}
                />

                <Marker coordinate={farmerLoc} title="Origin Hub">
                    <View style={styles.markerCircle}>
                        <Ionicons name="leaf" size={16} color="#fff" />
                    </View>
                </Marker>

                <Marker coordinate={customerLoc} title="Safe Delivery Point">
                    <View style={[styles.markerCircle, { backgroundColor: '#F59E0B' }]}>
                        <Ionicons name="home" size={16} color="#fff" />
                    </View>
                </Marker>

                {status === 'IN_TRANSIT' && (
                    <Marker coordinate={routePoints[1]}>
                         <View style={styles.driverMarker}>
                            <Animated.View style={[styles.pulse, pulseStyle]} />
                            <View style={styles.driverCore}>
                                <Ionicons name="car-sport" size={18} color="#fff" />
                            </View>
                         </View>
                    </Marker>
                )}
            </MapView>

            <Animated.View entering={FadeInUp} style={styles.infoCardWrapper}>
                <View style={styles.infoCard}>
                    <View style={styles.dragHandle} />
                    <View style={styles.etaRow}>
                         <View>
                            <Text style={styles.etaLabel}>Destined for</Text>
                            <Text style={styles.etaValue}>{userDistrict}</Text>
                         </View>
                         <View style={styles.etaIcon}>
                            <Ionicons name="bus-outline" size={24} color="#6366F1" />
                         </View>
                    </View>

                    <View style={styles.commPanel}>
                        <View style={styles.conInfo}>
                            <View style={styles.conAvatar} />
                            <View>
                                <Text style={styles.conName}>Driver Assigned</Text>
                                <Text style={styles.conRole}>Certified Logistics Agent</Text>
                            </View>
                        </View>
                        <Pressable style={styles.callBtn} onPress={() => Linking.openURL('tel:0712345678')}>
                             <Ionicons name="call" size={20} color="#fff" />
                        </Pressable>
                    </View>
                </View>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    map: { width, height: height * 0.75 },
    header: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', padding: 20, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.92)' },
    backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', elevation: 2 },
    headerText: { flex: 1, paddingLeft: 16 },
    hTitle: { fontFamily: 'Poppins_700Bold', fontSize: 18, color: '#0F172A' },
    hId: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: '#64748B' },
    statusTag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: '#EEF2FF' },
    statusText: { fontFamily: 'Poppins_700Bold', fontSize: 10, color: '#6366F1', textTransform: 'uppercase' },

    markerCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#fff', elevation: 8, shadowOpacity: 0.1 },
    driverMarker: { alignItems: 'center', justifyContent: 'center' },
    pulse: { position: 'absolute', width: 48, height: 48, borderRadius: 24, backgroundColor: '#6366F1', opacity: 0.4 },
    driverCore: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#6366F1', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },

    infoCardWrapper: { position: 'absolute', bottom: 0, left: 0, right: 0 },
    infoCard: { backgroundColor: '#fff', borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 32, elevation: 32, shadowOpacity: 0.1, shadowRadius: 30 },
    dragHandle: { width: 40, height: 4, backgroundColor: '#F1F5F9', borderRadius: 2, alignSelf: 'center', marginBottom: 28 },
    etaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    etaLabel: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: '#64748B' },
    etaValue: { fontFamily: 'Poppins_700Bold', fontSize: 24, color: '#0F172A' },
    etaIcon: { width: 64, height: 64, borderRadius: 22, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' },
    commPanel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC', padding: 20, borderRadius: 28 },
    conInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    conAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E2E8F0' },
    conName: { fontFamily: 'Poppins_700Bold', fontSize: 15, color: '#1E293B' },
    conRole: { fontFamily: 'Poppins_400Regular', fontSize: 11, color: '#64748B' },
    callBtn: { width: 52, height: 52, borderRadius: 16, backgroundColor: '#6366F1', justifyContent: 'center', alignItems: 'center', elevation: 4 }
});
