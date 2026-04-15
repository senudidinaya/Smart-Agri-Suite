import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, Switch, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useUser } from '../../context/UserContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

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

const FARMERS = [
    { id: 'f1', name: 'Galle Coastal Hub', lat: 6.0367, lng: 80.2170, spice: 'Cinnamon' },
    { id: 'f2', name: 'Matara Lowlands', lat: 5.9485, lng: 80.5353, spice: 'Cinnamon' },
    { id: 'f3', name: 'Kalutara Estate', lat: 6.5854, lng: 79.9607, spice: 'Cinnamon' },
    { id: 'f4', name: 'Kandy Hill Pepper', lat: 7.2906, lng: 80.6337, spice: 'Pepper' },
    { id: 'f5', name: 'Matale Spice Valley', lat: 7.4675, lng: 80.6234, spice: 'Pepper' },
    { id: 'f6', name: 'Kurunegala Dry-Pepper', lat: 7.4863, lng: 80.3647, spice: 'Pepper' },
    { id: 'f7', name: 'Ratnapura Gem-Spice', lat: 6.6828, lng: 80.3992, spice: 'Pepper' },
    { id: 'f8', name: 'Nwara Eliya Highs', lat: 6.9497, lng: 80.7891, spice: 'Cardamom' },
    { id: 'f9', name: 'Knuckles Range Pods', lat: 7.4333, lng: 80.7833, spice: 'Cardamom' },
    { id: 'f10', name: 'Kegalle Forest Garden', lat: 7.2513, lng: 80.3464, spice: 'Nutmeg' },
    { id: 'f11', name: 'Kandy Clove Estate', lat: 7.3200, lng: 80.6500, spice: 'Clove' },
    { id: 'f12', name: 'Galle Southern Clove', lat: 6.1000, lng: 80.2500, spice: 'Clove' },
];

function findNearestDistrict(lat: number, lng: number) {
    let minDiff = Infinity;
    let nearest = "Colombo";
    DISTRICTS.forEach(d => {
        const diff = Math.sqrt(Math.pow(lat - d.lat, 2) + Math.pow(lng - d.lng, 2));
        if (diff < minDiff) { minDiff = diff; nearest = d.name; }
    });
    return nearest;
}

