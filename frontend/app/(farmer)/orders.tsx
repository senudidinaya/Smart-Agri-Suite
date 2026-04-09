import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, FlatList, Dimensions, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useOrders } from '../../context/OrderContext';

const { width } = Dimensions.get('window');

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
        <LinearGradient colors={colors} style={styles.spiceIconBox}><Ionicons name="cube" size={22} color="#fff" /></LinearGradient>
    );
};

export default function FarmerOrders() {
    const router = useRouter();
    const { orders } = useOrders();

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Inbound Orders</Text>
                    <Text style={styles.headerSub}>Live customer purchases & logistics</Text>
                </View>
                <View style={styles.liveBadge}><View style={styles.liveDot} /><Text style={styles.liveText}>SYNCED</Text></View>
            </View>

            <FlatList
                data={orders}
                keyExtractor={item => item._id || item.id || Math.random().toString()}
                contentContainerStyle={styles.listContent}
                renderItem={({ item, index }) => (
                    <Animated.View entering={FadeInDown.delay(index * 150)} style={styles.orderCardWrapper}>
                        <Pressable 
                            style={styles.orderCard} 
                            onPress={() => router.push({
                                pathname: '/tracking-dashboard',
                                params: { 
                                    id: item.id || item._id, 
                                    spice: item.spice, 
                                    status: item.status, 
                                    mode: item.mode || 'Lorry',
                                    qty: item.qty || (item as any).quantity
                                }
                            })}
                        >
                            <View style={styles.orderTop}>
                                <SpiceIcon type={item.spice} />
                                <View style={styles.orderMainInfo}>
                                    <View style={styles.idRow}>
                                        <Text style={styles.orderId}>{item.id || item._id}</Text>
                                        <View style={[styles.statusTag, { backgroundColor: item.status === 'DISPATCHED' ? '#ECFDF5' : '#FEF3C7' }]}>
                                             <Text style={[styles.statusTagText, { color: item.status === 'DISPATCHED' ? '#059669' : '#D97706' }]}>{item.status}</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.customerName}>{item.customer || 'Regional Buyer'}</Text>
                                </View>
                                <View style={styles.trackIcon}><Ionicons name="navigate-circle" size={32} color="#6366F1" /></View>
                            </View>

                            <View style={styles.divider} />

                            <View style={styles.orderMetrics}>
                                <View style={styles.metric}>
                                     <Text style={styles.metricL}>Variety</Text>
                                     <Text style={styles.metricV}>{item.spice}</Text>
                                </View>
                                <View style={styles.vDivider} />
                                <View style={styles.metric}>
                                     <Text style={styles.metricL}>Quantity</Text>
                                     <Text style={styles.metricV}>{item.qty || (item as any).quantity} kg</Text>
                                </View>
                                <View style={styles.vDivider} />
                                <View style={styles.metric}>
                                     <Text style={styles.metricL}>Proceeds</Text>
                                     <Text style={styles.metricV}>LKR {item.revenue.toLocaleString()}</Text>
                                </View>
                            </View>

                            <View style={styles.footerRow}>
                                <View style={styles.logisticsBox}>
                                    <Ionicons name="bus-outline" size={14} color="#64748B" />
                                    <Text style={styles.logisticsText}>{item.mode || 'Optimized Logistics'} • Tracking Active</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
                            </View>
                        </Pressable>
                        <View style={styles.cardShadow} />
                    </Animated.View>
                )}
                ListEmptyComponent={() => (
                    <View style={styles.empty}>
                        <Ionicons name="clipboard-outline" size={60} color="#CBD5E1" />
                        <Text style={styles.emptyTitle}>No Orders Yet</Text>
                        <Text style={styles.emptySub}>Your marketplace items will appear here once purchased.</Text>
                    </View>
                )}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    header: { padding: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    headerTitle: { fontFamily: 'Poppins_700Bold', fontSize: 26, color: '#0F172A' },
    headerSub: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: '#64748B', marginTop: 2 },
    liveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDF4', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, gap: 6, marginTop: 4 },
    liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
    liveText: { fontFamily: 'Poppins_700Bold', fontSize: 9, color: '#166534' },
    
    listContent: { padding: 24, paddingTop: 0, paddingBottom: 120 },
    orderCardWrapper: { marginBottom: 20, position: 'relative' },
    orderCard: { backgroundColor: '#fff', borderRadius: 28, padding: 20, zIndex: 2, borderWidth: 1, borderColor: '#F1F5F9', elevation: 2 },
    cardShadow: { position: 'absolute', bottom: -5, left: 15, right: 15, height: 20, backgroundColor: '#E2E8F0', borderRadius: 30, opacity: 0.1, zIndex: 1 },
    
    orderTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    spiceIconBox: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    orderMainInfo: { marginLeft: 14, flex: 1 },
    idRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    orderId: { fontFamily: 'Poppins_700Bold', fontSize: 12, color: '#94A3B8', letterSpacing: 0.5 },
    statusTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    statusTagText: { fontFamily: 'Poppins_700Bold', fontSize: 8 },
    customerName: { fontFamily: 'Poppins_700Bold', fontSize: 16, color: '#0F172A', marginTop: 2 },
    trackIcon: { padding: 4 },
    
    divider: { height: 1, backgroundColor: '#F1F5F9', marginBottom: 16 },
    
    orderMetrics: { flexDirection: 'row', backgroundColor: '#F8FAFC', borderRadius: 18, padding: 12, marginBottom: 16 },
    metric: { flex: 1, alignItems: 'center' },
    metricL: { fontFamily: 'Poppins_500Medium', fontSize: 10, color: '#94A3B8' },
    metricV: { fontFamily: 'Poppins_700Bold', fontSize: 13, color: '#1E293B', marginTop: 2 },
    vDivider: { width: 1, height: 24, backgroundColor: '#E2E8F0', alignSelf: 'center' },
    
    footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4 },
    logisticsBox: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    logisticsText: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: '#64748B' },

    empty: { alignItems: 'center', marginTop: 100, opacity: 0.5 },
    emptyTitle: { fontFamily: 'Poppins_700Bold', fontSize: 18, color: '#475569', marginTop: 16 },
    emptySub: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: '#94A3B8', textAlign: 'center', marginTop: 6, paddingHorizontal: 40 }
});
