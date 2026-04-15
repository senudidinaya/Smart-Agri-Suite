import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeOutLeft, Layout } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCart } from '../../context/CartContext';
import { useUser } from '../../context/UserContext';
import { useOrders } from '../../context/OrderContext';
import { useStock } from '../../context/StockContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';

const LOGISTICS_RATE_PER_KM = 25;
const DISTRICT_DISTANCES: Record<string, number> = {
    'Colombo-Kandy': 115, 'Colombo-Matale': 142, 'Colombo-Kurunegala': 95,
    'Colombo-Galle': 125, 'Colombo-Matara': 160, 'Kandy-Matale': 30,
    'Galle-Kandy': 210,  'Galle-Matara': 45,    'SameDistrict': 12,
};

function getLogisticsCost(from: string, to: string): number {
    if (from === to) return DISTRICT_DISTANCES['SameDistrict'] * LOGISTICS_RATE_PER_KM;
    const key = `${from}-${to}`, rev = `${to}-${from}`;
    return (DISTRICT_DISTANCES[key] || DISTRICT_DISTANCES[rev] || 80) * LOGISTICS_RATE_PER_KM;
}

const spiceColors: Record<string, [string, string]> = {
    Cinnamon: ['#F59E0B', '#D97706'], Pepper: ['#1E293B', '#0F172A'],
    Cardamom: ['#10B981', '#059669'], Clove: ['#8B5CF6', '#6D28D9'], Nutmeg: ['#EC4899', '#BE185D'],
};

