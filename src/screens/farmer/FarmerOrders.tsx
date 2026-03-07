import React, { useState, useContext, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../../components/Header';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

export default function FarmerOrders() {
    const { user } = useContext(AuthContext);
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchOrders = async () => {
        try {
            const response = await api.get(`/marketplace/orders/farmer/${user?.id}`);
            const sorted = response.data.sort((a: any, b: any) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            setOrders(sorted);
        } catch (error) {
            console.log('Error fetching farmer orders', error);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchOrders();
        }, [])
    );

    const handleUpdateStatus = async (orderId: string) => {
        const confirmMessage = "Mark this order as Delivered? This will automatically deduct the quantity from your available inventory.";

        const executeDelivery = async () => {
            try {
                await api.patch(`/marketplace/orders/${orderId}/status`, { status: 'Delivered' });
                if (Platform.OS === 'web') {
                    window.alert('Success: Order marked as Delivered!');
                } else {
                    Alert.alert('Success', 'Order marked as Delivered!');
                }
                fetchOrders(); // Refresh list to update UI
            } catch (error: any) {
                console.log('Error updating status', error.response?.data || error.message);
                let errorMessage = 'Failed to update order status';
                if (error.response?.data?.detail) {
                    if (typeof error.response.data.detail === 'string') {
                        errorMessage = error.response.data.detail;
                    } else if (Array.isArray(error.response.data.detail)) {
                        errorMessage = error.response.data.detail.map((err: any) => err.msg || JSON.stringify(err)).join(', ');
                    }
                }
                if (Platform.OS === 'web') {
                    window.alert(`Error: ${errorMessage}`);
                } else {
                    Alert.alert('Error', errorMessage);
                }
            }
        };

        if (Platform.OS === 'web') {
            const confirmed = window.confirm(confirmMessage);
            if (confirmed) {
                executeDelivery();
            }
        } else {
            Alert.alert(
                "Confirm Delivery",
                confirmMessage,
                [
                    { text: "Cancel", style: "cancel" },
                    { text: "Confirm", onPress: executeDelivery }
                ]
            );
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Pending': return '#FFC107';
            case 'Allocated': return '#2196F3';
            case 'Delivered': return '#4CAF50';
            default: return '#757575';
        }
    };

    const renderItem = ({ item }: { item: any }) => {
        // Determine how much of this order belongs to THIS farmer
        const myAllocation = item.allocations.find((a: any) => a.farmerId === user?.id);
        const myQty = myAllocation ? myAllocation.quantity : 0;

        return (
            <View style={styles.card}>
                <View style={styles.headerRow}>
                    <View style={styles.orderIdContainer}>
                        <Ionicons name="receipt-outline" size={18} color="#FF9800" style={{ marginRight: 6 }} />
                        <Text style={styles.orderId}>Order #{item.id.slice(-6).toUpperCase()}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                        <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
                    </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.detailRow}>
                    <Text style={styles.label}>Total Order Qty:</Text>
                    <Text style={styles.value}>{item.totalQuantity} kg</Text>
                </View>
                <View style={styles.detailRow}>
                    <Text style={styles.labelHighlight}>Your FCFS Share:</Text>
                    <Text style={styles.valueHighlight}>{myQty} kg</Text>
                </View>
                <View style={styles.detailRow}>
                    <Text style={styles.label}>Date Ordered:</Text>
                    <Text style={styles.value}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                </View>

                {item.status !== 'Delivered' && item.status !== 'Cancelled' && (
                    <TouchableOpacity
                        style={styles.actionButton}
                        activeOpacity={0.8}
                        onPress={() => handleUpdateStatus(item.id)}
                    >
                        <Ionicons name="checkmark-circle-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                        <Text style={styles.actionButtonText}>Mark as Delivered</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={[]}>
            <Header title="Manage Orders" themeColor="#FF9800" />
            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#FF9800" />
                </View>
            ) : orders.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="document-text-outline" size={64} color="#ccc" style={{ marginBottom: 16 }} />
                    <Text style={styles.emptyText}>No orders received yet.</Text>
                </View>
            ) : (
                <FlatList
                    data={orders}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f4f6f9' },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    list: { padding: 16, paddingBottom: 32 },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyText: { fontSize: 18, color: '#888', fontWeight: 'bold' },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        borderLeftWidth: 5,
        borderLeftColor: '#FF9800',
    },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    orderIdContainer: { flexDirection: 'row', alignItems: 'center' },
    orderId: { fontSize: 17, fontWeight: 'bold', color: '#2C3E50', letterSpacing: 0.5 },
    statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
    statusText: { fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' },
    divider: { height: 1, backgroundColor: '#f0f0f0', marginBottom: 16 },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    label: { fontSize: 14, color: '#666', fontWeight: '500' },
    value: { fontSize: 15, fontWeight: 'bold', color: '#333' },
    labelHighlight: { fontSize: 14, color: '#FF9800', fontWeight: 'bold' },
    valueHighlight: { fontSize: 16, fontWeight: 'bold', color: '#FF9800' },
    actionButton: {
        flexDirection: 'row',
        backgroundColor: '#FF9800',
        padding: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 18,
        elevation: 2,
    },
    actionButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16, letterSpacing: 0.5 },
});
