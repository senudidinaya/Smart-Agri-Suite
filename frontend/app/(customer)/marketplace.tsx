import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, FlatList, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { useUser } from '../../context/UserContext';
import { useCart } from '../../context/CartContext';
import { useStock, Listing } from '../../context/StockContext';
import { SkeletonCard } from '../../components/SkeletonCard';

const SPICES = ['All', 'Cinnamon', 'Pepper', 'Cardamom', 'Clove', 'Nutmeg'];
const NEARBY_KM = 120;

function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const spiceColors: Record<string, [string, string]> = {
    Cinnamon: ['#F59E0B', '#D97706'], Pepper: ['#1E293B', '#0F172A'],
    Cardamom: ['#10B981', '#059669'], Clove: ['#8B5CF6', '#6D28D9'], Nutmeg: ['#EC4899', '#BE185D'],
};

type LiveListing = Listing & { distKm: number; available: number; displayId: string };

export default function CustomerMarketplace() {
    const router = useRouter();
    const { t } = useLanguage();
    const { theme } = useTheme();
    const { profile } = useUser();
    const { addToCart, cartCount } = useCart();
    const { listings, reserveStock, getAvailableStock, loading } = useStock();

    const [activeTab, setActiveTab] = useState<'NEARBY' | 'ALL'>('NEARBY');
    const [selectedSpice, setSelectedSpice] = useState('All');
    const [search, setSearch] = useState('');
    const [selectedListing, setSelectedListing] = useState<LiveListing | null>(null);
    const [qty, setQty] = useState('');
    const [addedToCart, setAddedToCart] = useState(false);

    if (!profile.location) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
                <View style={styles.lockContainer}>
                    <Animated.View entering={FadeInDown} style={[styles.lockCard, { backgroundColor: theme.bgCard }]}>
                        <View style={[styles.lockIconBox, { backgroundColor: theme.mode === 'dark' ? '#12133a' : '#EEF2FF' }]}>
                            <Ionicons name="location-outline" size={50} color={theme.indigo} />
                        </View>
                        <Text style={[styles.lockTitle, { color: theme.textPrimary }]}>Set Your Location First</Text>
                        <Text style={[styles.lockSub, { color: theme.textMuted }]}>
                            The marketplace shows nearby farmers based on your delivery hub. Please set your location in Profile before browsing.
                        </Text>
                        <Pressable style={styles.unlockBtn} onPress={() => router.push('/(customer)/profile')}>
                            <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.unlockBtnG}>
                                <Ionicons name="map-outline" size={20} color="#fff" />
                                <Text style={styles.unlockText}>Set My Location</Text>
                            </LinearGradient>
                        </Pressable>
                    </Animated.View>
                </View>
            </SafeAreaView>
        );
    }

    const liveListings = useMemo<LiveListing[]>(() =>
        listings
            .filter(l => l.status !== 'SoldOut' || l.stock - l.reserved > 0)
            .map(l => ({
                ...l,
                displayId: l._id || l.id || '',
                distKm: getDistanceKm(profile.location!.latitude, profile.location!.longitude, l.lat, l.lng),
                available: l.stock - l.reserved,
            }))
            .sort((a, b) => a.distKm - b.distKm),
        [listings, profile.location]
    );

    const nearbyListings = useMemo(() => liveListings.filter(l => l.distKm <= NEARBY_KM), [liveListings]);
    const displayData = useMemo(() => {
        const base = activeTab === 'NEARBY' ? nearbyListings : liveListings;
        return base.filter(l =>
            (selectedSpice === 'All' || l.spice === selectedSpice) &&
            (l.farmerName.toLowerCase().includes(search.toLowerCase()) ||
             l.hubName.toLowerCase().includes(search.toLowerCase()) ||
             l.variety.toLowerCase().includes(search.toLowerCase()))
        );
    }, [activeTab, nearbyListings, liveListings, selectedSpice, search]);

    const handleAddToCart = async () => {
        if (!selectedListing) return;
        const qtyNum = parseFloat(qty);
        if (!qtyNum || qtyNum <= 0) return Alert.alert('Invalid Quantity', 'Please enter a valid quantity.');
        const available = getAvailableStock(selectedListing.displayId);
        if (qtyNum > available) return Alert.alert('Insufficient Stock', `Only ${available} kg available.`);
        const reserved = await reserveStock(selectedListing.displayId, qtyNum);
        if (!reserved) return Alert.alert('Stock Unavailable', 'This quantity is no longer available.');
        addToCart({
            id: selectedListing.displayId, listingId: selectedListing.displayId,
            farmerId: selectedListing.farmerId, farmerName: selectedListing.farmerName,
            hubName: selectedListing.hubName, spice: selectedListing.spice,
            variety: selectedListing.variety, region: selectedListing.region,
            price: selectedListing.price, qty: qtyNum, stock: selectedListing.stock,
        });
        setAddedToCart(true);
        setTimeout(() => { setSelectedListing(null); setQty(''); setAddedToCart(false); }, 1200);
    };

    const itemTotal = selectedListing && qty ? parseFloat(qty) * selectedListing.price : 0;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>{t('marketplace')}</Text>
                    <View style={styles.locRow}>
                        <Ionicons name="location" size={13} color={theme.indigo} />
                        <Text style={[styles.headerSub, { color: theme.textMuted }]}>
                            {t('sourcingFrom')} <Text style={[styles.locName, { color: theme.indigo }]}>{profile.location.address}</Text>
                        </Text>
                    </View>
                </View>
                <Pressable style={[styles.cartBtn, { backgroundColor: theme.bgCard }]} onPress={() => router.push('/(customer)/cart')}>
                    <Ionicons name="cart-outline" size={24} color={theme.textPrimary} />
                    {cartCount > 0 && <View style={styles.cartBadge}><Text style={styles.cartBadgeText}>{cartCount}</Text></View>}
                </Pressable>
            </View>

            {/* Tabs */}
            <View style={styles.tabContainer}>
                {(['NEARBY', 'ALL'] as const).map(tab => (
                    <Pressable key={tab} onPress={() => setActiveTab(tab)}
                        style={[styles.tab, { backgroundColor: theme.bgCard, borderColor: theme.border },
                            activeTab === tab && { backgroundColor: theme.mode === 'dark' ? '#12133a' : '#EEF2FF', borderColor: theme.indigo }]}>
                        <Ionicons name={tab === 'NEARBY' ? 'navigate' : 'earth'} size={13} color={activeTab === tab ? theme.indigo : theme.textMuted} />
                        <Text style={[styles.tabText, { color: activeTab === tab ? theme.indigo : theme.textMuted }]}>
                            {tab === 'NEARBY' ? 'Nearby' : 'All Farmers'} <Text style={styles.tabCount}>({tab === 'NEARBY' ? nearbyListings.length : liveListings.length})</Text>
                        </Text>
                    </Pressable>
                ))}
            </View>

            {/* Filters */}
            <View style={styles.filterRow}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
                    {SPICES.map(s => (
                        <Pressable key={s}
                            style={[styles.pill, { backgroundColor: theme.bgCard, borderColor: theme.border },
                                selectedSpice === s && { backgroundColor: theme.indigo, borderColor: theme.indigo }]}
                            onPress={() => setSelectedSpice(s)}>
                            <Text style={[styles.pillText, { color: selectedSpice === s ? '#fff' : theme.textMuted }]}>{s}</Text>
                        </Pressable>
                    ))}
                </ScrollView>
            </View>

            {/* Search */}
            <View style={[styles.searchBar, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                <Ionicons name="search" size={18} color={theme.textMuted} />
                <TextInput
                    style={[styles.searchInput, { color: theme.textPrimary }]}
                    placeholder={t('searchVariety')}
                    value={search}
                    onChangeText={setSearch}
                    placeholderTextColor={theme.textMuted}
                />
            </View>

            {loading ? (
                <View style={styles.listContent}>
                    {[1,2,3].map(i => <SkeletonCard key={i} height={160} />)}
                </View>
            ) : (
                <FlatList
                    data={displayData}
                    keyExtractor={item => item.displayId}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item, index }) => {
                        const colors = spiceColors[item.spice] || ['#10B981', '#059669'];
                        return (
                            <Animated.View entering={FadeInDown.delay(index * 80)} style={styles.cardWrapper}>
                                <Pressable
                                    style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
                                    onPress={() => { setSelectedListing(item); setQty(''); }}
                                >
                                    <View style={styles.cardTop}>
                                        <LinearGradient colors={colors} style={styles.spiceIconBox}>
                                            <Ionicons name="cube" size={20} color="#fff" />
                                        </LinearGradient>
                                        <View style={styles.cardInfo}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Text style={[styles.cardName, { color: theme.textPrimary }]}>{item.spice}</Text>
                                                <View style={styles.ratingRow}>
                                                    <Ionicons name="star" size={14} color="#F59E0B" />
                                                    <Text style={[styles.ratingText, { color: theme.textPrimary }]}>{item.rating}</Text>
                                                </View>
                                            </View>
                                            <View style={styles.metaRow}>
                                                <Text style={[styles.farmerName, { color: theme.indigo }]}>{item.farmerName}</Text>
                                                <View style={[styles.dot, { backgroundColor: theme.border }]} />
                                                <Text style={[styles.regionText, { color: theme.textMuted }]}>{item.region}</Text>
                                                <View style={[styles.dot, { backgroundColor: theme.border }]} />
                                                <Text style={[styles.distText, { color: theme.green }]}>{Math.round(item.distKm)}km</Text>
                                            </View>
                                            <Text style={[styles.varietyText, { color: theme.textMuted }]}>{item.variety}</Text>
                                        </View>
                                    </View>
                                    <View style={[styles.cardBottom, { borderTopColor: theme.border }]}>
                                        <View>
                                            <Text style={[styles.priceLabel, { color: theme.textMuted }]}>{t('pricePerKg')}</Text>
                                            <Text style={[styles.priceValue, { color: theme.textPrimary }]}>
                                                LKR {item.price.toLocaleString()}<Text style={[styles.perKg, { color: theme.textMuted }]}> /kg</Text>
                                            </Text>
                                        </View>
                                        <View style={[styles.stockBadge, { backgroundColor: theme.mode === 'dark' ? '#0f2e22' : '#F0FDF4' }]}>
                                            <Text style={[styles.stockText, { color: theme.green }]}>{item.available} kg left</Text>
                                        </View>
                                    </View>
                                    {item.available > 0 && (
                                        <View style={styles.orderHint}>
                                            <Text style={[styles.orderHintText, { color: theme.indigo }]}>Tap to order</Text>
                                            <Ionicons name="arrow-forward" size={12} color={theme.indigo} />
                                        </View>
                                    )}
                                </Pressable>
                                <View style={[styles.cardShadow, { backgroundColor: theme.cardShadowBg }]} />
                            </Animated.View>
                        );
                    }}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Ionicons name="search-outline" size={60} color={theme.border} />
                            <Text style={[styles.emptyTitle, { color: theme.textMuted }]}>{t('noListings')}</Text>
                            <Text style={[styles.emptySub, { color: theme.textMuted }]}>{t('noListingsSub')}</Text>
                        </View>
                    }
                />
            )}

            {/* Order Sheet Modal */}
            <Modal visible={!!selectedListing} animationType="slide" transparent>
                <View style={[styles.modalBackdrop, { backgroundColor: theme.bgModalBackdrop }]}>
                    <Pressable style={{ flex: 1 }} onPress={() => setSelectedListing(null)} />
                    {selectedListing && (
                        <Animated.View entering={FadeInUp} style={[styles.sheet, { backgroundColor: theme.bgCard }]}>
                            <View style={[styles.sheetHandle, { backgroundColor: theme.border }]} />
                            <View style={styles.sheetFarmerRow}>
                                <LinearGradient colors={spiceColors[selectedListing.spice] || ['#10B981','#059669']} style={styles.spiceIconBox}>
                                    <Ionicons name="cube" size={24} color="#fff" />
                                </LinearGradient>
                                <View style={{ marginLeft: 16, flex: 1 }}>
                                    <Text style={[styles.sheetFarmerName, { color: theme.textPrimary }]}>{selectedListing.spice} - {selectedListing.variety}</Text>
                                    <Text style={[styles.sheetFarmerSub, { color: theme.textMuted }]}>Farmer: {selectedListing.farmerName} · {selectedListing.hubName}</Text>
                                </View>
                                <View style={[styles.ratingBadge, { backgroundColor: theme.mode === 'dark' ? '#2d1f06' : '#FEF3C7' }]}>
                                    <Ionicons name="star" size={14} color="#D97706" />
                                    <Text style={styles.ratingBadgeText}>{selectedListing.rating}</Text>
                                </View>
                            </View>

                            <View style={[styles.infoGrid, { backgroundColor: theme.bgSecondary }]}>
                                {[
                                    { l: t('pricePerKg'), v: `LKR ${selectedListing.price.toLocaleString()}`, c: theme.textPrimary },
                                    { l: t('inStock'),   v: `${selectedListing.available} kg`,              c: theme.textPrimary },
                                    { l: 'Distance',     v: `${Math.round(selectedListing.distKm)} km`,     c: theme.green },
                                ].map((info, i, arr) => (
                                    <React.Fragment key={info.l}>
                                        <View style={styles.infoItem}>
                                            <Text style={[styles.infoL, { color: theme.textMuted }]}>{info.l}</Text>
                                            <Text style={[styles.infoV, { color: info.c }]}>{info.v}</Text>
                                        </View>
                                        {i < arr.length - 1 && <View style={[styles.infoDivider, { backgroundColor: theme.border }]} />}
                                    </React.Fragment>
                                ))}
                            </View>

                            <Text style={[styles.qtyLabel, { color: theme.textSecondary }]}>Specify Quantity (kg)</Text>
                            <View style={styles.qtyRow}>
                                <Pressable style={[styles.qtyBtn, { backgroundColor: theme.mode === 'dark' ? '#12133a' : '#EEF2FF' }]}
                                    onPress={() => setQty(q => Math.max(0, parseFloat(q || '0') - 1).toString())}>
                                    <Ionicons name="remove" size={24} color={theme.indigo} />
                                </Pressable>
                                <TextInput
                                    style={[styles.qtyInput, { backgroundColor: theme.bgSecondary, borderColor: theme.border, color: theme.textPrimary }]}
                                    keyboardType="numeric" value={qty} onChangeText={setQty} placeholder="0"
                                    placeholderTextColor={theme.textMuted} textAlign="center"
                                />
                                <Pressable style={[styles.qtyBtn, { backgroundColor: theme.mode === 'dark' ? '#12133a' : '#EEF2FF' }]}
                                    onPress={() => setQty(q => (parseFloat(q || '0') + 1).toString())}>
                                    <Ionicons name="add" size={24} color={theme.indigo} />
                                </Pressable>
                            </View>

                            <View style={styles.presetRow}>
                                {['1', '5', '10', '25'].map(v => (
                                    <Pressable key={v}
                                        style={[styles.presetBtn, { backgroundColor: theme.bgSecondary, borderColor: theme.border },
                                            qty === v && { backgroundColor: theme.mode === 'dark' ? '#12133a' : '#EEF2FF', borderColor: theme.indigo }]}
                                        onPress={() => setQty(v)}>
                                        <Text style={[styles.presetText, { color: qty === v ? theme.indigo : theme.textMuted }]}>{v}kg</Text>
                                    </Pressable>
                                ))}
                            </View>

                            <View style={styles.totalCard}>
                                <View>
                                    <Text style={styles.totalLabel}>Grand Total</Text>
                                    <Text style={styles.totalValue}>LKR {itemTotal.toLocaleString()}</Text>
                                </View>
                                <Ionicons name="receipt-outline" size={32} color="rgba(255,255,255,0.2)" />
                            </View>

                            <Pressable style={styles.addCartBtn} onPress={handleAddToCart} disabled={addedToCart}>
                                <LinearGradient colors={addedToCart ? ['#10B981','#059669'] : ['#6366F1','#4F46E5']} style={styles.addCartBtnG}>
                                    <Ionicons name={addedToCart ? "checkmark-circle" : "cart"} size={22} color="#fff" />
                                    <Text style={styles.addCartText}>{addedToCart ? 'Added to Cart!' : t('addToCart')}</Text>
                                </LinearGradient>
                            </Pressable>
                        </Animated.View>
                    )}
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    lockContainer: { flex: 1, justifyContent: 'center', padding: 32 },
    lockCard: { borderRadius: 32, padding: 32, alignItems: 'center', elevation: 8 },
    lockIconBox: { width: 90, height: 90, borderRadius: 45, justifyContent: 'center', alignItems: 'center' },
    lockTitle: { fontFamily: 'Poppins_700Bold', fontSize: 22, marginTop: 24 },
    lockSub: { fontFamily: 'Poppins_400Regular', fontSize: 14, textAlign: 'center', marginTop: 12, lineHeight: 22 },
    unlockBtn: { height: 56, width: '100%', borderRadius: 16, overflow: 'hidden', marginTop: 32 },
    unlockBtnG: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
    unlockText: { fontFamily: 'Poppins_700Bold', fontSize: 15, color: '#fff' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingBottom: 16 },
    headerTitle: { fontFamily: 'Poppins_700Bold', fontSize: 28 },
    locRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    headerSub: { fontFamily: 'Poppins_500Medium', fontSize: 12 },
    locName: { fontFamily: 'Poppins_700Bold' },
    cartBtn: { width: 50, height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center', elevation: 4 },
    cartBadge: { position: 'absolute', top: -5, right: -5, backgroundColor: '#EF4444', minWidth: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
    cartBadgeText: { color: '#fff', fontSize: 10, fontFamily: 'Poppins_700Bold' },
    tabContainer: { flexDirection: 'row', paddingHorizontal: 24, gap: 12, marginBottom: 20 },
    tab: { flex: 1, height: 44, borderRadius: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, borderWidth: 1 },
    tabText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13 },
    tabCount: { fontSize: 11, fontFamily: 'Poppins_400Regular' },
    filterRow: { marginBottom: 16 },
    filterContent: { paddingHorizontal: 24 },
    pill: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 16, marginRight: 10, borderWidth: 1 },
    pillText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13 },
    searchBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 24, paddingHorizontal: 16, height: 54, borderRadius: 18, marginBottom: 20, borderWidth: 1 },
    searchInput: { flex: 1, marginLeft: 12, fontFamily: 'Poppins_500Medium', fontSize: 14 },
    listContent: { paddingHorizontal: 24, paddingBottom: 100 },
    cardWrapper: { marginBottom: 20, position: 'relative' },
    card: { borderRadius: 24, padding: 20, borderWidth: 1, elevation: 2 },
    cardShadow: { position: 'absolute', bottom: -5, left: 12, right: 12, height: 14, borderRadius: 24, opacity: 0.08 },
    cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
    spiceIconBox: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    cardInfo: { marginLeft: 14, flex: 1 },
    cardName: { fontFamily: 'Poppins_700Bold', fontSize: 15 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' },
    farmerName: { fontFamily: 'Poppins_600SemiBold', fontSize: 11 },
    regionText: { fontFamily: 'Poppins_500Medium', fontSize: 11 },
    distText: { fontFamily: 'Poppins_700Bold', fontSize: 11 },
    varietyText: { fontFamily: 'Poppins_500Medium', fontSize: 10, marginTop: 3 },
    dot: { width: 3, height: 3, borderRadius: 2 },
    ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    ratingText: { fontFamily: 'Poppins_700Bold', fontSize: 12 },
    cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 12, borderTopWidth: 1 },
    priceLabel: { fontFamily: 'Poppins_500Medium', fontSize: 10 },
    priceValue: { fontFamily: 'Poppins_700Bold', fontSize: 16 },
    perKg: { fontSize: 11, fontFamily: 'Poppins_400Regular' },
    stockBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    stockText: { fontFamily: 'Poppins_700Bold', fontSize: 10 },
    orderHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 10 },
    orderHintText: { fontFamily: 'Poppins_600SemiBold', fontSize: 11 },
    empty: { alignItems: 'center', marginTop: 60, paddingHorizontal: 20 },
    emptyTitle: { fontFamily: 'Poppins_700Bold', fontSize: 18, marginTop: 16 },
    emptySub: { fontFamily: 'Poppins_400Regular', fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 20 },
    modalBackdrop: { flex: 1 },
    sheet: { borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 28, paddingBottom: 48, elevation: 24 },
    sheetHandle: { width: 44, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 24 },
    sheetFarmerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    sheetFarmerName: { fontFamily: 'Poppins_700Bold', fontSize: 18 },
    sheetFarmerSub: { fontFamily: 'Poppins_500Medium', fontSize: 12, marginTop: 2 },
    ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    ratingBadgeText: { fontFamily: 'Poppins_700Bold', fontSize: 12, color: '#D97706' },
    infoGrid: { flexDirection: 'row', borderRadius: 20, padding: 16, marginBottom: 24 },
    infoItem: { flex: 1, alignItems: 'center' },
    infoL: { fontFamily: 'Poppins_500Medium', fontSize: 10 },
    infoV: { fontFamily: 'Poppins_700Bold', fontSize: 14, marginTop: 4 },
    infoDivider: { width: 1, marginHorizontal: 4 },
    qtyLabel: { fontFamily: 'Poppins_700Bold', fontSize: 14, marginBottom: 12 },
    qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
    qtyBtn: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    qtyInput: { flex: 1, height: 56, borderRadius: 18, borderWidth: 1, fontFamily: 'Poppins_700Bold', fontSize: 22 },
    presetRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    presetBtn: { flex: 1, paddingVertical: 10, borderRadius: 14, alignItems: 'center', borderWidth: 1 },
    presetText: { fontFamily: 'Poppins_600SemiBold', fontSize: 12 },
    totalCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 20, padding: 20, marginBottom: 20 },
    totalLabel: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: '#94A3B8' },
    totalValue: { fontFamily: 'Poppins_700Bold', fontSize: 22, color: '#fff' },
    addCartBtn: { height: 64, borderRadius: 24, overflow: 'hidden' },
    addCartBtnG: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
    addCartText: { fontFamily: 'Poppins_700Bold', fontSize: 16, color: '#fff' },
});
