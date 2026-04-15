import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, Linking, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import Animated, { FadeInUp, useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';

const { width, height } = Dimensions.get('window');

const HUBS: Record<string, { latitude: number; longitude: number }> = {
    "Kandy":      { latitude: 7.2906, longitude: 80.6337 },
    "Colombo":    { latitude: 6.9271, longitude: 79.8612 },
    "Matale":     { latitude: 7.4675, longitude: 80.6234 },
    "Galle":      { latitude: 6.0535, longitude: 80.2210 },
    "Kurunegala": { latitude: 7.4863, longitude: 80.3647 },
};

export default function TrackingDashboard() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { profile } = useUser();
    const { theme } = useTheme();

    const spice  = params.spice  || "Black Pepper";
    const status = params.status || "IN_TRANSIT";
    const mode   = params.mode   || "Van";
    const id     = params.id     || "ORD-9821";

    const originRegion = "Matale (Central Province)";
    const temp = "26.9°C";
    const rainfall = "51.3mm";

    const MOCK_TRACE = [
        { title: "Origin Verified", desc: `Sourced from certified growers in ${originRegion}`, icon: "leaf", color: "#10B981" },
        { title: "Climate Footprint", desc: `Harvested during optimal conditions (${temp}, ${rainfall} rain)`, icon: "partly-sunny", color: "#F59E0B" },
        { title: "Quality Locked", desc: "Moisture content verified at 12% premium grade", icon: "shield-checkmark", color: "#6366F1" },
        { title: "Chain of Custody", desc: `Dispatched & secured via ${mode} logistics`, icon: "lock-closed", color: "#8B5CF6" }
    ];

    const customerLoc = useMemo(() => ({
        latitude: profile.location?.latitude || 6.9271,
        longitude: profile.location?.longitude || 79.8612,
    }), [profile.location]);

    const userDistrict = profile.location?.address || "your location";
    const farmerLoc = HUBS["Kandy"];

    const routePoints = useMemo(() => [
        farmerLoc,
        { latitude: (farmerLoc.latitude + customerLoc.latitude) / 2 + 0.05, longitude: (farmerLoc.longitude + customerLoc.longitude) / 2 + 0.05 },
        customerLoc,
    ], [farmerLoc, customerLoc]);

    const pulse = useSharedValue(1);
    useEffect(() => {
        pulse.value = withRepeat(withSequence(withTiming(1.2, { duration: 1000 }), withTiming(1, { duration: 1000 })), -1);
    }, []);
    const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }], opacity: 0.5 }));

    return (
        <View style={[styles.container, { backgroundColor: theme.bg }]}>
            {/* Header overlaid on map */}
            <SafeAreaView style={[styles.header, { backgroundColor: theme.mode === 'dark' ? 'rgba(15,23,42,0.92)' : 'rgba(255,255,255,0.92)' }]} edges={['top']}>
                <Pressable style={[styles.backBtn, { backgroundColor: theme.bgCard }]} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={24} color={theme.textPrimary} />
                </Pressable>
                <View style={styles.headerText}>
                    <Text style={[styles.hTitle, { color: theme.textPrimary }]}>Route Intelligence</Text>
                    <Text style={[styles.hId, { color: theme.textMuted }]}>{id} · {spice}</Text>
                </View>
                <View style={[styles.statusTag, { backgroundColor: theme.mode === 'dark' ? '#12133a' : '#EEF2FF' }]}>
                    <Text style={[styles.statusText, { color: theme.indigo }]}>
                        {(status as string).replace('_', ' ')}
                    </Text>
                </View>
            </SafeAreaView>

            {/* Map */}
            <MapView
                provider={PROVIDER_GOOGLE}
                style={styles.map}
                region={{
                    latitude:  (farmerLoc.latitude  + customerLoc.latitude)  / 2,
                    longitude: (farmerLoc.longitude + customerLoc.longitude) / 2,
                    latitudeDelta:  Math.abs(farmerLoc.latitude  - customerLoc.latitude)  + 0.8,
                    longitudeDelta: Math.abs(farmerLoc.longitude - customerLoc.longitude) + 0.8,
                }}
            >
                <Polyline coordinates={routePoints} strokeColor={theme.indigo} strokeWidth={4} lineDashPattern={[5, 5]} />
                <Marker coordinate={farmerLoc} title="Origin Hub">
                    <View style={styles.markerCircle}>
                        <Ionicons name="leaf" size={16} color="#fff" />
                    </View>
                </Marker>
                <Marker coordinate={customerLoc} title="Delivery Point">
                    <View style={[styles.markerCircle, { backgroundColor: '#F59E0B' }]}>
                        <Ionicons name="home" size={16} color="#fff" />
                    </View>
                </Marker>
                {status === 'IN_TRANSIT' && (
                    <Marker coordinate={routePoints[1]}>
                        <View style={styles.driverMarker}>
                            <Animated.View style={[styles.pulse, pulseStyle, { backgroundColor: theme.indigo }]} />
                            <View style={[styles.driverCore, { backgroundColor: theme.indigo }]}>
                                <Ionicons name="car-sport" size={18} color="#fff" />
                            </View>
                        </View>
                    </Marker>
                )}
            </MapView>

            {/* Bottom Info Sheet */}
            <Animated.View entering={FadeInUp} style={styles.infoCardWrapper}>
                <View style={[styles.infoCard, { backgroundColor: theme.bgCard }]}>
                    <View style={[styles.dragHandle, { backgroundColor: theme.border }]} />
                    <ScrollView style={{ flexGrow: 0, maxHeight: height * 0.55 }} showsVerticalScrollIndicator={false}>
                        <View style={styles.etaRow}>
                            <View>
                                <Text style={[styles.etaLabel, { color: theme.textMuted }]}>Destined for</Text>
                                <Text style={[styles.etaValue, { color: theme.textPrimary }]}>{userDistrict}</Text>
                            </View>
                            <View style={[styles.etaIcon, { backgroundColor: theme.mode === 'dark' ? '#12133a' : '#EEF2FF' }]}>
                                <Ionicons name="bus-outline" size={24} color={theme.indigo} />
                            </View>
                        </View>

                        <View style={[styles.commPanel, { backgroundColor: theme.bgSecondary }]}>
                            <View style={styles.conInfo}>
                                <View style={[styles.conAvatar, { backgroundColor: theme.border }]} />
                                <View>
                                    <Text style={[styles.conName, { color: theme.textPrimary }]}>Driver Assigned</Text>
                                    <Text style={[styles.conRole, { color: theme.textMuted }]}>Certified Logistics Agent</Text>
                                </View>
                            </View>
                            <Pressable
                                style={[styles.callBtn, { backgroundColor: theme.indigo }]}
                                onPress={() => Linking.openURL('tel:0712345678')}
                            >
                                <Ionicons name="call" size={20} color="#fff" />
                            </Pressable>
                        </View>

                        {/* Traceability Timeline */}
                        <View style={styles.traceSection}>
                            <Text style={[styles.traceHeader, { color: theme.textPrimary }]}>The Spice Journey</Text>
                            <Text style={[styles.traceSub, { color: theme.textMuted }]}>Immutable supply chain tracking</Text>
                            
                            <View style={styles.timeline}>
                                {MOCK_TRACE.map((step, index) => (
                                    <View key={index} style={styles.timelineStep}>
                                        <View style={styles.timelineIconCol}>
                                            <View style={[styles.timelineIconBg, { backgroundColor: step.color + '20' }]}>
                                                <Ionicons name={step.icon as any} size={16} color={step.color} />
                                            </View>
                                            {index < MOCK_TRACE.length - 1 && <View style={[styles.timelineLine, { backgroundColor: theme.border }]} />}
                                        </View>
                                        <View style={styles.timelineTextCol}>
                                            <Text style={[styles.stepTitle, { color: theme.textPrimary }]}>{step.title}</Text>
                                            <Text style={[styles.stepDesc, { color: theme.textSecondary }]}>{step.desc}</Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        </View>
                    </ScrollView>
                </View>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    map: { width, height: height * 0.75 },
    header: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', padding: 20, zIndex: 10 },
    backBtn: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', elevation: 2 },
    headerText: { flex: 1, paddingLeft: 16 },
    hTitle: { fontFamily: 'Poppins_700Bold', fontSize: 18 },
    hId: { fontFamily: 'Poppins_500Medium', fontSize: 13 },
    statusTag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
    statusText: { fontFamily: 'Poppins_700Bold', fontSize: 10, textTransform: 'uppercase' },
    markerCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#fff', elevation: 8 },
    driverMarker: { alignItems: 'center', justifyContent: 'center' },
    pulse: { position: 'absolute', width: 48, height: 48, borderRadius: 24 },
    driverCore: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
    infoCardWrapper: { position: 'absolute', bottom: 0, left: 0, right: 0 },
    infoCard: { borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 32, elevation: 32, shadowOpacity: 0.1, shadowRadius: 30 },
    dragHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 28 },
    etaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    etaLabel: { fontFamily: 'Poppins_500Medium', fontSize: 13 },
    etaValue: { fontFamily: 'Poppins_700Bold', fontSize: 24 },
    etaIcon: { width: 64, height: 64, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    commPanel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderRadius: 28 },
    conInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    conAvatar: { width: 44, height: 44, borderRadius: 22 },
    conName: { fontFamily: 'Poppins_700Bold', fontSize: 15 },
    conRole: { fontFamily: 'Poppins_400Regular', fontSize: 11 },
    callBtn: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center', elevation: 4 },
    traceSection: { marginTop: 24, paddingTop: 24, borderTopWidth: 1, borderTopColor: 'rgba(150,150,150,0.1)' },
    traceHeader: { fontFamily: 'Poppins_700Bold', fontSize: 15 },
    traceSub: { fontFamily: 'Poppins_400Regular', fontSize: 11, marginBottom: 16 },
    timeline: { paddingLeft: 4 },
    timelineStep: { flexDirection: 'row', gap: 16, marginBottom: 4 },
    timelineIconCol: { alignItems: 'center', width: 32 },
    timelineIconBg: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    timelineLine: { width: 2, height: 28, marginVertical: 4 },
    timelineTextCol: { flex: 1, paddingTop: 4 },
    stepTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 13 },
    stepDesc: { fontFamily: 'Poppins_400Regular', fontSize: 11, marginTop: 2, paddingBottom: 12 },
});