export default function CustomerProfile() {
    const { profile, updateProfile } = useUser();
    const { language, setLanguage, t } = useLanguage();
    const { theme, themeMode, toggleTheme } = useTheme();
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
                name, email,
                location: { latitude: selectedLoc.latitude, longitude: selectedLoc.longitude, address: locationName }
            });
            setIsSaving(false);
            setShowSuccessBanner(true);
            setTimeout(() => setShowSuccessBanner(false), 4000);
        }, 800);
    };

    const bg = theme.bg;
    const card = theme.bgCard;
    const border = theme.border;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: bg }]} edges={['top']}>
            {showSuccessBanner && (
                <Animated.View entering={FadeInDown} exiting={FadeOutUp} style={styles.successBanner}>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.successBannerText}>{t('locationSaved')}</Text>
                </Animated.View>
            )}

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
                    <Text style={[styles.title, { color: theme.textPrimary }]}>{t('accountSetup')}</Text>
                    <Text style={[styles.subtitle, { color: theme.textMuted }]}>
                        {t('currentLocation')}: <Text style={[styles.activeLoc, { color: theme.blue }]}>{locationName}</Text>
                    </Text>
                </Animated.View>

                {/* Form */}
                <Animated.View entering={FadeInDown.delay(200)} style={styles.section}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>{t('fullName')}</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: card, borderColor: border, color: theme.textPrimary }]}
                        value={name}
                        onChangeText={setName}
                        placeholder={t('yourName')}
                        placeholderTextColor={theme.textMuted}
                    />
                    <Text style={[styles.label, { color: theme.textSecondary }]}>{t('emailAddress')}</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: card, borderColor: border, color: theme.textPrimary }]}
                        value={email}
                        onChangeText={setEmail}
                        placeholder={t('emailPlaceholder')}
                        placeholderTextColor={theme.textMuted}
                        keyboardType="email-address"
                    />
                </Animated.View>

                {/* Language Toggle */}
                <Animated.View entering={FadeInDown.delay(250)} style={styles.section}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>{t('languagePreferences')}</Text>
                    <View style={[styles.prefBox, { backgroundColor: card, borderColor: border }]}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.prefTitle, { color: theme.textPrimary }]}>{t('appLanguage')}</Text>
                            <Text style={[styles.prefSub, { color: theme.textMuted }]}>{t('langDesc')}</Text>
                        </View>
                        <View style={styles.toggleRow}>
                            <Text style={[styles.langLabel, language === 'en' && { color: theme.blue }]}>EN</Text>
                            <Switch
                                trackColor={{ false: "#CBD5E1", true: "#3B82F6" }}
                                thumbColor={"#ffffff"}
                                ios_backgroundColor="#CBD5E1"
                                onValueChange={handleLanguageToggle}
                                value={language === "si"}
                                style={{ transform: [{ scale: 0.8 }] }}
                            />
                            <Text style={[styles.langLabel, language === 'si' && { color: theme.blue }]}>SI</Text>
                        </View>
                    </View>
                </Animated.View>

                {/* Dark Mode Toggle */}
                <Animated.View entering={FadeInDown.delay(300)} style={styles.section}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>{t('themePreference')}</Text>
                    <View style={[styles.prefBox, { backgroundColor: card, borderColor: border }]}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.prefTitle, { color: theme.textPrimary }]}>
                                {themeMode === 'dark' ? t('darkMode') : t('lightMode')}
                            </Text>
                            <Text style={[styles.prefSub, { color: theme.textMuted }]}>{t('themeDesc')}</Text>
                        </View>
                        <View style={styles.toggleRow}>
                            <Ionicons name="sunny-outline" size={16} color={themeMode === 'light' ? theme.amber : theme.textMuted} />
                            <Switch
                                trackColor={{ false: "#CBD5E1", true: "#334155" }}
                                thumbColor={"#ffffff"}
                                ios_backgroundColor="#CBD5E1"
                                onValueChange={toggleTheme}
                                value={themeMode === "dark"}
                                style={{ transform: [{ scale: 0.8 }] }}
                            />
                            <Ionicons name="moon-outline" size={16} color={themeMode === 'dark' ? '#818CF8' : theme.textMuted} />
                        </View>
                    </View>
                </Animated.View>

                {/* Location Map */}
                <Animated.View entering={FadeInDown.delay(380)} style={styles.section}>
                    <View style={styles.labelRow}>
                        <Text style={[styles.label, { color: theme.textSecondary }]}>{t('logisticsDropOff')}</Text>
                        <View style={[styles.geoBadge, { backgroundColor: theme.mode === 'dark' ? '#1e3a5f' : '#EFF6FF' }]}>
                            <Text style={[styles.geoBadgeText, { color: theme.blue }]}>{locationName}</Text>
                        </View>
                    </View>
                    <Text style={[styles.infoText, { color: theme.textMuted }]}>
                        {t('identifyDelivery')} {FARMERS.length} {t('activeFarmerPods')}
                    </Text>
                    <View style={[styles.mapWrapper, { borderColor: border }]}>
                        <MapView
                            provider={PROVIDER_GOOGLE}
                            style={styles.map}
                            initialRegion={{ latitude: 7.8731, longitude: 80.7718, latitudeDelta: 4.5, longitudeDelta: 4.5 }}
                            onPress={(e) => setSelectedLoc(e.nativeEvent.coordinate)}
                        >
                            <Marker coordinate={selectedLoc} pinColor="#3B82F6" title="Your Point" />
                            {FARMERS.map(farmer => (
                                <Marker key={farmer.id} coordinate={{ latitude: farmer.lat, longitude: farmer.lng }} title={farmer.name}>
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
                    <View style={[styles.coordsCard, { backgroundColor: card, borderColor: border }]}>
                        <Ionicons name="navigate" size={14} color={theme.blue} />
                        <Text style={[styles.coordsText, { color: theme.textMuted }]}>
                            {selectedLoc.latitude.toFixed(4)}, {selectedLoc.longitude.toFixed(4)}
                        </Text>
                    </View>
                </Animated.View>

                <Pressable
                    style={({ pressed }) => [styles.saveButton, pressed && { opacity: 0.9 }, isSaving && { opacity: 0.7 }]}
                    onPress={handleSave}
                    disabled={isSaving}
                >
                    <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.saveBtnGrad}>
                        {isSaving
                            ? <ActivityIndicator color="#fff" />
                            : <Text style={styles.saveButtonText}>{t('apply')}</Text>
                        }
                    </LinearGradient>
                </Pressable>

                <View style={styles.spacing} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { padding: 24 },
    successBanner: { position: 'absolute', top: 20, left: 24, right: 24, backgroundColor: '#10B981', padding: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 12, zIndex: 100, elevation: 10 },
    successBannerText: { flex: 1, color: '#fff', fontFamily: 'Poppins_600SemiBold', fontSize: 13 },
    header: { marginBottom: 32 },
    title: { fontFamily: 'Poppins_700Bold', fontSize: 28 },
    subtitle: { fontFamily: 'Poppins_400Regular', fontSize: 16 },
    activeLoc: { fontFamily: 'Poppins_700Bold' },
    section: { marginBottom: 28 },
    labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    label: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, marginBottom: 10 },
    geoBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    geoBadgeText: { fontFamily: 'Poppins_700Bold', fontSize: 11 },
    input: { borderWidth: 1, borderRadius: 14, padding: 16, fontFamily: 'Poppins_500Medium', fontSize: 15, marginBottom: 16 },
    prefBox: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20, borderWidth: 1, elevation: 2 },
    prefTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 15 },
    prefSub: { fontFamily: 'Poppins_400Regular', fontSize: 11, marginTop: 2 },
    toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    langLabel: { fontFamily: 'Poppins_700Bold', fontSize: 12, color: '#CBD5E1' },
    infoText: { fontFamily: 'Poppins_400Regular', fontSize: 13, marginBottom: 16, lineHeight: 20 },
    mapWrapper: { height: 480, width: '100%', borderRadius: 24, overflow: 'hidden', borderWidth: 1, elevation: 4 },
    map: { width: '100%', height: '100%' },
    farmerPinWrapper: { alignItems: 'center', justifyContent: 'center' },
    farmerPin: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', elevation: 5, borderWidth: 2, borderColor: '#fff' },
    pinLink: { width: 2, height: 6, backgroundColor: '#059669', marginTop: -1 },
    coordsCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 12, marginTop: 12, borderWidth: 1, gap: 8 },
    coordsText: { fontFamily: 'Poppins_500Medium', fontSize: 12 },
    saveButton: { borderRadius: 18, overflow: 'hidden', marginTop: 10, elevation: 4 },
    saveBtnGrad: { padding: 18, alignItems: 'center' },
    saveButtonText: { color: '#fff', fontFamily: 'Poppins_600SemiBold', fontSize: 16 },
    spacing: { height: 60 },
});
