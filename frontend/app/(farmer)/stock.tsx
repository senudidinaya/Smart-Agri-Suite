import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, ActivityIndicator, Alert, Modal, FlatList, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useUser } from '../../context/UserContext';

const { width } = Dimensions.get('window');

const SPICES = ['All', 'Cinnamon', 'Pepper', 'Cardamom', 'Clove', 'Nutmeg'];

// GLOBAL MARKETPLACE MOCK (ALL FARMERS)
const GLOBAL_MARKET = [
    { id: 'g1', name: 'Premium Cinnamon quills', farmer: 'Sunil Perera', location: 'Matale', price: 2450, spice: 'Cinnamon' },
    { id: 'g2', name: 'Black Pepper Corns', farmer: 'Kamal Silva', location: 'Kandy', price: 1550, spice: 'Pepper' },
    { id: 'g3', name: 'Green Cardamom Bold', farmer: 'Aruna Jayamaha', location: 'Matale', price: 3800, spice: 'Cardamom' },
    { id: 'g4', name: 'Dried Nutmeg Pods', farmer: 'P. Nissanka', location: 'Kandy', price: 2550, spice: 'Nutmeg' },
];

const BASE_PRICES: Record<string, number> = { 'Cinnamon': 2400, 'Pepper': 1500, 'Cardamom': 3800, 'Clove': 2950, 'Nutmeg': 2550 };
const DISTRICT_FACTORS: Record<string, number> = { 'Matale': 1.15, 'Kandy': 1.10, 'Kurunegala': 1.05, 'Galle': 1.08, 'Colombo': 1.20, 'Default': 1.00 };

const SpiceIcon = ({ type }: { type: string }) => {
    let iconName: any = "leaf";
    let colors = ['#10B981', '#059669'];
    switch(type) {
        case 'Cinnamon': iconName = "browsers-outline"; colors = ['#F59E0B', '#D97706']; break;
        case 'Cardamom': iconName = "sparkles-outline"; colors = ['#10B981', '#059669']; break;
        case 'Pepper': iconName = "radio-button-on-outline"; colors = ['#1E293B', '#0F172A']; break;
        case 'Clove': iconName = "color-filter-outline"; colors = ['#8B5CF6', '#6D28D9']; break;
        case 'Nutmeg': iconName = "ellipse-outline"; colors = ['#EC4899', '#BE185D']; break;
    }
    return (
        <LinearGradient colors={colors} style={styles.spiceIconBox}><Ionicons name={iconName} size={24} color="#fff" /></LinearGradient>
    );
};

