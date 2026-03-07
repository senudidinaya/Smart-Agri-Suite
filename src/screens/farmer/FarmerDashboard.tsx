import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Alert, ActivityIndicator, Modal, ScrollView } from 'react-native';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Header from '../../components/Header';
import { Ionicons } from '@expo/vector-icons';

export default function FarmerDashboard() {
    const { user } = useContext(AuthContext);
    const [inventory, setInventory] = useState<any[]>([]);
    const [spices, setSpices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);

    // Form State
    const [selectedSpice, setSelectedSpice] = useState<string>('');
    const [quantity, setQuantity] = useState('');
    const [price, setPrice] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Fetch farmer's own items and available master spices
    const fetchData = async () => {
        try {
            setLoading(true);
            const [invRes, spiceRes] = await Promise.all([
                api.get(`/marketplace/inventory/farmer/${user?.id}`),
                api.get('/marketplace/spices')
            ]);
            setInventory(invRes.data);
            setSpices(spiceRes.data);
        } catch (error) {
            console.log('Error fetching farmer data', error);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [])
    );

    const handleAddInventory = async () => {
        if (!selectedSpice || !quantity || !price) {
            Alert.alert('Error', 'Please fill all fields');
            return;
        }
        setSubmitting(true);
        try {
            await api.post('/marketplace/inventory', {
                farmerId: user?.id,
                spiceId: selectedSpice,
                quantity: parseFloat(quantity),
                pricePerUnit: parseFloat(price),
                unit: 'kg'
            });
            Alert.alert('Success', 'Inventory added successfully!');
            setModalVisible(false);
            setQuantity('');
            setPrice('');
            setSelectedSpice('');
            fetchData(); // Refresh list
        } catch (error: any) {
            console.log('Error adding inventory', error.response?.data);
            Alert.alert('Error', 'Failed to add inventory');
        } finally {
            setSubmitting(false);
        }
    };

    // Helper to map spiceId to spice name since inventory API returns spiceId
    const getSpiceName = (id: string) => {
        const s = spices.find(x => x.id === id);
        return s ? s.name : 'Unknown Spice';
    };

    // Calculate statistics
    const stats = useMemo(() => {
        let totalItems = 0;
        let totalValue = 0;
        inventory.forEach(item => {
            totalItems += item.quantity;
            totalValue += item.quantity * item.pricePerUnit;
        });
        return { totalItems, totalValue };
    }, [inventory]);

    const renderItem = ({ item }: { item: any }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.iconContainer}>
                    <Ionicons name="leaf" size={20} color="#FF9800" />
                </View>
                <Text style={styles.spiceName}>{getSpiceName(item.spiceId)}</Text>
            </View>
            <View style={styles.divider} />
            <Text style={styles.spiceName}>{getSpiceName(item.spiceId)}</Text>
            <View style={styles.row}>
                <Text style={styles.label}>Available Qty:</Text>
                <Text style={styles.value}>{item.quantity} kg</Text>
            </View>
            <View style={styles.row}>
                <Text style={styles.label}>Price/Unit:</Text>
                <Text style={styles.value}>Rs. {item.pricePerUnit}</Text>
            </View>
            <View style={styles.row}>
                <Text style={styles.label}>Added On:</Text>
                <Text style={styles.value}>{new Date(item.createdAt).toLocaleDateString()}</Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Header title="My Inventory" themeColor="#FF9800" />

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#FF9800" />
                </View>
            ) : (
                <FlatList
                    data={inventory}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    ListHeaderComponent={
                        <View style={styles.statsContainer}>
                            <View style={styles.statCard}>
                                <Ionicons name="cube-outline" size={24} color="#2196F3" />
                                <Text style={styles.statValue}>{stats.totalItems} kg</Text>
                                <Text style={styles.statLabel}>Total Available</Text>
                            </View>
                            <View style={styles.statCard}>
                                <Ionicons name="cash-outline" size={24} color="#4CAF50" />
                                <Text style={styles.statValue}>Rs. {stats.totalValue.toLocaleString()}</Text>
                                <Text style={styles.statLabel}>Est. Value</Text>
                            </View>
                        </View>
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="basket-outline" size={64} color="#ccc" style={{ marginBottom: 16 }} />
                            <Text style={styles.emptyText}>Your inventory is empty.</Text>
                            <Text style={styles.emptySubText}>Tap the + button to add spices.</Text>
                        </View>
                    }
                />
            )}

            {/* Add Inventory Modal */}
            <Modal visible={modalVisible} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Add Spice to Inventory</Text>

                        <Text style={styles.inputLabel}>Select Spice</Text>
                        <View style={styles.spiceSelectContainer}>
                            <FlatList
                                data={spices}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                keyExtractor={(item) => item.id}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={[styles.spicePill, selectedSpice === item.id && styles.spicePillActive]}
                                        onPress={() => setSelectedSpice(item.id)}
                                    >
                                        <Text style={[styles.spicePillText, selectedSpice === item.id && styles.spicePillTextActive]}>
                                            {item.name}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            />
                        </View>

                        <Text style={styles.inputLabel}>Quantity (kg)</Text>
                        <TextInput style={styles.input} keyboardType="numeric" value={quantity} onChangeText={setQuantity} placeholder="e.g. 50" />

                        <Text style={styles.inputLabel}>Price per kg (Rs)</Text>
                        <TextInput style={styles.input} keyboardType="numeric" value={price} onChangeText={setPrice} placeholder="e.g. 1500" />

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setModalVisible(false)}>
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalBtn, styles.submitBtn]} onPress={handleAddInventory} disabled={submitting}>
                                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Add</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
                <Ionicons name="add" size={30} color="#fff" />
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f4f6f9' },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    list: { padding: 16, paddingBottom: 100 },
    statsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    statCard: { flex: 1, backgroundColor: '#fff', padding: 16, borderRadius: 16, marginHorizontal: 4, alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
    statValue: { fontSize: 18, fontWeight: 'bold', color: '#333', marginTop: 8 },
    statLabel: { fontSize: 12, color: '#888', marginTop: 4 },
    emptyContainer: { paddingVertical: 60, justifyContent: 'center', alignItems: 'center' },
    emptyText: { fontSize: 18, color: '#555', fontWeight: 'bold' },
    emptySubText: { fontSize: 14, color: '#888', marginTop: 8 },
    card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    iconContainer: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFF3E0', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    spiceName: { fontSize: 20, fontWeight: 'bold', color: '#2C3E50', letterSpacing: 0.5 },
    divider: { height: 1, backgroundColor: '#f0f0f0', marginBottom: 12 },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' },
    label: { fontSize: 14, color: '#666', fontWeight: '500' },
    value: { fontSize: 15, fontWeight: 'bold', color: '#333' },
    fab: { position: 'absolute', right: 24, bottom: 90, backgroundColor: '#FF9800', width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#FF9800', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 6 },

    // Modal styles
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, elevation: 5 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 20 },
    inputLabel: { fontSize: 14, fontWeight: 'bold', color: '#555', marginBottom: 8 },
    input: { backgroundColor: '#f5f5f5', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 16 },
    spiceSelectContainer: { marginBottom: 16 },
    spicePill: { backgroundColor: '#eee', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
    spicePillActive: { backgroundColor: '#FF9800' },
    spicePillText: { color: '#555', fontWeight: '600' },
    spicePillTextActive: { color: '#fff' },
    modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
    modalBtn: { flex: 1, padding: 14, borderRadius: 8, alignItems: 'center', marginHorizontal: 4 },
    cancelBtn: { backgroundColor: '#eee' },
    cancelBtnText: { color: '#333', fontWeight: 'bold', fontSize: 16 },
    submitBtn: { backgroundColor: '#FF9800' },
    submitBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
