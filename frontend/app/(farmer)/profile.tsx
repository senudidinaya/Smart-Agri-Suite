import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, ActivityIndicator, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useUser } from '../../context/UserContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';

const HUBS = [
    { id: 'kandy',      name: 'Kandy',      lat: 7.2906,  lng: 80.6337, spice: 'Cinnamon' },
    { id: 'galle',      name: 'Galle',      lat: 6.0535,  lng: 80.2210, spice: 'Cinnamon' },
    { id: 'matale',     name: 'Matale',     lat: 7.4675,  lng: 80.6234, spice: 'Pepper' },
    { id: 'kurunegala', name: 'Kurunegala', lat: 7.4863,  lng: 80.3647, spice: 'Pepper' },
    { id: 'nuwaraeliya',name: 'Nuwara Eliya',lat: 6.9497, lng: 80.7891, spice: 'Cardamom' },
    { id: 'kegalle',    name: 'Kegalle',    lat: 7.2513,  lng: 80.3464, spice: 'Nutmeg' },
    { id: 'matara',     name: 'Matara',     lat: 5.9549,  lng: 80.5550, spice: 'Cinnamon' },
];

const SPICE_OPTIONS = ['Cinnamon', 'Pepper', 'Cardamom', 'Clove', 'Nutmeg'];