export default function FarmerStockListing() {
    const router = useRouter();
    const { profile } = useUser();
    
    const [activeTab, setActiveTab] = useState<'MY_STOCK' | 'MARKET_FEED'>('MY_STOCK');
    const [selectedSpiceFilter, setSelectedSpiceFilter] = useState('All');
    const [isAddModalVisible, setIsAddModalVisible] = useState(false);
    
    const [myListings, setMyListings] = useState([
        { id: '1', spice: 'Cinnamon', qty: 50, price: 2450, status: 'Active', variety: 'Ceylon Alba' },
        { id: '2', spice: 'Pepper', qty: 120, price: 1550, status: 'Active', variety: 'Organic Black' },
    ]);

    const [newSpice, setNewSpice] = useState('Cinnamon');
    const [newQty, setNewQty] = useState('');
    const [moisture, setMoisture] = useState('12');

    const isProfileComplete = profile.name && profile.location && profile.phoneNumber;

    const calculatedPrice = useMemo(() => {
        const base = BASE_PRICES[newSpice] || 1500;
        const district = profile.location?.address || 'Default';
        const factor = DISTRICT_FACTORS[district] || DISTRICT_FACTORS['Default'];
        return Math.round(base * factor * (1 + (18 - parseFloat(moisture || '18')) / 100));
    }, [newSpice, profile.location, moisture]);

    const displayData = useMemo(() => {
        if (activeTab === 'MY_STOCK') {
            return myListings.filter(l => selectedSpiceFilter === 'All' || l.spice === selectedSpiceFilter);
        }
        return GLOBAL_MARKET.filter(l => selectedSpiceFilter === 'All' || l.spice === selectedSpiceFilter);
    }, [activeTab, myListings, selectedSpiceFilter]);

    const handlePublish = () => {
        if (!newQty) return Alert.alert("Required", "Please provide harvest quantity.");
        setMyListings([{ id: Math.random().toString(), spice: newSpice, qty: parseFloat(newQty), price: calculatedPrice, status: 'Active', variety: 'Standard Grade' }, ...myListings]);
        setIsAddModalVisible(false);
        setNewQty('');
    };

    if (!isProfileComplete) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.lockContainer}>
                    <Animated.View entering={FadeInDown} style={styles.lockCard}>
                        <View style={styles.lockIconBox}><Ionicons name="map-outline" size={50} color="#10B981" /></View>
                        <Text style={styles.lockTitle}>Setup Hub First</Text>
                        <Text style={styles.lockSub}>Complete your location hub to list harvests.</Text>
                        <Pressable style={styles.unlockBtn} onPress={() => router.push('/(farmer)/profile')}>
                            <LinearGradient colors={['#10B981', '#059669']} style={styles.unlockBtnG}><Text style={styles.unlockText}>Setup Profile</Text></LinearGradient>
                        </Pressable>
                    </Animated.View>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Spice Marketplace</Text>
                    <View style={styles.locRow}>
                         <Ionicons name="location" size={14} color="#10B981" />
                         <Text style={styles.headerSub}>Listing from Hub: <Text style={{color: '#0F172A'}}>{profile.location?.address}</Text></Text>
                    </View>
                </View>
                <Pressable style={styles.addBtn} onPress={() => setIsAddModalVisible(true)}>
                    <LinearGradient colors={['#10B981', '#059669']} style={styles.addBtnG}><Ionicons name="add" size={28} color="#fff" /></LinearGradient>
                </Pressable>
            </View>

            {/* TWO-TAB SELECTION - Creative Solution */}
            <View style={styles.tabContainer}>
                <Pressable onPress={() => setActiveTab('MY_STOCK')} style={[styles.tab, activeTab === 'MY_STOCK' && styles.activeTab]}>
                    <Text style={[styles.tabText, activeTab === 'MY_STOCK' && styles.activeTabText]}>My Harvests</Text>
                </Pressable>
                <Pressable onPress={() => setActiveTab('MARKET_FEED')} style={[styles.tab, activeTab === 'MARKET_FEED' && styles.activeTab]}>
                    <Text style={[styles.tabText, activeTab === 'MARKET_FEED' && styles.activeTabText]}>Global Feed</Text>
                </Pressable>
            </View>

            <View style={{ marginBottom: 20 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.spiceRowScroll}>
                    {SPICES.map(s => (
                        <Pressable key={s} onPress={() => setSelectedSpiceFilter(s)} style={[styles.spicePill, selectedSpiceFilter === s && { backgroundColor: '#10B981', borderColor: '#10B981' }]}>
                            <Text style={[styles.spicePillText, selectedSpiceFilter === s && { color: '#fff' }]}>{s}</Text>
                        </Pressable>
                    ))}
                </ScrollView>
            </View>

            <FlatList data={displayData} keyExtractor={item => item.id} contentContainerStyle={styles.listContent} renderItem={({ item, index }) => (
                <Animated.View entering={FadeInDown.delay(index * 100)} style={styles.cardWrapper}>
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <View style={styles.spiceInfo}>
                                <SpiceIcon type={item.spice} />
                                <View>
                                    <Text style={styles.spiceName}>{item.spice}</Text>
                                    <Text style={styles.variety}>{activeTab === 'MY_STOCK' ? (item as any).variety : (item as any).name}</Text>
                                </View>
                            </View>
                            {activeTab === 'MY_STOCK' ? (
                                <View style={[styles.statusBadge, { backgroundColor: (item as any).status === 'Active' ? '#ECFDF5' : '#F1F5F9' }]}>
                                    <View style={[styles.dot, { backgroundColor: (item as any).status === 'Active' ? '#10B981' : '#94A3B8' }]} />
                                    <Text style={[styles.statusText, { color: (item as any).status === 'Active' ? '#10B981' : '#64748B' }]}>{(item as any).status}</Text>
                                </View>
                            ) : (
                                <View style={styles.farmerBadge}><Text style={styles.farmerText}>{(item as any).farmer}</Text></View>
                            )}
                        </View>
                        <View style={styles.statsGrid}>
                            <View style={styles.statItem}>
                                 <Text style={styles.statL}>{activeTab === 'MY_STOCK' ? 'Total Quant.' : 'Hub Origin'}</Text>
                                 <Text style={styles.statV}>{activeTab === 'MY_STOCK' ? (item as any).qty + ' kg' : (item as any).location}</Text>
                            </View>
                            <View style={styles.vDivider} />
                            <View style={styles.statItem}>
                                 <Text style={styles.statL}>Market Value</Text>
                                 <Text style={styles.statV}>LKR {item.price.toLocaleString()}/kg</Text>
                            </View>
                        </View>
                    </View>
                    <View style={styles.cardShadow} />
                </Animated.View>
            )} />

            {/* MODAL remains consistent */}
            <Modal visible={isAddModalVisible} transparent animationType="slide">
                <View style={[styles.modalOverlay]}>
                    <View style={styles.modalBody}>
                        <View style={styles.modalHeader}><Text style={styles.modalTitle}>New Listing</Text><Pressable onPress={() => setIsAddModalVisible(false)}><Ionicons name="close" size={24} color="#0F172A" /></Pressable></View>
                        <Text style={styles.inputL}>Spice Variety</Text>
                        <ScrollView horizontal style={styles.modalSpiceRow}>{SPICES.slice(1).map(s => (<Pressable key={s} onPress={() => setNewSpice(s)} style={[styles.mSpicePill, newSpice === s && { backgroundColor: '#10B981', borderColor: '#10B981' }]}><Text style={[styles.mSpicePillText, newSpice === s && { color: '#fff' }]}>{s}</Text></Pressable>))}</ScrollView>
                        <Text style={styles.inputL}>Quantity (kg)</Text><View style={styles.iWrap}><TextInput style={styles.input} value={newQty} onChangeText={setNewQty} keyboardType="numeric" /></View>
                        <Text style={styles.inputL}>Moisture (%)</Text><View style={styles.iWrap}><TextInput style={styles.input} value={moisture} onChangeText={setMoisture} keyboardType="numeric" /></View>
                        <View style={styles.modelPriceCard}><View><View style={styles.modelTag}><Ionicons name="analytics" size={12} color="#fff" /><Text style={styles.modelTagText}>TRAINED MODEL PRICE</Text></View><Text style={styles.modelPriceVal}>LKR {calculatedPrice.toLocaleString()}<Text style={{fontSize: 14, color: '#94A3B8'}}>/kg</Text></Text></View><View style={styles.locBadge}><Text style={styles.locBadgeText}>{profile.location?.address}</Text></View></View>
                        <Pressable style={styles.publishBtn} onPress={handlePublish}><LinearGradient colors={['#10B981', '#059669']} style={styles.publishBtnG}><Text style={styles.publishText}>Publish Harvest</Text></LinearGradient></Pressable>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingBottom: 16 },
    headerTitle: { fontFamily: 'Poppins_700Bold', fontSize: 24, color: '#0F172A' },
    locRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
    headerSub: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: '#64748B' },
    addBtn: { width: 50, height: 50, borderRadius: 16, elevation: 8 },
    addBtnG: { flex: 1, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },

    tabContainer: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 16, marginHorizontal: 24, padding: 6, marginBottom: 24 },
    tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12 },
    activeTab: { backgroundColor: '#fff', elevation: 2 },
    tabText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: '#94A3B8' },
    activeTabText: { color: '#0F172A' },

    spiceRowScroll: { paddingHorizontal: 24, flexGrow: 0 },
    spicePill: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 14, backgroundColor: '#fff', marginRight: 10, borderWidth: 1, borderColor: '#F1F5F9' },
    spicePillText: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: '#64748B' },

    listContent: { padding: 24, paddingTop: 0, paddingBottom: 120 },
    cardWrapper: { marginBottom: 20, position: 'relative' },
    card: { backgroundColor: '#fff', borderRadius: 28, padding: 20, zIndex: 2, borderWidth: 1, borderColor: '#F1F5F9' },
    cardShadow: { position: 'absolute', bottom: -5, left: 15, right: 15, height: 20, backgroundColor: '#E2E8F0', borderRadius: 30, opacity: 0.1, zIndex: 1 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    spiceInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    spiceIconBox: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    spiceName: { fontFamily: 'Poppins_700Bold', fontSize: 16, color: '#1E293B' },
    variety: { fontFamily: 'Poppins_500Medium', fontSize: 11, color: '#94A3B8' },
    statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, gap: 4 },
    dot: { width: 6, height: 6, borderRadius: 3 },
    statusText: { fontFamily: 'Poppins_700Bold', fontSize: 9 },
    farmerBadge: { backgroundColor: '#F0FDF4', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    farmerText: { fontFamily: 'Poppins_700Bold', fontSize: 9, color: '#10B981' },

    statsGrid: { flexDirection: 'row', backgroundColor: '#F8FAFC', padding: 14, borderRadius: 18 },
    statItem: { flex: 1, alignItems: 'center' },
    statL: { fontFamily: 'Poppins_500Medium', fontSize: 10, color: '#94A3B8' },
    statV: { fontFamily: 'Poppins_700Bold', fontSize: 14, color: '#0F172A', marginTop: 2 },
    vDivider: { width: 1, height: 30, backgroundColor: '#E2E8F0' },

    lockContainer: { flex: 1, justifyContent: 'center', padding: 24 },
    lockCard: { backgroundColor: '#fff', borderRadius: 32, padding: 32, alignItems: 'center', elevation: 8, borderWidth: 1, borderColor: '#F1F5F9' },
    lockIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#ECFDF5', justifyContent: 'center', alignItems: 'center' },
    lockTitle: { fontFamily: 'Poppins_700Bold', fontSize: 22, color: '#0F172A', marginTop: 20 },
    lockSub: { fontFamily: 'Poppins_400Regular', fontSize: 14, color: '#64748B', textAlign: 'center', marginTop: 10 },
    unlockBtn: { height: 60, width: '100%', borderRadius: 18, overflow: 'hidden', marginTop: 28 },
    unlockBtnG: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    unlockText: { fontFamily: 'Poppins_700Bold', fontSize: 15, color: '#fff' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'flex-end' },
    modalBody: { backgroundColor: '#fff', borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 32, paddingBottom: 50 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
    modalTitle: { fontFamily: 'Poppins_700Bold', fontSize: 24, color: '#0F172A' },
    inputL: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: '#94A3B8', marginBottom: 10 },
    modalSpiceRow: { marginBottom: 24, flexGrow: 0 },
    mSpicePill: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, backgroundColor: '#F8FAFC', marginRight: 8, borderWidth: 1, borderColor: '#F1F5F9' },
    mSpicePillText: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: '#64748B' },
    iWrap: { backgroundColor: '#F8FAFC', borderRadius: 16, marginBottom: 16 },
    input: { padding: 16, fontFamily: 'Poppins_700Bold', fontSize: 16 },
    modelPriceCard: { backgroundColor: '#1E293B', borderRadius: 24, padding: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
    modelTag: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 8 },
    modelTagText: { fontFamily: 'Poppins_700Bold', fontSize: 9, color: '#fff' },
    modelPriceVal: { fontFamily: 'Poppins_700Bold', fontSize: 24, color: '#fff' },
    locBadge: { backgroundColor: 'rgba(16, 185, 129, 0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    locBadgeText: { fontFamily: 'Poppins_700Bold', fontSize: 12, color: '#10B981' },
    publishBtn: { height: 60, borderRadius: 24, overflow: 'hidden' },
    publishBtnG: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    publishText: { fontFamily: 'Poppins_700Bold', fontSize: 16, color: '#fff' }
});
