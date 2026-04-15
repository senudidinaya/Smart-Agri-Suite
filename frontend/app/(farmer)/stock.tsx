import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, Alert, Modal, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp, Layout } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useUser } from '../../context/UserContext';
import { useStock, Listing } from '../../context/StockContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { predictPrice } from '../../lib/priceApi';
import { SkeletonCard } from '../../components/SkeletonCard';

const SPICES = ['All', 'Cinnamon', 'Pepper', 'Cardamom', 'Clove', 'Nutmeg'];
const BASE_PRICES: Record<string, number> = { Cinnamon: 2400, Pepper: 1500, Cardamom: 3800, Clove: 2950, Nutmeg: 2550 };
const spiceColors: Record<string, [string, string]> = {
    Cinnamon: ['#F59E0B', '#D97706'], Pepper: ['#1E293B', '#0F172A'],
    Cardamom: ['#10B981', '#059669'], Clove: ['#8B5CF6', '#6D28D9'], Nutmeg: ['#EC4899', '#BE185D'],
};

export default function FarmerStockListing() {
    const router = useRouter();
    const { profile } = useUser();
    const { listings, myListings, addListing, removeListing, updateListing, loading } = useStock();
    const { t } = useLanguage();
    const { theme } = useTheme();

    const [activeTab, setActiveTab] = useState<'MY_STOCK' | 'GLOBAL_FEED'>('MY_STOCK');
    const [spiceFilter, setSpiceFilter] = useState('All');
    const [isAddModal, setIsAddModal] = useState(false);
    const [newSpice, setNewSpice]     = useState('Cinnamon');
    const [newQty, setNewQty]         = useState('');
    const [newVariety, setNewVariety] = useState('');
    const [moisture, setMoisture]     = useState('12');
    const [editingId, setEditingId]   = useState<string | null>(null);
    const [estimatedPrice, setEstimatedPrice] = useState<number>(BASE_PRICES['Cinnamon']);
    const [priceFromModel, setPriceFromModel] = useState(false);
    const [priceFetching, setPriceFetching]   = useState(false);

    const fetchModelPrice = useCallback(async () => {
        if (!isAddModal) return;
        setPriceFetching(true);
        const region = profile.location?.address || 'Kandy';
        const result = await predictPrice(newSpice, region, parseFloat(moisture || '12'));
        setEstimatedPrice(result.price);
        setPriceFromModel(result.fromModel);
        setPriceFetching(false);
    }, [newSpice, profile.location, moisture, isAddModal]);

    useEffect(() => { fetchModelPrice(); }, [fetchModelPrice]);

    const isProfileComplete = !!(profile.name && profile.location);

    const mine = useMemo(() => {
        const all = myListings(profile.name || '');
        return (spiceFilter === 'All' ? all : all.filter(l => l.spice === spiceFilter)).map(l => ({ ...l, id: l._id || l.id || '' }));
    }, [myListings, profile.name, spiceFilter]);

    const globalFeed = useMemo(() => {
        const others = listings.filter(l => l.farmerId !== (profile.name || ''));
        return (spiceFilter === 'All' ? others : others.filter(l => l.spice === spiceFilter)).map(l => ({ ...l, id: l._id || l.id || '' }));
    }, [listings, profile.name, spiceFilter]);

    const displayData = activeTab === 'MY_STOCK' ? mine : globalFeed;

    const handlePublish = () => {
        if (!newQty || parseFloat(newQty) <= 0) return Alert.alert('Required', 'Please enter a valid quantity.');
        const data = {
            farmerId: profile.name || 'Unknown Farmer', farmerName: profile.name || 'Unknown Farmer',
            hubName: `${profile.name}'s Hub`, region: profile.location?.address || 'Colombo',
            lat: profile.location?.latitude || 6.9271, lng: profile.location?.longitude || 79.8612,
            spice: newSpice, variety: newVariety || 'Standard Grade',
            price: estimatedPrice, stock: parseFloat(newQty), totalStock: parseFloat(newQty),
        } as any;
        if (editingId) { updateListing(editingId, data); Alert.alert('Updated! ✅', `Your ${newSpice} listing has been updated.`); }
        else { addListing(data); Alert.alert('Published! ✅', `Your ${newSpice} listing is now live.`); }
        setIsAddModal(false); setEditingId(null); setNewQty(''); setNewVariety('');
    };

    const handleEdit = (item: Listing) => {
        setEditingId(item._id || item.id || null);
        setNewSpice(item.spice); setNewVariety(item.variety); setNewQty(item.stock.toString());
        setIsAddModal(true);
    };

    const handleDelete = (id: string, spice: string) => {
        Alert.alert('Remove Listing', `Remove this ${spice} listing?`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Remove', style: 'destructive', onPress: () => removeListing(id) },
        ]);
    };

    if (!isProfileComplete) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
                <View style={styles.lockContainer}>
                    <Animated.View entering={FadeInDown} style={[styles.lockCard, { backgroundColor: theme.bgCard }]}>
                        <View style={[styles.lockIconBox, { backgroundColor: theme.mode === 'dark' ? '#0f2e22' : '#F0FDF4' }]}>
                            <Ionicons name="map-outline" size={50} color={theme.green} />
                        </View>
                        <Text style={[styles.lockTitle, { color: theme.textPrimary }]}>{t('setupHubFirst')}</Text>
                        <Text style={[styles.lockSub, { color: theme.textMuted }]}>{t('setupHubSub')}</Text>
                        <Pressable style={styles.unlockBtn} onPress={() => router.push('/(farmer)/profile')}>
                            <LinearGradient colors={['#10B981', '#059669']} style={styles.unlockBtnG}>
                                <Ionicons name="person-outline" size={18} color="#fff" />
                                <Text style={styles.unlockText}>{t('setupProfile')}</Text>
                            </LinearGradient>
                        </Pressable>
                    </Animated.View>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>{t('harvestInventory')}</Text>
                    <Text style={[styles.headerSub, { color: theme.textMuted }]}>{t('manageListings')}</Text>
                </View>
                <Pressable style={styles.addBtn} onPress={() => { setIsAddModal(true); setEditingId(null); }}>
                    <LinearGradient colors={['#10B981', '#059669']} style={styles.addBtnG}>
                        <Ionicons name="add" size={24} color="#fff" />
                    </LinearGradient>
                </Pressable>
            </View>

            {/* Tabs */}
            <View style={styles.tabContainer}>
                {[
                    { key: 'MY_STOCK' as const,    label: t('myHarvestsTab') },
                    { key: 'GLOBAL_FEED' as const, label: t('marketWatch') },
                ].map(tab => (
                    <Pressable key={tab.key}
                        style={[styles.tab, { backgroundColor: theme.bgCard, borderColor: theme.border },
                            activeTab === tab.key && { backgroundColor: theme.mode === 'dark' ? '#0f2e22' : '#F0FDF4', borderColor: theme.green }]}
                        onPress={() => setActiveTab(tab.key)}>
                        <Text style={[styles.tabText, { color: activeTab === tab.key ? theme.green : theme.textMuted }]}>{tab.label}</Text>
                    </Pressable>
                ))}
            </View>

            {/* Filter pills */}
            <View style={styles.filterRow}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                    {SPICES.map(s => (
                        <Pressable key={s}
                            style={[styles.pill, { backgroundColor: theme.bgCard, borderColor: theme.border },
                                spiceFilter === s && { backgroundColor: theme.green, borderColor: theme.green }]}
                            onPress={() => setSpiceFilter(s)}>
                            <Text style={[styles.pillText, { color: spiceFilter === s ? '#fff' : theme.textMuted }]}>{s}</Text>
                        </Pressable>
                    ))}
                </ScrollView>
            </View>

            {loading ? (
                <View style={styles.listContent}>
                    {[1,2,3].map(i => <SkeletonCard key={i} height={140} />)}
                </View>
            ) : (
                <FlatList
                    data={displayData}
                    keyExtractor={item => item._id || item.id || Math.random().toString()}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item, index }) => {
                        const colors = spiceColors[item.spice] || ['#10B981','#059669'];
                        const isMine = activeTab === 'MY_STOCK';
                        const currentId = item._id || item.id || '';
                        return (
                            <Animated.View entering={FadeInDown.delay(index * 100)} layout={Layout.springify()} style={styles.cardWrapper}>
                                <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                                    <LinearGradient colors={colors} style={styles.spiceAccent} start={{x:0,y:0}} end={{x:1,y:0}} />
                                    <View style={styles.cardTop}>
                                        <LinearGradient colors={colors} style={styles.spiceIconBox}>
                                            <Ionicons name="cube" size={22} color="#fff" />
                                        </LinearGradient>
                                        <View style={styles.cardInfo}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                <Text style={[styles.cardSpice, { color: theme.textPrimary }]}>{item.spice}</Text>
                                                {isMine && (
                                                    <View style={styles.actionIcons}>
                                                        <Pressable onPress={() => handleEdit(item)} style={styles.iconBtn}>
                                                            <Ionicons name="create-outline" size={20} color={theme.indigo} />
                                                        </Pressable>
                                                        <Pressable onPress={() => handleDelete(currentId, item.spice)} style={styles.iconBtn}>
                                                            <Ionicons name="trash-outline" size={20} color={theme.red} />
                                                        </Pressable>
                                                    </View>
                                                )}
                                            </View>
                                            <Text style={[styles.cardVariety, { color: theme.textMuted }]}>{item.variety}</Text>
                                            <View style={styles.metaRow}>
                                                <Text style={[styles.regionText, { color: theme.green }]}>{item.region}</Text>
                                                {!isMine && <View style={[styles.dot, { backgroundColor: theme.border }]} />}
                                                {!isMine && <Text style={[styles.farmerName, { color: theme.textMuted }]}>{item.farmerName}</Text>}
                                            </View>
                                        </View>
                                    </View>

                                    <View style={[styles.cardBottom, { borderTopColor: theme.border }]}>
                                        <View style={styles.stockInfo}>
                                            <Text style={[styles.metricLabel, { color: theme.textMuted }]}>{t('stockLevel')}</Text>
                                            <View style={styles.stockRow}>
                                                <View style={[styles.stockBar, { backgroundColor: theme.bgSecondary }]}>
                                                    <View style={[styles.stockLevel, { width: `${(item.stock / item.totalStock) * 100}%`, backgroundColor: colors[0] }]} />
                                                </View>
                                                <Text style={[styles.stockText, { color: theme.textPrimary }]}>{item.stock} {t('kg')}</Text>
                                            </View>
                                            {item.reserved > 0 && <Text style={[styles.reservedText, { color: theme.amber }]}>{item.reserved} {t('reservedInCarts')}</Text>}
                                        </View>
                                        <View style={styles.priceInfo}>
                                            <Text style={[styles.metricLabel, { color: theme.textMuted }]}>{t('pricePerKg')}</Text>
                                            <Text style={[styles.priceValue, { color: theme.textPrimary }]}>LKR {item.price.toLocaleString()}</Text>
                                        </View>
                                    </View>
                                </View>
                                <View style={[styles.cardShadow, { backgroundColor: theme.cardShadowBg }]} />
                            </Animated.View>
                        );
                    }}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Ionicons name="cube-outline" size={64} color={theme.border} />
                            <Text style={[styles.emptyTitle, { color: theme.textMuted }]}>
                                {activeTab === 'MY_STOCK' ? t('noHarvestsListed') : t('noMarketActivity')}
                            </Text>
                            <Text style={[styles.emptySub, { color: theme.textMuted }]}>
                                {activeTab === 'MY_STOCK' ? t('noHarvestsSub') : t('noMarketSub')}
                            </Text>
                        </View>
                    }
                />
            )}

            {/* Publish / Edit Modal */}
            <Modal visible={isAddModal} animationType="slide" transparent>
                <View style={[styles.modalBackdrop, { backgroundColor: theme.bgModalBackdrop }]}>
                    <Pressable style={{ flex: 1 }} onPress={() => { setIsAddModal(false); setEditingId(null); }} />
                    <Animated.View entering={FadeInUp} style={[styles.sheet, { backgroundColor: theme.bgCard }]}>
                        <View style={[styles.sheetHandle, { backgroundColor: theme.border }]} />
                        <Text style={[styles.sheetTitle, { color: theme.textPrimary }]}>
                            {editingId ? t('editListing') : t('publishNewHarvest')}
                        </Text>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{t('selectSpiceType')}</Text>
                            <View style={styles.spiceSelection}>
                                {SPICES.filter(s => s !== 'All').map(s => (
                                    <Pressable key={s}
                                        style={[styles.spicePill, { backgroundColor: theme.bgSecondary, borderColor: theme.border },
                                            newSpice === s && { borderColor: theme.green, backgroundColor: theme.mode === 'dark' ? '#0f2e22' : '#F0FDF4' }]}
                                        onPress={() => setNewSpice(s)}>
                                        <Text style={[styles.spicePillText, { color: newSpice === s ? theme.green : theme.textMuted }]}>{s}</Text>
                                    </Pressable>
                                ))}
                            </View>

                            <View style={styles.inputRow}>
                                {[
                                    { label: t('quantityKg'), val: newQty, set: setNewQty, kb: 'numeric', ph: 'e.g. 50' },
                                    { label: t('varietyGrade'), val: newVariety, set: setNewVariety, kb: 'default', ph: 'e.g. Grade A' },
                                ].map(f => (
                                    <View key={f.label} style={{ flex: 1 }}>
                                        <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{f.label}</Text>
                                        <View style={[styles.inputBox, { backgroundColor: theme.bgInput, borderColor: theme.border }]}>
                                            <TextInput
                                                style={[styles.input, { color: theme.textPrimary }]}
                                                keyboardType={f.kb as any} value={f.val} onChangeText={f.set as any}
                                                placeholder={f.ph} placeholderTextColor={theme.textMuted}
                                            />
                                        </View>
                                    </View>
                                ))}
                            </View>

                            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{t('moistureContent')}</Text>
                            <View style={styles.moistureRow}>
                                {[10,11,12,13,14].map(v => (
                                    <Pressable key={v}
                                        style={[styles.mPill, { backgroundColor: theme.bgSecondary },
                                            moisture === v.toString() && { backgroundColor: theme.mode === 'dark' ? '#12133a' : '#EEF2FF' }]}
                                        onPress={() => setMoisture(v.toString())}>
                                        <Text style={[styles.mText, { color: moisture === v.toString() ? theme.indigo : theme.textMuted }]}>{v}%</Text>
                                    </Pressable>
                                ))}
                            </View>

                            <View style={[styles.priceCard, { backgroundColor: theme.mode === 'dark' ? '#0f2e22' : '#F0FDF4', borderColor: theme.green + '30' }]}>
                                <View style={styles.priceCardHeader}>
                                    <Ionicons name="trending-up" size={18} color={theme.green} />
                                    <Text style={[styles.priceCardTitle, { color: theme.mode === 'dark' ? '#34d399' : '#065F46' }]}>{t('predictedMarketPrice')}</Text>
                                    {priceFromModel && (
                                        <View style={[styles.aiBadge, { backgroundColor: theme.green }]}>
                                            <Text style={styles.aiBadgeText}>{t('aiLive')}</Text>
                                        </View>
                                    )}
                                </View>
                                {priceFetching
                                    ? <ActivityIndicator color={theme.green} size="small" style={{ marginTop: 10 }} />
                                    : <Text style={[styles.priceCardVal, { color: theme.mode === 'dark' ? '#34d399' : '#065F46' }]}>
                                        LKR {estimatedPrice?.toLocaleString()} <Text style={{ fontSize: 12, opacity: 0.7 }}>/ {t('kg')}</Text>
                                      </Text>
                                }
                                <Text style={[styles.priceCardSub, { color: theme.mode === 'dark' ? '#34d399' : '#065F46', opacity: 0.7 }]}>
                                    Recommended for {profile.location?.address} region.
                                </Text>
                            </View>

                            <Pressable style={styles.publishBtn} onPress={handlePublish}>
                                <LinearGradient colors={['#10B981', '#059669']} style={styles.publishBtnG}>
                                    <Text style={styles.publishText}>{editingId ? t('saveChanges') : t('confirmPublish')}</Text>
                                </LinearGradient>
                            </Pressable>
                        </ScrollView>
                    </Animated.View>
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
    header: { padding: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerTitle: { fontFamily: 'Poppins_700Bold', fontSize: 26 },
    headerSub: { fontFamily: 'Poppins_400Regular', fontSize: 13, marginTop: 2 },
    addBtn: { width: 50, height: 50, borderRadius: 16, overflow: 'hidden', elevation: 4 },
    addBtnG: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    tabContainer: { flexDirection: 'row', paddingHorizontal: 24, marginBottom: 20, gap: 12 },
    tab: { flex: 1, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
    tabText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13 },
    filterRow: { marginBottom: 16 },
    filterScroll: { paddingHorizontal: 24 },
    pill: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 16, marginRight: 10, borderWidth: 1 },
    pillText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13 },
    listContent: { paddingHorizontal: 24, paddingBottom: 100 },
    cardWrapper: { marginBottom: 20, position: 'relative' },
    card: { borderRadius: 24, overflow: 'hidden', borderWidth: 1, elevation: 2 },
    spiceAccent: { height: 4 },
    cardShadow: { position: 'absolute', bottom: -5, left: 12, right: 12, height: 14, borderRadius: 24, opacity: 0.08 },
    cardTop: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingBottom: 16 },
    spiceIconBox: { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    cardInfo: { marginLeft: 16, flex: 1 },
    cardSpice: { fontFamily: 'Poppins_700Bold', fontSize: 18 },
    cardVariety: { fontFamily: 'Poppins_500Medium', fontSize: 12, marginTop: 2 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
    regionText: { fontFamily: 'Poppins_600SemiBold', fontSize: 11 },
    farmerName: { fontFamily: 'Poppins_500Medium', fontSize: 11 },
    dot: { width: 3, height: 3, borderRadius: 2 },
    actionIcons: { flexDirection: 'row', gap: 8 },
    iconBtn: { padding: 4 },
    cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 20, paddingBottom: 20, paddingTop: 16, borderTopWidth: 1 },
    metricLabel: { fontFamily: 'Poppins_500Medium', fontSize: 10, marginBottom: 6 },
    stockInfo: { flex: 1 },
    stockRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    stockBar: { width: 100, height: 6, borderRadius: 3, overflow: 'hidden' },
    stockLevel: { height: '100%', borderRadius: 3 },
    stockText: { fontFamily: 'Poppins_700Bold', fontSize: 13 },
    reservedText: { fontFamily: 'Poppins_500Medium', fontSize: 9, marginTop: 4 },
    priceInfo: { alignItems: 'flex-end' },
    priceValue: { fontFamily: 'Poppins_700Bold', fontSize: 18 },
    empty: { alignItems: 'center', marginTop: 80, paddingHorizontal: 40 },
    emptyTitle: { fontFamily: 'Poppins_700Bold', fontSize: 18, marginTop: 20 },
    emptySub: { fontFamily: 'Poppins_400Regular', fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 22 },
    modalBackdrop: { flex: 1 },
    sheet: { borderTopLeftRadius: 36, borderTopRightRadius: 36, padding: 28, position: 'absolute', bottom: 0, left: 0, right: 0, maxHeight: '85%', elevation: 24 },
    sheetHandle: { width: 40, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 20 },
    sheetTitle: { fontFamily: 'Poppins_700Bold', fontSize: 22, marginBottom: 20 },
    fieldLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, marginTop: 16, marginBottom: 12 },
    spiceSelection: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    spicePill: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5 },
    spicePillText: { fontFamily: 'Poppins_600SemiBold', fontSize: 12 },
    inputRow: { flexDirection: 'row', gap: 12 },
    inputBox: { height: 50, borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, justifyContent: 'center' },
    input: { fontFamily: 'Poppins_600SemiBold', fontSize: 14 },
    moistureRow: { flexDirection: 'row', gap: 8 },
    mPill: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
    mText: { fontFamily: 'Poppins_600SemiBold', fontSize: 12 },
    priceCard: { borderRadius: 20, padding: 20, marginTop: 20, borderWidth: 1 },
    priceCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    priceCardTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, flex: 1 },
    aiBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    aiBadgeText: { color: '#fff', fontSize: 8, fontFamily: 'Poppins_700Bold' },
    priceCardVal: { fontFamily: 'Poppins_700Bold', fontSize: 26, marginTop: 4 },
    priceCardSub: { fontFamily: 'Poppins_400Regular', fontSize: 11, marginTop: 4 },
    publishBtn: { height: 60, borderRadius: 18, overflow: 'hidden', marginTop: 32, marginBottom: 12 },
    publishBtnG: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    publishText: { fontFamily: 'Poppins_700Bold', fontSize: 16, color: '#fff' },
});
