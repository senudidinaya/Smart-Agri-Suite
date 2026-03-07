import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';

export default function SpiceDetailsScreen({ route, navigation }: any) {
    const { spice } = route.params;
    const { user } = useContext(AuthContext);
    const [quantity, setQuantity] = useState('');
    const [loading, setLoading] = useState(false);

    const handlePlaceOrder = async () => {
        const qtyNum = parseFloat(quantity);
        if (!qtyNum || qtyNum <= 0) {
            Alert.alert('Invalid Quantity', 'Please enter a valid quantity in kg.');
            return;
        }

        setLoading(true);
        try {
            const response = await api.post('/marketplace/orders', {
                spiceId: spice.id,
                totalQuantity: qtyNum,
                customerId: user?.id,
            });

            const status = response.data.status;
            Alert.alert('Order Placed!', `Your order status is: ${status}. Check "My Orders" tab for updates.`);
            navigation.goBack();
        } catch (error: any) {
            console.log('Error placing order', error.response?.data || error);
            Alert.alert('Error', 'Failed to place order.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <Text style={styles.title}>{spice.name}</Text>
                <Text style={styles.desc}>{spice.description}</Text>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Quantity to Order (kg):</Text>
                    <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        placeholder="e.g. 100"
                        value={quantity}
                        onChangeText={setQuantity}
                    />
                </View>

                <TouchableOpacity style={styles.button} onPress={handlePlaceOrder} disabled={loading}>
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Place Order</Text>}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9f9f9', padding: 16 },
    card: { backgroundColor: '#fff', borderRadius: 12, padding: 20, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4 },
    title: { fontSize: 26, fontWeight: 'bold', color: '#2E7D32', marginBottom: 12 },
    desc: { fontSize: 16, color: '#555', marginBottom: 24, lineHeight: 22 },
    inputContainer: { marginBottom: 24 },
    label: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 8 },
    input: { backgroundColor: '#f0f0f0', borderRadius: 8, padding: 16, fontSize: 18 },
    button: { backgroundColor: '#FF9800', borderRadius: 8, padding: 16, alignItems: 'center' },
    buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
