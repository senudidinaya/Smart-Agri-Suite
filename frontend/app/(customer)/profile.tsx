import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, Dimensions, ActivityIndicator, Switch, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useUser } from '../../context/UserContext';
import { useLanguage } from '../../context/LanguageContext';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

// For demo purposes, we map coords to Sri Lankan districts
const DISTRICTS = [
    { name: "Colombo", lat: 6.9271, lng: 79.8612 },
    { name: "Kandy", lat: 7.2906, lng: 80.6337 },
    { name: "Matale", lat: 7.4675, lng: 80.6234 },
    { name: "Galle", lat: 6.0535, lng: 80.2210 },
    { name: "Ratnapura", lat: 6.6828, lng: 80.3992 },
    { name: "Kurunegala", lat: 7.4863, lng: 80.3647 },
    { name: "Matara", lat: 5.9549, lng: 80.5550 },
    { name: "Nuwara Eliya", lat: 6.9497, lng: 80.7891 },
    { name: "Kegalle", lat: 7.2513, lng: 80.3464 },
];

// Mock Farmer Locations for Visualization (Universal across SL)
const FARMERS = [
    // Cinnamon (Coastal & Low Country)
    { id: 'f1', name: 'Galle Coastal Hub', lat: 6.0367, lng: 80.2170, spice: 'Cinnamon' },
    { id: 'f2', name: 'Matara Lowlands', lat: 5.9485, lng: 80.5353, spice: 'Cinnamon' },
    { id: 'f3', name: 'Kalutara Estate', lat: 6.5854, lng: 79.9607, spice: 'Cinnamon' },
    
    // Pepper (Mid Country & Intermediate Zone)
    { id: 'f4', name: 'Kandy Hill Pepper', lat: 7.2906, lng: 80.6337, spice: 'Pepper' },
    { id: 'f5', name: 'Matale Spice Valley', lat: 7.4675, lng: 80.6234, spice: 'Pepper' },
    { id: 'f6', name: 'Kurunegala Dry-Pepper', lat: 7.4863, lng: 80.3647, spice: 'Pepper' },
    { id: 'f7', name: 'Ratnapura Gem-Spice', lat: 6.6828, lng: 80.3992, spice: 'Pepper' },
    
    // Cardamom (Central Highlands)
    { id: 'f8', name: 'Nwara Eliya Highs', lat: 6.9497, lng: 80.7891, spice: 'Cardamom' },
    { id: 'f9', name: 'Knuckles Range Pods', lat: 7.4333, lng: 80.7833, spice: 'Cardamom' },
    
    // Clove & Nutmeg (Wet Zone & Kandyan Forest Gardens)
    { id: 'f10', name: 'Kegalle Forest Garden', lat: 7.2513, lng: 80.3464, spice: 'Nutmeg' },
    { id: 'f11', name: 'Kandy Clove Estate', lat: 7.3200, lng: 80.6500, spice: 'Clove' },
    { id: 'f12', name: 'Galle Southern Clove', lat: 6.1000, lng: 80.2500, spice: 'Clove' },
];

function findNearestDistrict(lat: number, lng: number) {
    let minDiff = Infinity;
    let nearest = "Colombo";
    DISTRICTS.forEach(d => {
        const diff = Math.sqrt(Math.pow(lat - d.lat, 2) + Math.pow(lng - d.lng, 2));
        if (diff < minDiff) {
            minDiff = diff;
            nearest = d.name;
        }
    });
    return nearest;
}

