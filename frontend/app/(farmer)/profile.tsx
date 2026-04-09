import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, ScrollView, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useUser } from '../../context/UserContext';

const { width, height } = Dimensions.get('window');

// ALL SYNCED FARMERS FROM CUSTOMER MARKETPLACE
const GLOBAL_FARMERS = [
    { id: 'f1', name: 'Kamal Silva', spice: 'Pepper', lat: 7.2916, lng: 80.6347 },
    { id: 'f2', name: 'Pathum Nissanka', spice: 'Nutmeg', lat: 7.2896, lng: 80.6327 },
    { id: 'f3', name: 'M. Siriwardena', spice: 'Clove', lat: 7.2936, lng: 80.6317 },
    { id: 'f4', name: 'Sunil Perera', spice: 'Cinnamon', lat: 7.4685, lng: 80.6244 },
    { id: 'f5', name: 'Aruna Jayamaha', spice: 'Cardamom', lat: 7.4665, lng: 80.6224 },
    { id: 'f6', name: 'Bandula Warnapura', spice: 'Clove', lat: 7.4695, lng: 80.6254 },
    { id: 'f7', name: 'Linton Fernando', spice: 'Pepper', lat: 7.2523, lng: 80.3474 },
    { id: 'f8', name: 'G. Piyadasa', spice: 'Cinnamon', lat: 6.0545, lng: 80.2220 },
];

const SPICES = ['Cinnamon', 'Pepper', 'Cardamom', 'Clove', 'Nutmeg'];

