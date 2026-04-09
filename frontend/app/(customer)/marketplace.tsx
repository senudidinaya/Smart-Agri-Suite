import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, Dimensions, FlatList, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '../../context/LanguageContext';
import { useUser } from '../../context/UserContext';

const { width } = Dimensions.get('window');

const SPICES = ['All', 'Cinnamon', 'Pepper', 'Cardamom', 'Clove', 'Nutmeg'];

const MOCK_DATA = [
    { id: '1', name: 'Premium Cinnamon quills', variety: 'Ceylon Alba', price: 2450, region: 'Matale', spice: 'Cinnamon', rating: 4.8, reviews: 124 },
    { id: '2', name: 'Black Pepper Corns', variety: 'Organic Black', price: 1550, region: 'Kandy', spice: 'Pepper', rating: 4.5, reviews: 89 },
    { id: '3', name: 'Green Cardamom Bold', variety: 'Grade A', price: 3800, region: 'Matale', spice: 'Cardamom', rating: 4.9, reviews: 201 },
    { id: '4', name: 'Cloves Whole', variety: 'Hand-picked', price: 2950, region: 'Kurunegala', spice: 'Clove', rating: 4.7, reviews: 56 },
    { id: '5', name: 'Nutmeg Whole', variety: 'Nutmeg pods', price: 2550, region: 'Kandy', spice: 'Nutmeg', rating: 4.6, reviews: 42 },
];

const SpiceIcon = ({ type }: { type: string }) => {
    let colors = ['#10B981', '#059669'];
    switch(type) {
        case 'Cinnamon': colors = ['#F59E0B', '#D97706']; break;
        case 'Cardamom': colors = ['#10B981', '#059669']; break;
        case 'Pepper': colors = ['#1E293B', '#0F172A']; break;
        case 'Clove': colors = ['#8B5CF6', '#6D28D9']; break;
        case 'Nutmeg': colors = ['#EC4899', '#BE185D']; break;
    }
    return (
        <LinearGradient colors={colors} style={styles.spiceIconBox}><Ionicons name="cube" size={20} color="#fff" /></LinearGradient>
    );
};