export default function CustomerProfile() {
    const { profile, updateProfile } = useUser();
    const { language, setLanguage } = useLanguage();
    const [name, setName] = useState(profile.name);
    const [email, setEmail] = useState(profile.email);
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccessBanner, setShowSuccessBanner] = useState(false);
    
    const [selectedLoc, setSelectedLoc] = useState({
        latitude: profile.location?.latitude || 6.9271,
        longitude: profile.location?.longitude || 79.8612,
    });

    const [locationName, setLocationName] = useState(profile.location?.address || "Colombo");

    useEffect(() => {
        const nearest = findNearestDistrict(selectedLoc.latitude, selectedLoc.longitude);
        setLocationName(nearest);
    }, [selectedLoc]);

    const handleLanguageToggle = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setLanguage(language === "en" ? "si" : "en");
    };

    const handleSave = () => {
        setIsSaving(true);
        setTimeout(() => {
            updateProfile({
                name,
                email,
                location: {
                    latitude: selectedLoc.latitude,
                    longitude: selectedLoc.longitude,
                    address: locationName
                }
            });
            setIsSaving(false);
            setShowSuccessBanner(true);
            setTimeout(() => setShowSuccessBanner(false), 4000);
        }, 800);
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {showSuccessBanner && (
                <Animated.View entering={FadeInDown} exiting={FadeOutUp} style={styles.successBanner}>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.successBannerText}>Location successfully picked! You can tap to update again at any time.</Text>
                </Animated.View>
            )}

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
                    <Text style={styles.title}>Account Setup</Text>
                    <Text style={styles.subtitle}>Current Location: <Text style={styles.activeLoc}>{locationName}</Text></Text>
                </Animated.View>

                {/* Form */}
                <Animated.View entering={FadeInDown.delay(200)} style={styles.section}>
                    <Text style={styles.label}>Full Name</Text>
                    <TextInput 
                        style={styles.input} 
                        value={name} 
                        onChangeText={setName} 
                        placeholder="Your Name"
                    />

                    <Text style={styles.label}>Email Address</Text>
                    <TextInput 
                        style={styles.input} 
                        value={email} 
                        onChangeText={setEmail} 
                        placeholder="email@example.com"
                        keyboardType="email-address"
                    />
                </Animated.View>

                {/* Language Section */}
                <Animated.View entering={FadeInDown.delay(250)} style={styles.section}>
                    <Text style={styles.label}>Language Preferences</Text>
                    <View style={styles.langBox}>
                         <View style={{ flex: 1 }}>
                            <Text style={styles.langTitle}>{language === 'en' ? 'App Language' : 'යෙදුම් භාෂාව'}</Text>
                            <Text style={styles.langSubtitle}>{language === 'en' ? 'Select between English and Sinhala' : 'ඉංග්‍රීසි සහ සිංහල අතර තෝරන්න'}</Text>
                         </View>
                         <View style={styles.toggleRow}>
                            <Text style={[styles.langLabel, language === 'en' && styles.activeLang]}>EN</Text>
                            <Switch
                                trackColor={{ false: "#CBD5E1", true: "#3B82F6" }}
                                thumbColor={"#ffffff"}
                                ios_backgroundColor="#CBD5E1"
                                onValueChange={handleLanguageToggle}
                                value={language === "si"}
                                style={{ transform: [{ scale: 0.8 }] }}
                            />
                            <Text style={[styles.langLabel, language === 'si' && styles.activeLang]}>SI</Text>
                         </View>
                    </View>
                </Animated.View>

                {/* Location Map */}
                <Animated.View entering={FadeInDown.delay(300)} style={styles.section}>
                    <View style={styles.labelRow}>
                        <Text style={styles.label}>Logistics Drop-off Point</Text>
                        <View style={styles.geoBadge}>
                             <Text style={styles.geoBadgeText}>{locationName}</Text>
                        </View>
                    </View>
                    <Text style={styles.infoText}>Identify your delivery point. We've mapped all {FARMERS.length} active farmer pods across Sri Lanka for you.</Text>
                    
                    <View style={styles.mapWrapper}>
                        <MapView
                            provider={PROVIDER_GOOGLE}
                            style={styles.map}
                            initialRegion={{
                                latitude: 7.8731,
                                longitude: 80.7718,
                                latitudeDelta: 4.5,
                                longitudeDelta: 4.5,
                            }}
                            onPress={(e) => setSelectedLoc(e.nativeEvent.coordinate)}
                        >
                            {/* Selected Delivery Point */}
                            <Marker coordinate={selectedLoc} pinColor="#3B82F6" title="Your Point" />

                            {/* Nearby Farmer Pins (Universal) */}
                            {FARMERS.map(farmer => (
                                <Marker 
                                    key={farmer.id}
                                    coordinate={{ latitude: farmer.lat, longitude: farmer.lng }}
                                    title={farmer.name}
                                >
                                    <View style={styles.farmerPinWrapper}>
                                        <LinearGradient colors={['#10B981', '#059669']} style={styles.farmerPin}>
                                            <Ionicons name="leaf" size={14} color="#fff" />
                                        </LinearGradient>
                                        <View style={styles.pinLink} />
                                    </View>
                                </Marker>
                            ))}
                        </MapView>
                    </View>
                    <View style={styles.coordsCard}>
                        <Ionicons name="navigate" size={14} color="#3B82F6" />
                        <Text style={styles.coordsText}>
                             {selectedLoc.latitude.toFixed(4)}, {selectedLoc.longitude.toFixed(4)}
                        </Text>
                    </View>
                </Animated.View>

                <Pressable 
                    style={({pressed}) => [styles.saveButton, pressed && { opacity: 0.9 }, isSaving && { opacity: 0.7 }]} 
                    onPress={handleSave}
                    disabled={isSaving}
                >
                    {isSaving ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.saveButtonText}>Apply Changes</Text>
                    )}
                </Pressable>
                
                <View style={styles.spacing} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    scrollContent: { padding: 24 },
    
    successBanner: { 
        position: 'absolute', 
        top: 20, 
        left: 24, 
        right: 24, 
        backgroundColor: '#10B981', 
        padding: 16, 
        borderRadius: 16, 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 12,
        zIndex: 100,
        elevation: 10,
        shadowColor: '#10B981',
        shadowOpacity: 0.3,
        shadowRadius: 10
    },
    successBannerText: { flex: 1, color: '#fff', fontFamily: 'Poppins_600SemiBold', fontSize: 13 },

    header: { marginBottom: 32 },
    title: { fontFamily: 'Poppins_700Bold', fontSize: 28, color: '#0F172A' },
    subtitle: { fontFamily: 'Poppins_400Regular', fontSize: 16, color: '#64748B' },
    activeLoc: { color: '#3B82F6', fontFamily: 'Poppins_700Bold' },

    section: { marginBottom: 28 },
    labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    label: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: '#334155' },
    geoBadge: { backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    geoBadgeText: { fontFamily: 'Poppins_700Bold', fontSize: 11, color: '#3B82F6' },

    input: { 
        backgroundColor: '#fff', 
        borderWidth: 1, 
        borderColor: '#E2E8F0', 
        borderRadius: 14, 
        padding: 16, 
        fontFamily: 'Poppins_500Medium', 
        fontSize: 15,
        color: '#0F172A',
        marginBottom: 16
    },

    langBox: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: '#fff', 
        padding: 16, 
        borderRadius: 20, 
        borderWidth: 1, 
        borderColor: '#F1F5F9',
        elevation: 2,
        shadowOpacity: 0.05
    },
    langTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: '#0F172A' },
    langSubtitle: { fontFamily: 'Poppins_400Regular', fontSize: 11, color: '#64748B' },
    toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    langLabel: { fontFamily: 'Poppins_700Bold', fontSize: 12, color: '#CBD5E1' },
    activeLang: { color: '#3B82F6' },

    infoText: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: '#64748B', marginBottom: 16, lineHeight: 20 },
    mapWrapper: { 
        height: 480, 
        width: '100%', 
        borderRadius: 24, 
        overflow: 'hidden', 
        borderWidth: 1, 
        borderColor: '#E2E8F0',
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10
    },
    map: { width: '100%', height: '100%' },

    farmerPinWrapper: { alignItems: 'center', justifyContent: 'center' },
    farmerPin: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', elevation: 5, borderWidth: 2, borderColor: '#fff' },
    pinLink: { width: 2, height: 6, backgroundColor: '#059669', marginTop: -1 },

    coordsCard: { 
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        paddingVertical: 10,
        borderRadius: 12,
        marginTop: 12,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        gap: 8
    },
    coordsText: { 
        fontFamily: 'Poppins_500Medium', 
        fontSize: 12, 
        color: '#64748B', 
    },
    saveButton: { 
        backgroundColor: '#0F172A', 
        padding: 18, 
        borderRadius: 18, 
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 4,
        marginTop: 10
    },
    saveButtonText: { color: '#fff', fontFamily: 'Poppins_600SemiBold', fontSize: 16 },
    spacing: { height: 60 }
});