export default function FarmerProfile() {
    const router = useRouter();
    const { profile, updateProfile } = useUser();
    
    const [name, setName] = useState(profile.name || '');
    const [phone, setPhone] = useState(profile.phoneNumber || '');
    const [preferredSpice, setPreferredSpice] = useState(profile.preferredSpice || SPICES[0]);
    const [selectedLocation, setSelectedLocation] = useState(profile.location || {
        latitude: 7.2906,
        longitude: 80.6337,
        address: 'Kandy'
    });

    const handleSaveProfile = () => {
        if (!name || !phone) return Alert.alert("Missing Info", "Please provide your name and phone number for the marketplace.");
        
        updateProfile({ 
            name, 
            phoneNumber: phone, 
            preferredSpice,
            location: selectedLocation 
        });
        
        Alert.alert("Success", "Operational Hub and Profile updated successfully!");
        router.back();
    };

    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.header} edges={['top']}>
                <Pressable onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color="#0F172A" />
                </Pressable>
                <Text style={styles.headerTitle}>Agri-Hub Profile</Text>
            </SafeAreaView>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                
                {/* Profile Fields */}
                <Animated.View entering={FadeInDown} style={styles.fieldSection}>
                    <Text style={styles.inputLabel}>Full Name</Text>
                    <View style={styles.inputBox}>
                        <Ionicons name="person-outline" size={20} color="#94A3B8" />
                        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Your Harvest Name" />
                    </View>

                    <Text style={styles.inputLabel}>Phone Number</Text>
                    <View style={styles.inputBox}>
                        <Ionicons name="call-outline" size={20} color="#94A3B8" />
                        <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="+94 7X XXX XXXX" keyboardType="phone-pad" />
                    </View>

                    <Text style={styles.inputLabel}>Primary Specialty</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.spiceList}>
                        {SPICES.map(s => (
                            <Pressable 
                                key={s} 
                                onPress={() => setPreferredSpice(s)} 
                                style={[styles.spicePill, preferredSpice === s && { backgroundColor: '#10B981', borderColor: '#10B981' }]}
                            >
                                <Text style={[styles.spicePillText, preferredSpice === s && { color: '#fff' }]}>{s}</Text>
                            </Pressable>
                        ))}
                    </ScrollView>
                </Animated.View>

                {/* Hub Selection Map */}
                <View style={styles.mapHeaderRow}>
                    <View>
                        <Text style={styles.sectionTitle}>Global Network Map</Text>
                        <Text style={styles.sectionSub}>Select your location hub and see partners</Text>
                    </View>
                </View>

                <Animated.View entering={FadeInUp} style={styles.mapWrapper}>
                    <MapView
                        provider={PROVIDER_GOOGLE}
                        style={styles.map}
                        initialRegion={{
                            latitude: selectedLocation.latitude,
                            longitude: selectedLocation.longitude,
                            latitudeDelta: 0.1,
                            longitudeDelta: 0.1,
                        }}
                        onPress={(e) => {
                            setSelectedLocation({
                                ...selectedLocation,
                                latitude: e.nativeEvent.coordinate.latitude,
                                longitude: e.nativeEvent.coordinate.longitude,
                                address: selectedLocation.address // Keep existing address text for now
                            });
                        }}
                    >
                        {/* Your Hub */}
                        <Marker 
                            coordinate={selectedLocation} 
                            title="Your Listing Hub"
                            pinColor="#EF4444"
                            zIndex={10}
                        />

                        {/* ALL GLOBAL FARMERS */}
                        {GLOBAL_FARMERS.map(f => (
                            <Marker 
                                key={f.id}
                                coordinate={{ latitude: f.lat, longitude: f.lng }}
                                title={`${f.name} • ${f.spice}`}
                            >
                                <View style={styles.farmerPin}>
                                    <Ionicons name="leaf" size={14} color="#fff" />
                                </View>
                            </Marker>
                        ))}
                    </MapView>
                    <View style={styles.coordBox}>
                        <Text style={styles.coordText}>Selected: {selectedLocation.latitude.toFixed(4)}, {selectedLocation.longitude.toFixed(4)}</Text>
                    </View>
                </Animated.View>

                <Pressable style={styles.saveBtn} onPress={handleSaveProfile}>
                    <LinearGradient colors={['#10B981', '#059669']} style={styles.saveBtnG}>
                        <Text style={styles.saveBtnText}>Confirm Profile & Location</Text>
                    </LinearGradient>
                </Pressable>

                <View style={{ height: 100 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 24, paddingBottom: 16, backgroundColor: '#fff', elevation: 2 },
    backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    headerTitle: { fontFamily: 'Poppins_700Bold', fontSize: 20, color: '#0F172A' },
    
    scrollContent: { padding: 24 },
    fieldSection: { marginBottom: 32 },
    inputLabel: { fontFamily: 'Poppins_700Bold', fontSize: 13, color: '#64748B', marginBottom: 10, marginLeft: 4 },
    inputBox: { height: 60, backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#F1F5F9', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 20, elevation: 2 },
    input: { flex: 1, marginLeft: 12, fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: '#0F172A' },
    
    spiceList: { flexGrow: 0, marginBottom: 8 },
    spicePill: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, backgroundColor: '#fff', marginRight: 10, borderWidth: 1, borderColor: '#F1F5F9', elevation: 2 },
    spicePillText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: '#64748B' },

    sectionTitle: { fontFamily: 'Poppins_700Bold', fontSize: 18, color: '#1E293B' },
    sectionSub: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: '#64748B', marginBottom: 20, marginTop: 4 },
    
    mapWrapper: { height: 350, borderRadius: 32, overflow: 'hidden', elevation: 12, shadowOpacity: 0.1, position: 'relative' },
    map: { flex: 1 },
    coordBox: { position: 'absolute', top: 16, left: 16, backgroundColor: 'rgba(15, 23, 42, 0.8)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
    coordText: { color: '#fff', fontFamily: 'Poppins_700Bold', fontSize: 10 },

    saveBtn: { height: 64, borderRadius: 24, overflow: 'hidden', marginTop: 32, elevation: 8 },
    saveBtnG: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    saveBtnText: { fontFamily: 'Poppins_700Bold', fontSize: 16, color: '#fff' },

    farmerPin: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center', elevation: 4, borderWidth: 2, borderColor: '#fff' }
});