export default function CartScreen() {
    const router = useRouter();
    const { cartItems, removeFromCart, updateQty, clearCart } = useCart();
    const { profile } = useUser();
    const { addOrder } = useOrders();
    const { releaseReservation, reserveStock } = useStock();
    const { t } = useLanguage();
    const { theme } = useTheme();
    const [checkingOut, setCheckingOut] = useState(false);
    const userLoc = profile.location?.address || 'Colombo';

    const enriched = useMemo(() =>
        cartItems.map(item => {
            const logisticsCost = getLogisticsCost(item.region, userLoc);
            const subtotal = item.price * item.qty;
            return { ...item, logisticsCost, subtotal, lineTotal: subtotal + logisticsCost };
        }), [cartItems, userLoc]);

    const productTotal   = enriched.reduce((s, i) => s + i.subtotal, 0);
    const logisticsTotal = enriched.reduce((s, i) => s + i.logisticsCost, 0);
    const grandTotal     = productTotal + logisticsTotal;

    const handleCheckout = async () => {
        if (enriched.length === 0) return;
        setCheckingOut(true);
        for (const item of enriched) {
            const orderId = `ORD-${Date.now()}-${item.id}`;
            const revenue = item.subtotal;
            const productionCost = Math.round(revenue * 0.42);
            await addOrder({
                id: orderId, _id: orderId, listingId: item.listingId || item.id,
                spice: item.spice, qty: item.qty, unitPrice: item.price,
                transportCost: item.logisticsCost, productionCost, revenue,
                totalCost: item.logisticsCost + productionCost,
                profit: revenue - item.logisticsCost - productionCost,
                customer: profile.name || 'Customer', status: 'PENDING',
            });
        }
        clearCart();
        setCheckingOut(false);
        Alert.alert('Order Confirmed! 🎉',
            `${enriched.length} item${enriched.length > 1 ? 's' : ''} ordered successfully.\n\nTrack your deliveries in My Orders.`,
            [{ text: 'Track Orders', onPress: () => router.push('/(customer)/orders') }]
        );
    };

    return (
        <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.bg }]}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: theme.bgCard }]}>
                    <Ionicons name="arrow-back" size={22} color={theme.textPrimary} />
                </Pressable>
                <View>
                    <Text style={[styles.title, { color: theme.textPrimary }]}>{t('yourCart')}</Text>
                    <Text style={[styles.subtitle, { color: theme.textMuted }]}>
                        {cartItems.length === 0 ? t('cartEmpty') : `${cartItems.length} ${t('items')} from the marketplace`}
                    </Text>
                </View>
            </View>

            {cartItems.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <View style={[styles.emptyIconBox, { backgroundColor: theme.bgCard }]}>
                        <Ionicons name="cart-outline" size={64} color={theme.border} />
                    </View>
                    <Text style={[styles.emptyTitle, { color: theme.textMuted }]}>{t('cartEmpty')}</Text>
                    <Text style={[styles.emptySub, { color: theme.textMuted }]}>{t('cartEmptySub')}</Text>
                    <Pressable style={styles.browseBtn} onPress={() => router.push('/(customer)/marketplace')}>
                        <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.browseBtnG}>
                            <Ionicons name="compass-outline" size={18} color="#fff" />
                            <Text style={styles.browseBtnText}>{t('marketplace')}</Text>
                        </LinearGradient>
                    </Pressable>
                </View>
            ) : (
                <>
                    <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
                        {enriched.map((item, index) => (
                            <Animated.View
                                key={item.id}
                                entering={FadeInDown.delay(index * 80)}
                                exiting={FadeOutLeft}
                                layout={Layout.springify()}
                                style={styles.cartCardWrapper}
                            >
                                <View style={[styles.cartCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                                    <LinearGradient
                                        colors={spiceColors[item.spice] || ['#10B981', '#059669']}
                                        style={styles.spiceBand}
                                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                    />
                                    <View style={styles.cardInner}>
                                        <View style={styles.cardTopRow}>
                                            <View style={styles.cardTitle}>
                                                <Text style={[styles.spiceName, { color: theme.textPrimary }]}>{item.spice}</Text>
                                                <Text style={[styles.varietyText, { color: theme.textMuted }]}>{item.variety}</Text>
                                                <View style={styles.farmerRow}>
                                                    <Ionicons name="leaf" size={11} color={theme.green} />
                                                    <Text style={[styles.farmerText, { color: theme.textMuted }]}>{item.farmerName} · {item.region}</Text>
                                                </View>
                                            </View>
                                            <Pressable
                                                style={[styles.removeBtn, { backgroundColor: theme.mode === 'dark' ? '#2d0606' : '#FEF2F2' }]}
                                                onPress={() => Alert.alert('Remove Item', `Remove ${item.spice} from cart?`, [
                                                    { text: 'Cancel', style: 'cancel' },
                                                    { text: 'Remove', style: 'destructive', onPress: () => {
                                                        releaseReservation(item.listingId || item.id, item.qty);
                                                        removeFromCart(item.id);
                                                    }},
                                                ])}
                                            >
                                                <Ionicons name="trash-outline" size={18} color="#EF4444" />
                                            </Pressable>
                                        </View>

                                        {/* Qty Stepper */}
                                        <View style={styles.qtyRow}>
                                            <Text style={[styles.qtyLabel, { color: theme.textSecondary }]}>{t('quantity')}</Text>
                                            <View style={[styles.stepper, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}>
                                                <Pressable style={styles.stepBtn} onPress={() => {
                                                    if (item.qty > 1) { releaseReservation(item.listingId || item.id, 1); updateQty(item.id, item.qty - 1); }
                                                    else Alert.alert('Minimum is 1 kg. Use the trash icon to remove.');
                                                }}>
                                                    <Ionicons name="remove" size={16} color={theme.indigo} />
                                                </Pressable>
                                                <Text style={[styles.stepVal, { color: theme.textPrimary }]}>{item.qty} {t('kg')}</Text>
                                                <Pressable style={styles.stepBtn} onPress={() => {
                                                    const reserved = reserveStock(item.listingId || item.id, 1);
                                                    if (reserved) updateQty(item.id, item.qty + 1);
                                                    else Alert.alert('Stock Limit', 'No more available stock for this listing.');
                                                }}>
                                                    <Ionicons name="add" size={16} color={theme.indigo} />
                                                </Pressable>
                                            </View>
                                        </View>

                                        {/* Price Breakdown */}
                                        <View style={[styles.priceBreakdown, { backgroundColor: theme.bgSecondary }]}>
                                            <View style={styles.priceRow}>
                                                <Text style={[styles.priceLabel, { color: theme.textMuted }]}>
                                                    Spice ({item.qty} kg × LKR {item.price.toLocaleString()})
                                                </Text>
                                                <Text style={[styles.priceVal, { color: theme.textSecondary }]}>LKR {item.subtotal.toLocaleString()}</Text>
                                            </View>
                                            <View style={styles.priceRow}>
                                                <View style={styles.logisticsLabelRow}>
                                                    <Ionicons name="bus-outline" size={11} color={theme.textMuted} />
                                                    <Text style={[styles.priceLabel, { color: theme.textMuted }]}>
                                                        Logistics ({item.region} → {userLoc})
                                                    </Text>
                                                </View>
                                                <Text style={[styles.priceVal, { color: theme.textSecondary }]}>LKR {item.logisticsCost.toLocaleString()}</Text>
                                            </View>
                                            <View style={[styles.divider, { backgroundColor: theme.border }]} />
                                            <View style={styles.priceRow}>
                                                <Text style={[styles.lineTotalLabel, { color: theme.textPrimary }]}>Line Total</Text>
                                                <Text style={[styles.lineTotalVal, { color: theme.indigo }]}>LKR {item.lineTotal.toLocaleString()}</Text>
                                            </View>
                                        </View>
                                    </View>
                                </View>
                                <View style={[styles.cardShadow, { backgroundColor: theme.cardShadowBg }]} />
                            </Animated.View>
                        ))}
                        <View style={{ height: 20 }} />
                    </ScrollView>

                    {/* Footer */}
                    <View style={[styles.footer, { backgroundColor: theme.bgCard }]}>
                        <View style={styles.summaryBox}>
                            {[
                                { l: t('subtotal'),  v: `LKR ${productTotal.toLocaleString()}` },
                                { l: t('transport'), v: `LKR ${logisticsTotal.toLocaleString()}` },
                            ].map(r => (
                                <View key={r.l} style={styles.summaryRow}>
                                    <Text style={[styles.sumLabel, { color: theme.textMuted }]}>{r.l}</Text>
                                    <Text style={[styles.sumVal, { color: theme.textSecondary }]}>{r.v}</Text>
                                </View>
                            ))}
                            <View style={[styles.summaryRow, styles.grandRow, { borderTopColor: theme.border }]}>
                                <Text style={[styles.grandLabel, { color: theme.textPrimary }]}>{t('total')}</Text>
                                <Text style={[styles.grandVal, { color: theme.green }]}>LKR {grandTotal.toLocaleString()}</Text>
                            </View>
                        </View>
                        <Pressable style={[styles.checkoutBtn, checkingOut && { opacity: 0.7 }]} onPress={handleCheckout} disabled={checkingOut}>
                            <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.checkoutBtnG}>
                                {checkingOut
                                    ? <ActivityIndicator color="#fff" />
                                    : <>
                                        <Ionicons name="checkmark-circle" size={22} color="#fff" />
                                        <Text style={styles.checkoutText}>{t('placeOrder')}</Text>
                                    </>
                                }
                            </LinearGradient>
                        </Pressable>
                    </View>
                </>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 24, paddingBottom: 16 },
    backBtn: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', elevation: 2 },
    title: { fontFamily: 'Poppins_700Bold', fontSize: 24 },
    subtitle: { fontFamily: 'Poppins_400Regular', fontSize: 13, marginTop: 1 },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    emptyIconBox: { width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
    emptyTitle: { fontFamily: 'Poppins_700Bold', fontSize: 22 },
    emptySub: { fontFamily: 'Poppins_400Regular', fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 22 },
    browseBtn: { height: 56, width: '100%', borderRadius: 20, overflow: 'hidden', marginTop: 32 },
    browseBtnG: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
    browseBtnText: { fontFamily: 'Poppins_700Bold', fontSize: 15, color: '#fff' },
    listContent: { paddingHorizontal: 24, paddingBottom: 20 },
    cartCardWrapper: { marginBottom: 16, position: 'relative' },
    cartCard: { borderRadius: 24, overflow: 'hidden', elevation: 2, borderWidth: 1 },
    cardShadow: { position: 'absolute', bottom: -5, left: 12, right: 12, height: 14, borderRadius: 24, opacity: 0.08 },
    spiceBand: { height: 5 },
    cardInner: { padding: 20 },
    cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    cardTitle: { flex: 1 },
    spiceName: { fontFamily: 'Poppins_700Bold', fontSize: 18 },
    varietyText: { fontFamily: 'Poppins_500Medium', fontSize: 12, marginTop: 2 },
    farmerRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
    farmerText: { fontFamily: 'Poppins_600SemiBold', fontSize: 11 },
    removeBtn: { padding: 8, borderRadius: 12 },
    qtyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    qtyLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 13 },
    stepper: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
    stepBtn: { paddingHorizontal: 16, paddingVertical: 10 },
    stepVal: { fontFamily: 'Poppins_700Bold', fontSize: 15, paddingHorizontal: 10, minWidth: 60, textAlign: 'center' },
    priceBreakdown: { gap: 8, borderRadius: 16, padding: 14 },
    priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    logisticsLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    priceLabel: { fontFamily: 'Poppins_400Regular', fontSize: 12 },
    priceVal: { fontFamily: 'Poppins_600SemiBold', fontSize: 13 },
    divider: { height: 1, marginVertical: 4 },
    lineTotalLabel: { fontFamily: 'Poppins_700Bold', fontSize: 13 },
    lineTotalVal: { fontFamily: 'Poppins_700Bold', fontSize: 14 },
    footer: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 36, borderTopLeftRadius: 36, borderTopRightRadius: 36, elevation: 24, shadowOpacity: 0.1 },
    summaryBox: { marginBottom: 20, gap: 8 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
    sumLabel: { fontFamily: 'Poppins_500Medium', fontSize: 14 },
    sumVal: { fontFamily: 'Poppins_600SemiBold', fontSize: 14 },
    grandRow: { paddingTop: 12, borderTopWidth: 1, marginTop: 4 },
    grandLabel: { fontFamily: 'Poppins_700Bold', fontSize: 18 },
    grandVal: { fontFamily: 'Poppins_700Bold', fontSize: 22 },
    checkoutBtn: { height: 64, borderRadius: 24, overflow: 'hidden' },
    checkoutBtnG: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
    checkoutText: { fontFamily: 'Poppins_700Bold', fontSize: 17, color: '#fff' },
});
