import { View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { API_BASE_URL } from "../../config";
import { useRouter } from "expo-router";

export default function CustomerOrders() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const router = useRouter();

    const fetchOrders = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/orders`);
            const data = await response.json();
            setOrders(data);
        } catch (error) {
            console.error("Fetch orders error:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchOrders();
    };

    const renderOrderItem = ({ item, index }) => (
        <Animated.View entering={FadeInDown.delay(index * 100)} style={styles.orderCard}>
            <View style={styles.orderHeader}>
                <View>
                    <Text style={styles.spiceName}>{item.spice}</Text>
                    <Text style={styles.orderDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: item.status === 'PENDING' ? '#FEF3C7' : '#DCFCE7' }]}>
                    <Text style={[styles.statusText, { color: item.status === 'PENDING' ? '#92400E' : '#166534' }]}>{item.status}</Text>
                </View>
            </View>

            <View style={styles.orderDetails}>
                <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Quantity</Text>
                    <Text style={styles.detailValue}>{item.quantity} kg</Text>
                </View>
                <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Total Paid</Text>
                    <Text style={styles.detailValue}>LKR {item.revenue?.toLocaleString()}</Text>
                </View>
            </View>

            <View style={styles.logisticsInfo}>
                <View style={styles.logisticsMain}>
                    <Ionicons name="bus-outline" size={20} color="#3B82F6" />
                    <Text style={styles.logisticsText}>
                        Optimized Mode: <Text style={styles.boldText}>{item.logisticsMode || 'Auto'}</Text>
                    </Text>
                </View>
                <Pressable 
                    style={styles.trackBtn}
                    onPress={() => router.push({
                        pathname: '/tracking-dashboard',
                        params: {
                            id: item._id || item.id,
                            spice: item.spice,
                            status: item.status,
                            mode: item.logisticsMode || 'Van'
                        }
                    })}
                >
                    <Text style={styles.trackBtnText}>Track Route</Text>
                </Pressable>
            </View>
        </Animated.View>
    );

    return (
        <SafeAreaView edges={['top']} style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>My Orders</Text>
                <Text style={styles.subtitle}>Track your spice shipments and logistics.</Text>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#3B82F6" />
                </View>
            ) : orders.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="receipt-outline" size={80} color="#CBD5E1" />
                    <Text style={styles.emptyTitle}>No orders yet</Text>
                    <Text style={styles.emptySub}>Your purchased spices will appear here for tracking.</Text>
                </View>
            ) : (
                <FlatList 
                    data={orders}
                    keyExtractor={(item) => item._id}
                    renderItem={renderOrderItem}
                    contentContainerStyle={styles.listContainer}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    header: { padding: 20 },
    title: { fontFamily: 'Poppins_700Bold', fontSize: 28, color: '#0F172A' },
    subtitle: { fontFamily: 'Poppins_400Regular', fontSize: 15, color: '#64748B' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContainer: { padding: 20, paddingBottom: 100, gap: 16 },
    orderCard: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 20,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2
    },
    orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    spiceName: { fontFamily: 'Poppins_700Bold', fontSize: 20, color: '#1E293B' },
    orderDate: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: '#94A3B8' },
    statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    statusText: { fontFamily: 'Poppins_600SemiBold', fontSize: 12 },
    orderDetails: { flexDirection: 'row', gap: 32, paddingBottom: 16, borderBottomWidth: 1, borderColor: '#F1F5F9' },
    detailLabel: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: '#64748B' },
    detailValue: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: '#1E293B', marginTop: 2 },
    logisticsInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
    logisticsMain: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    logisticsText: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: '#64748B' },
    boldText: { fontFamily: 'Poppins_600SemiBold', color: '#1E293B' },
    trackBtn: { backgroundColor: '#F1F5F9', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
    trackBtnText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: '#3B82F6' },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', opacity: 0.8 },
    emptyTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 20, color: '#475569', marginTop: 16 },
    emptySub: { fontFamily: 'Poppins_400Regular', fontSize: 14, color: '#94A3B8', textAlign: 'center', marginHorizontal: 40, marginTop: 8 }
});