export default function CustomerMarketplace() {
    const router = useRouter();
    const { t } = useLanguage();
    const { profile } = useUser();
    const [selectedSpice, setSelectedSpice] = useState('All');
    const [search, setSearch] = useState('');

    const filteredData = useMemo(() => {
        return MOCK_DATA.filter(item => {
            const matchesSpice = selectedSpice === 'All' || item.spice === selectedSpice;
            const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || 
                                 item.variety.toLowerCase().includes(search.toLowerCase());
            return matchesSpice && matchesSearch;
        });
    }, [selectedSpice, search]);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>{t('marketplace')}</Text>
                    <View style={styles.locRow}>
                         <Ionicons name="location" size={14} color="#6366F1" />
                         <Text style={styles.headerSub}>{t('sourcingFrom')} <Text style={{color: '#0F172A'}}>{profile.location?.address || 'Kandy'}</Text></Text>
                    </View>
                </View>
                <Pressable style={styles.cartBtn}>
                    <Ionicons name="cart-outline" size={24} color="#0F172A" />
                    <View style={styles.cartCount}><Text style={styles.cartText}>2</Text></View>
                </Pressable>
            </View>

            {/* SYNCED SPICE FILTER BAR */}
            <View style={{ marginBottom: 20 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                    {SPICES.map(s => (
                        <Pressable 
                            key={s} 
                            onPress={() => setSelectedSpice(s)} 
                            style={[styles.spicePill, selectedSpice === s && { backgroundColor: '#10B981', borderColor: '#10B981' }]}
                        >
                            <Text style={[styles.spicePillText, selectedSpice === s && { color: '#fff' }]}>{s}</Text>
                        </Pressable>
                    ))}
                </ScrollView>
            </View>

            <View style={styles.searchWrapper}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color="#94A3B8" />
                    <TextInput 
                        style={styles.searchInput} 
                        placeholder={t('searchVariety')} 
                        value={search} 
                        onChangeText={setSearch} 
                    />
                </View>
            </View>

            <FlatList
                data={filteredData}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                renderItem={({ item, index }) => (
                    <Animated.View entering={FadeInDown.delay(index * 100)} style={styles.itemWrapper}>
                        <Pressable style={styles.itemCard}>
                            <View style={styles.itemTop}>
                                <SpiceIcon type={item.spice} />
                                <View style={styles.itemInfo}>
                                    <Text style={styles.itemName}>{item.name}</Text>
                                    <View style={styles.regionRow}>
                                        <Text style={styles.region}>{item.region}</Text>
                                        <View style={styles.dot} />
                                        <Text style={styles.rating}><Ionicons name="star" size={12} color="#F59E0B" /> {item.rating}</Text>
                                    </View>
                                </View>
                            </View>
                            <View style={styles.itemPriceRow}>
                                <View>
                                    <Text style={styles.uPriceL}>Unit Price</Text>
                                    <Text style={styles.uPriceV}>LKR {item.price.toLocaleString()}/kg</Text>
                                </View>
                                <Pressable style={styles.addIconBtn}>
                                     <Ionicons name="add" size={24} color="#fff" />
                                </Pressable>
                            </View>
                        </Pressable>
                        <View style={styles.cardShadow} />
                    </Animated.View>
                )}
                ListFooterComponent={() => (
                    <View style={styles.footerNav}>
                         <Pressable style={styles.backBtn} onPress={() => router.replace('/auth')}>
                             <Ionicons name="arrow-back" size={18} color="#64748B" />
                             <Text style={styles.backBtnText}>{t('goBackRole')}</Text>
                         </Pressable>
                    </View>
                )}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingBottom: 16 },
    headerTitle: { fontFamily: 'Poppins_700Bold', fontSize: 28, color: '#0F172A' },
    locRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
    headerSub: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: '#64748B' },
    cartBtn: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', elevation: 4 },
    cartCount: { position: 'absolute', top: -5, right: -5, width: 18, height: 18, borderRadius: 9, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center' },
    cartText: { color: '#fff', fontSize: 10, fontFamily: 'Poppins_700Bold' },

    filterScroll: { paddingHorizontal: 24, flexGrow: 0, marginBottom: 8 },
    spicePill: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 14, backgroundColor: '#fff', marginRight: 10, borderWidth: 1, borderColor: '#F1F5F9', elevation: 2 },
    spicePillText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: '#64748B' },

    searchWrapper: { paddingHorizontal: 24, marginBottom: 20 },
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 18, paddingHorizontal: 16, height: 60, borderWidth: 1, borderColor: '#F1F5F9', elevation: 2 },
    searchInput: { flex: 1, marginLeft: 12, fontFamily: 'Poppins_400Regular', fontSize: 14 },

    listContent: { padding: 24, paddingTop: 0, paddingBottom: 110 },
    itemWrapper: { marginBottom: 20, position: 'relative' },
    itemCard: { backgroundColor: '#fff', borderRadius: 28, padding: 20, zIndex: 2, borderWidth: 1, borderColor: '#F1F5F9' },
    cardShadow: { position: 'absolute', bottom: -5, left: 15, right: 15, height: 20, backgroundColor: '#E2E8F0', borderRadius: 30, opacity: 0.1, zIndex: 1 },
    
    itemTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    spiceIconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    itemInfo: { marginLeft: 14, flex: 1 },
    itemName: { fontFamily: 'Poppins_700Bold', fontSize: 16, color: '#0F172A' },
    regionRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
    region: { fontFamily: 'Poppins_500Medium', fontSize: 12, color: '#94A3B8' },
    rating: { fontFamily: 'Poppins_700Bold', fontSize: 12, color: '#0F172A' },
    dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1' },

    itemPriceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F8FAFC' },
    uPriceL: { fontFamily: 'Poppins_500Medium', fontSize: 10, color: '#94A3B8' },
    uPriceV: { fontFamily: 'Poppins_700Bold', fontSize: 15, color: '#0F172A' },
    addIconBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center' },

    footerNav: { marginTop: 24, alignItems: 'center' },
    backBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0' },
    backBtnText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: '#64748B' }
});
