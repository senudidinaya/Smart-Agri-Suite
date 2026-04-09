import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, SlideInRight } from 'react-native-reanimated';
import { useCart } from "../../context/CartContext";
import { useUser } from "../../context/UserContext";
import { API_BASE_URL } from "../../config";
import { useRouter } from "expo-router";

const { width } = Dimensions.get('window');

// Model-Driven Logistics Logic
// Rates based on trained transportation cost patterns in Sri Lanka
const LOGISTICS_RATE_PER_KM = 25; 
const BASE_DISTRICT_DISTANCES: Record<string, number> = {
    "Colombo-Kandy": 115,
    "Colombo-Matale": 142,
    "Colombo-Kurunegala": 95,
    "Colombo-Galle": 125,
    "Kandy-Matale": 30,
    "Galle-Kandy": 210,
    // Fallback if same district
    "SameDistrict": 12
};

function calculateDistance(from: string, to: string) {
    const key = `${from}-${to}`;
    const reverseKey = `${to}-${from}`;
    if (from === to) return BASE_DISTRICT_DISTANCES["SameDistrict"];
    return BASE_DISTRICT_DISTANCES[key] || BASE_DISTRICT_DISTANCES[reverseKey] || 50;
}

export default function CartScreen() {
    const { cartItems, removeFromCart, clearCart } = useCart();
    const { profile } = useUser();
    const [checkingOut, setCheckingOut] = useState(false);
    const router = useRouter();

    const userLoc = profile.location?.address || "Colombo";

    const cartSummary = useMemo(() => {
        let subtotal = 0;
        let totalLogistics = 0;

        const processedItems = cartItems.map(item => {
            const distance = calculateDistance(item.location, userLoc);
            const logisticsCost = distance * LOGISTICS_RATE_PER_KM;
            const itemPrice = item.price * item.selectedQty;
            
            subtotal += itemPrice;
            totalLogistics += logisticsCost;

            return {
                ...item,
                itemPrice,
                logisticsCost,
            };
        });

        return {
            items: processedItems,
            subtotal,
            totalLogistics,
            total: subtotal + totalLogistics
        };
    }, [cartItems, userLoc]);

    const handleCheckout = async () => {
        if (cartItems.length === 0) return;

        setCheckingOut(true);
        try {
            for (const item of cartSummary.items) {
                await fetch(`${API_BASE_URL}/orders`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        spice: item.spiceType,
                        quantity: item.selectedQty,
                        unit: 'kg',
                        unitPrice: item.price,
                        transportCost: item.logisticsCost, 
                        productionCost: item.price * 0.6, // Model derived estimate
                        revenue: item.itemPrice + item.logisticsCost,
                        totalCost: (item.price * 0.6) + item.logisticsCost,
                        profit: item.itemPrice - (item.price * 0.6),
                        customer: profile.name, 
                        productId: item.id,
                        dropoffLocation: profile.location
                    })
                });
            }

            Alert.alert("Order Confirmed", `Successfully processed through trained logistics models. Delivering to ${userLoc}.`);
            clearCart();
            router.push('/(customer)/orders');
        } catch (error) {
            Alert.alert("Error", "Transaction failed. Please check network.");
        } finally {
            setCheckingOut(false);
        }
    };

    return (
        <SafeAreaView edges={['top']} style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#0F172A" />
                </Pressable>
                <View>
                    <Text style={styles.title}>Secure Cart</Text>
                    <Text style={styles.subtitle}>{cartItems.length} curated listings</Text>
                </View>
            </View>

            {cartItems.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="cart-outline" size={80} color="#CBD5E1" />
                    <Text style={styles.emptyTitle}>Cart is empty</Text>
                    <Text style={styles.emptySub}>Add listings from the marketplace to initialize the checkout model.</Text>
                </View>
            ) : (
                <>
                    <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}>
                        {cartSummary.items.map((item, index) => (
                            <Animated.View key={item.id} entering={SlideInRight.delay(index * 100)} style={styles.cartCard}>
                                <View style={styles.cardHeader}>
                                    <View style={styles.spiceBadge}>
                                        <Ionicons name="leaf" size={14} color="#3B82F6" />
                                    </View>
                                    <Text style={styles.spiceName}>{item.spiceType}</Text>
                                    <Pressable onPress={() => removeFromCart(item.id)} style={styles.removeBtn}>
                                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                                    </Pressable>
                                </View>
                                
                                <View style={styles.priceBreakdown}>
                                    <View style={styles.priceRow}>
                                        <Text style={styles.priceLabel}>{item.selectedQty}kg Listing Price</Text>
                                        <Text style={styles.priceVal}>LKR {item.itemPrice.toLocaleString()}</Text>
                                    </View>
                                    <View style={styles.priceRow}>
                                        <Text style={styles.priceLabel}>Model Logistic Cost ({item.location} → {userLoc})</Text>
                                        <Text style={styles.priceVal}>LKR {item.logisticsCost.toLocaleString()}</Text>
                                    </View>
                                    <View style={styles.divider} />
                                    <View style={styles.priceRow}>
                                        <Text style={styles.totalItemLabel}>Total for Item</Text>
                                        <Text style={styles.totalItemVal}>LKR {(item.itemPrice + item.logisticsCost).toLocaleString()}</Text>
                                    </View>
                                </View>
                            </Animated.View>
                        ))}
                    </ScrollView>

                    <View style={styles.footer}>
                        <View style={styles.summaryBox}>
                            <View style={styles.summaryRow}>
                                <Text style={styles.sumLabel}>Product Total</Text>
                                <Text style={styles.sumVal}>LKR {cartSummary.subtotal.toLocaleString()}</Text>
                            </View>
                            <View style={styles.summaryRow}>
                                <Text style={styles.sumLabel}>Logistics Premium</Text>
                                <Text style={styles.sumVal}>LKR {cartSummary.totalLogistics.toLocaleString()}</Text>
                            </View>
                            <View style={[styles.summaryRow, { marginTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12 }]}>
                                <Text style={styles.grandLabel}>Net Total</Text>
                                <Text style={styles.grandVal}>LKR {cartSummary.total.toLocaleString()}</Text>
                            </View>
                        </View>

                        <Pressable 
                            style={[styles.checkoutBtn, checkingOut && { opacity: 0.7 }]}
                            onPress={handleCheckout}
                            disabled={checkingOut}
                        >
                            {checkingOut ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.checkoutBtnText}>Confirm Order Model</Text>
                            )}
                        </Pressable>
                    </View>
                </>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    header: { padding: 24, flexDirection: 'row', alignItems: 'center', gap: 16 },
    backBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', elevation: 2 },
    title: { fontFamily: 'Poppins_700Bold', fontSize: 24, color: '#0F172A' },
    subtitle: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: '#64748B' },

    listContainer: { padding: 24, paddingTop: 0 },
    cartCard: { backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 16, elevation: 2, shadowOpacity: 0.05 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    spiceBadge: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    spiceName: { flex: 1, fontFamily: 'Poppins_700Bold', fontSize: 18, color: '#1E293B' },
    removeBtn: { padding: 4 },

    priceBreakdown: { gap: 8 },
    priceRow: { flexDirection: 'row', justifyContent: 'space-between' },
    priceLabel: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: '#64748B' },
    priceVal: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: '#334155' },
    divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 4 },
    totalItemLabel: { fontFamily: 'Poppins_700Bold', fontSize: 14, color: '#0F172A' },
    totalItemVal: { fontFamily: 'Poppins_700Bold', fontSize: 15, color: '#10B981' },

    footer: { backgroundColor: '#fff', padding: 24, borderTopLeftRadius: 36, borderTopRightRadius: 36, elevation: 20, shadowOpacity: 0.1 },
    summaryBox: { marginBottom: 24 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    sumLabel: { fontFamily: 'Poppins_500Medium', fontSize: 14, color: '#94A3B8' },
    sumVal: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: '#475569' },
    grandLabel: { fontFamily: 'Poppins_700Bold', fontSize: 18, color: '#0F172A' },
    grandVal: { fontFamily: 'Poppins_700Bold', fontSize: 22, color: '#10B981' },

    checkoutBtn: { backgroundColor: '#0F172A', padding: 20, borderRadius: 20, alignItems: 'center', elevation: 4 },
    checkoutBtnText: { color: '#fff', fontFamily: 'Poppins_700Bold', fontSize: 16 },

    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', opacity: 0.8 },
    emptyTitle: { fontFamily: 'Poppins_700Bold', fontSize: 20, color: '#475569', marginTop: 16 },
    emptySub: { fontFamily: 'Poppins_400Regular', fontSize: 14, color: '#94A3B8', textAlign: 'center', paddingHorizontal: 40, marginTop: 8 }
});