export default function FarmerProfile() {
    const { profile, updateProfile } = useUser();
    const { language, setLanguage, t } = useLanguage();
    const { theme, themeMode, toggleTheme } = useTheme();

    const [name, setName]   = useState(profile.name || '');
    const [phone, setPhone] = useState(profile.phone || '');
    const [specialty, setSpecialty] = useState(profile.specialty || SPICE_OPTIONS[0]);
    const [selectedHub, setSelectedHub] = useState(
        HUBS.find(h => h.name === profile.location?.address) || HUBS[0]
    );
    const [saving, setSaving] = useState(false);

    const handleSave = () => {
        if (!name.trim() || !phone.trim()) {
            Alert.alert(t('missingInfo'), t('missingInfoDesc'));
            return;
        }
        setSaving(true);
        setTimeout(() => {
            updateProfile({
                name, phone, specialty,
                location: { latitude: selectedHub.lat, longitude: selectedHub.lng, address: selectedHub.name }
            });
            setSaving(false);
            Alert.alert(t('success'), t('profileUpdated'));
        }, 800);
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top']}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
                    <Text style={[styles.title, { color: theme.textPrimary }]}>{t('agriHubProfile')}</Text>
                    <Text style={[styles.subtitle, { color: theme.textMuted }]}>
                        {t('yourListingHub')}: <Text style={{ color: theme.green, fontFamily: 'Poppins_700Bold' }}>{selectedHub.name}</Text>
                    </Text>
                </Animated.View>

                {/* Form Fields */}
                <Animated.View entering={FadeInDown.delay(150)} style={styles.section}>
                    {[
                        { label: t('fullName'),    val: name,  setter: setName,  placeholder: t('yourName'),  kb: 'default' },
                        { label: t('phoneNumber'), val: phone, setter: setPhone, placeholder: '+94 77 XXX XXXX', kb: 'phone-pad' },
                    ].map(field => (
                        <View key={field.label} style={{ marginBottom: 16 }}>
                            <Text style={[styles.label, { color: theme.textSecondary }]}>{field.label}</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: theme.bgInput, borderColor: theme.border, color: theme.textPrimary }]}
                                value={field.val}
                                onChangeText={field.setter as any}
                                placeholder={field.placeholder}
                                placeholderTextColor={theme.textMuted}
                                keyboardType={field.kb as any}
                            />
                        </View>
                    ))}

                    <Text style={[styles.label, { color: theme.textSecondary }]}>{t('primarySpecialty')}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                        {SPICE_OPTIONS.map(s => (
                            <Pressable key={s}
                                style={[styles.spiceChip, { backgroundColor: theme.bgInput, borderColor: theme.border },
                                    specialty === s && { borderColor: theme.green, backgroundColor: theme.mode === 'dark' ? '#0f2e22' : '#F0FDF4' }]}
                                onPress={() => setSpecialty(s)}>
                                <Text style={[styles.spiceChipText, { color: specialty === s ? theme.green : theme.textMuted }]}>{s}</Text>
                            </Pressable>
                        ))}
                    </ScrollView>
                </Animated.View>

                {/* Language + Theme preferences */}
                <Animated.View entering={FadeInDown.delay(200)} style={styles.section}>
                    <View style={[styles.prefBox, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.prefTitle, { color: theme.textPrimary }]}>{t('appLanguage')}</Text>
                            <Text style={[styles.prefSub, { color: theme.textMuted }]}>{t('langDesc')}</Text>
                        </View>
                        <View style={styles.toggleRow}>
                            <Text style={[styles.langLabel, language === 'en' && { color: theme.blue }]}>EN</Text>
                            <Switch
                                trackColor={{ false: "#CBD5E1", true: "#3B82F6" }}
                                thumbColor="#fff"
                                ios_backgroundColor="#CBD5E1"
                                onValueChange={() => setLanguage(language === 'en' ? 'si' : 'en')}
                                value={language === 'si'}
                                style={{ transform: [{ scale: 0.8 }] }}
                            />
                            <Text style={[styles.langLabel, language === 'si' && { color: theme.blue }]}>SI</Text>
                        </View>
                    </View>

                    <View style={[styles.prefBox, { backgroundColor: theme.bgCard, borderColor: theme.border, marginTop: 12 }]}>
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
                                thumbColor="#fff"
                                ios_backgroundColor="#CBD5E1"
                                onValueChange={toggleTheme}
                                value={themeMode === 'dark'}
                                style={{ transform: [{ scale: 0.8 }] }}
                            />
                            <Ionicons name="moon-outline" size={16} color={themeMode === 'dark' ? '#818CF8' : theme.textMuted} />
                        </View>
                    </View>
                </Animated.View>

                {/* Map Hub Selector */}
                <Animated.View entering={FadeInDown.delay(300)} style={styles.section}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>{t('globalNetworkMap')}</Text>
                    <Text style={[styles.infoText, { color: theme.textMuted }]}>{t('selectHubSeePartners')}</Text>
                    <View style={[styles.mapWrap, { borderColor: theme.border }]}>
                        <MapView
                            provider={PROVIDER_GOOGLE}
                            style={styles.map}
                            initialRegion={{ latitude: 7.8731, longitude: 80.7718, latitudeDelta: 4.5, longitudeDelta: 4.5 }}
                        >
                            {HUBS.map(hub => (
                                <Marker
                                    key={hub.id}
                                    coordinate={{ latitude: hub.lat, longitude: hub.lng }}
                                    title={hub.name}
                                    onPress={() => setSelectedHub(hub)}
                                >
                                    <View style={styles.hubPinWrap}>
                                        <LinearGradient
                                            colors={selectedHub.id === hub.id ? ['#10B981','#059669'] : ['#64748B','#475569']}
                                            style={[styles.hubPin, selectedHub.id === hub.id && styles.hubPinActive]}
                                        >
                                            <Ionicons name="leaf" size={14} color="#fff" />
                                        </LinearGradient>
                                        {selectedHub.id === hub.id && (
                                            <Text style={[styles.hubLabel, { color: theme.green }]}>{hub.name}</Text>
                                        )}
                                    </View>
                                </Marker>
                            ))}
                        </MapView>
                    </View>

                    <View style={[styles.selectedHubCard, { backgroundColor: theme.mode === 'dark' ? '#0f2e22' : '#F0FDF4', borderColor: theme.green + '40' }]}>
                        <Ionicons name="checkmark-circle" size={20} color={theme.green} />
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.selectedHubName, { color: theme.green }]}>{selectedHub.name}</Text>
                            <Text style={[styles.selectedHubDetails, { color: theme.textMuted }]}>{t('selected')} · {selectedHub.spice} Hub</Text>
                        </View>
                    </View>
                </Animated.View>

                <Pressable
                    style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                    onPress={handleSave}
                    disabled={saving}
                >
                    <LinearGradient colors={['#10B981','#059669']} style={styles.saveBtnG}>
                        {saving
                            ? <ActivityIndicator color="#fff" />
                            : <Text style={styles.saveBtnText}>{t('confirmProfileLocation')}</Text>
                        }
                    </LinearGradient>
                </Pressable>

                <View style={{ height: 100 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { padding: 24 },
    header: { marginBottom: 32 },
    title: { fontFamily: 'Poppins_700Bold', fontSize: 28 },
    subtitle: { fontFamily: 'Poppins_400Regular', fontSize: 16, marginTop: 4 },
    section: { marginBottom: 28 },
    label: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, marginBottom: 10 },
    input: { borderWidth: 1, borderRadius: 14, padding: 16, fontFamily: 'Poppins_500Medium', fontSize: 15 },
    spiceChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, marginRight: 10, borderWidth: 1.5 },
    spiceChipText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13 },
    prefBox: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20, borderWidth: 1, elevation: 2 },
    prefTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 15 },
    prefSub: { fontFamily: 'Poppins_400Regular', fontSize: 11, marginTop: 2 },
    toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    langLabel: { fontFamily: 'Poppins_700Bold', fontSize: 12, color: '#CBD5E1' },
    infoText: { fontFamily: 'Poppins_400Regular', fontSize: 13, marginBottom: 16 },
    mapWrap: { height: 380, width: '100%', borderRadius: 24, overflow: 'hidden', borderWidth: 1, elevation: 4 },
    map: { width: '100%', height: '100%' },
    hubPinWrap: { alignItems: 'center' },
    hubPin: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
    hubPinActive: { width: 38, height: 38, borderRadius: 19, elevation: 8 },
    hubLabel: { fontFamily: 'Poppins_700Bold', fontSize: 11, marginTop: 2 },
    selectedHubCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 16, borderWidth: 1, marginTop: 16 },
    selectedHubName: { fontFamily: 'Poppins_700Bold', fontSize: 15 },
    selectedHubDetails: { fontFamily: 'Poppins_500Medium', fontSize: 12, marginTop: 2 },
    saveBtn: { height: 60, borderRadius: 20, overflow: 'hidden', elevation: 4 },
    saveBtnG: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    saveBtnText: { fontFamily: 'Poppins_700Bold', fontSize: 16, color: '#fff' },
});
