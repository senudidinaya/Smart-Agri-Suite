import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useOrders, Order, OrderStatus } from '../../context/OrderContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';

const TRANSPORT_ICONS: Record<string, string> = {
    'Bike': 'bicycle-outline', 'Three-Wheeler': 'car-sport-outline',
    'Lorry': 'bus-outline', 'Heavy Truck': 'trail-sign-outline',
};

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string; darkBg: string; icon: string }> = {
    PENDING:    { label: 'PENDING',    color: '#D97706', bg: '#FEF3C7', darkBg: '#2d1f06', icon: 'time-outline' },
    ACCEPTED:   { label: 'ACCEPTED',  color: '#059669', bg: '#ECFDF5', darkBg: '#062010', icon: 'checkmark-circle-outline' },
    REJECTED:   { label: 'REJECTED',  color: '#DC2626', bg: '#FEF2F2', darkBg: '#2d0606', icon: 'close-circle-outline' },
    IN_TRANSIT: { label: 'IN TRANSIT', color: '#6366F1', bg: '#EEF2FF', darkBg: '#12133a', icon: 'bus-outline' },
    DELIVERED:  { label: 'DELIVERED', color: '#0EA5E9', bg: '#F0F9FF', darkBg: '#062030', icon: 'checkmark-done-outline' },
};

const spiceColors: Record<string, [string, string]> = {
    Cinnamon:['#F59E0B','#D97706'], Pepper:['#1E293B','#0F172A'],
    Cardamom:['#10B981','#059669'], Clove:['#8B5CF6','#6D28D9'], Nutmeg:['#EC4899','#BE185D'],
};

export default function FarmerOrders() {
    const router = useRouter();
    const { orders, acceptOrder, rejectOrder, updateOrderStatus } = useOrders();
    const { t } = useLanguage();
    const { theme } = useTheme();
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const doAction = async (id: string, action: () => Promise<void>) => {
        setActionLoading(id);
        await action();
        setActionLoading(null);
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top']}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: theme.textPrimary }]}>{t('inboundOrdersTitle')}</Text>
                <Text style={[styles.subtitle, { color: theme.textMuted }]}>{t('manageFullfilments')}</Text>
            </View>

            <FlatList
                data={orders}
                keyExtractor={o => o._id || o.id || Math.random().toString()}
                contentContainerStyle={styles.listContent}
                renderItem={({ item: order, index }) => {
                    const qty    = order.qty || order.quantity || 0;
                    const cfg    = STATUS_CONFIG[order.status] || STATUS_CONFIG['PENDING'];
                    const colors = spiceColors[order.spice] || ['#10B981','#059669'];
                    const mode   = order.mode || 'Lorry';
                    const id     = order._id || order.id || '';
                    const isLoading = actionLoading === id;
                    const badgeBg   = theme.mode === 'dark' ? cfg.darkBg : cfg.bg;

                    return (
                        <Animated.View entering={FadeInDown.delay(index * 80)} style={styles.cardWrapper}>
                            <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                                <LinearGradient colors={colors} style={styles.colorBand} start={{ x:0, y:0 }} end={{ x:1, y:0 }} />
                                <View style={styles.cardInner}>
                                    <View style={styles.topRow}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.spice, { color: theme.textPrimary }]}>{order.spice}</Text>
                                            <Text style={[styles.customer, { color: theme.textMuted }]}>
                                                {order.customer || 'Customer'} · #{id.slice(-6).toUpperCase() || 'NEW'}
                                            </Text>
                                        </View>
                                        <View style={[styles.statusBadge, { backgroundColor: badgeBg }]}>
                                            <Ionicons name={cfg.icon as any} size={12} color={cfg.color} />
                                            <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                                        </View>
                                    </View>

                                    {/* Metrics */}
                                    <View style={[styles.metrics, { backgroundColor: theme.bgSecondary }]}>
                                        {[
                                            { l: t('quantity'),    v: `${qty} ${t('kg')}` },
                                            { l: t('netProceeds'), v: `${t('lkr')} ${order.revenue?.toLocaleString() || 0}` },
                                            { l: t('vehicle'),     v: mode },
                                        ].map((m, i, arr) => (
                                            <React.Fragment key={m.l}>
                                                <View style={styles.metric}>
                                                    <Text style={[styles.mLabel, { color: theme.textMuted }]}>{m.l}</Text>
                                                    {m.l === t('vehicle')
                                                        ? <View style={{ flexDirection:'row', alignItems:'center', gap:4, marginTop:4 }}>
                                                            <Ionicons name={TRANSPORT_ICONS[m.v] as any || 'bus-outline'} size={12} color={theme.indigo} />
                                                            <Text style={[styles.mVal, { color: theme.indigo, fontSize: 11 }]}>{m.v}</Text>
                                                          </View>
                                                        : <Text style={[styles.mVal, { color: theme.textPrimary }]}>{m.v}</Text>
                                                    }
                                                </View>
                                                {i < arr.length - 1 && <View style={[styles.mDivider, { backgroundColor: theme.border }]} />}
                                            </React.Fragment>
                                        ))}
                                    </View>

                                    {/* Actions */}
                                    {order.status === 'PENDING' && (
                                        <View style={styles.actionsRow}>
                                            <Pressable
                                                style={[styles.rejectBtn, { borderColor: theme.red }]}
                                                disabled={isLoading}
                                                onPress={() => Alert.alert('Reject Order', 'Are you sure?', [
                                                    { text: 'Cancel', style: 'cancel' },
                                                    { text: 'Reject', style: 'destructive', onPress: () => doAction(id, () => rejectOrder(id)) }
                                                ])}
                                            >
                                                <Text style={[styles.rejectText, { color: theme.red }]}>{t('rejectOrder')}</Text>
                                            </Pressable>
                                            <Pressable
                                                style={styles.acceptBtn}
                                                disabled={isLoading}
                                                onPress={() => doAction(id, () => acceptOrder(id))}
                                            >
                                                <LinearGradient colors={['#10B981','#059669']} style={styles.acceptBtnG}>
                                                    <Ionicons name="checkmark" size={18} color="#fff" />
                                                    <Text style={styles.acceptText}>{t('acceptOrder')}</Text>
                                                </LinearGradient>
                                            </Pressable>
                                        </View>
                                    )}

                                    {order.status === 'ACCEPTED' && (
                                        <Pressable
                                            style={styles.fullBtn}
                                            onPress={() => doAction(id, () => updateOrderStatus(id, 'IN_TRANSIT'))}
                                            disabled={isLoading}
                                        >
                                            <LinearGradient colors={['#6366F1','#4F46E5']} style={styles.fullBtnG}>
                                                <Ionicons name="bus-outline" size={18} color="#fff" />
                                                <Text style={styles.fullBtnText}>{t('handOverTransport')}</Text>
                                            </LinearGradient>
                                        </Pressable>
                                    )}

                                    {(order.status === 'IN_TRANSIT' || order.status === 'DELIVERED') && (
                                        <Pressable
                                            style={styles.fullBtn}
                                            onPress={() => router.push({
                                                pathname: '/tracking-dashboard',
                                                params: { id, spice: order.spice, status: order.status, mode, qty }
                                            })}
                                        >
                                            <LinearGradient colors={['#0EA5E9','#0284C7']} style={styles.fullBtnG}>
                                                <Ionicons name="navigate-circle" size={18} color="#fff" />
                                                <Text style={styles.fullBtnText}>{t('viewLiveRoute')}</Text>
                                            </LinearGradient>
                                        </Pressable>
                                    )}
                                </View>
                            </View>
                            <View style={[styles.cardShadow, { backgroundColor: theme.cardShadowBg }]} />
                        </Animated.View>
                    );
                }}
                ListEmptyComponent={() => (
                    <View style={styles.empty}>
                        <Ionicons name="receipt-outline" size={64} color={theme.border} />
                        <Text style={[styles.emptyTitle, { color: theme.textMuted }]}>{t('noOrdersTitle')}</Text>
                        <Text style={[styles.emptySub, { color: theme.textMuted }]}>{t('noOrdersFarmerSub')}</Text>
                    </View>
                )}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { padding: 24, paddingBottom: 12 },
    title: { fontFamily: 'Poppins_700Bold', fontSize: 28 },
    subtitle: { fontFamily: 'Poppins_400Regular', fontSize: 13, marginTop: 2 },
    listContent: { paddingHorizontal: 24, paddingBottom: 120 },
    cardWrapper: { marginBottom: 20, position: 'relative' },
    card: { borderRadius: 28, overflow: 'hidden', elevation: 2, borderWidth: 1 },
    cardShadow: { position: 'absolute', bottom: -6, left: 14, right: 14, height: 16, borderRadius: 28, opacity: 0.08 },
    colorBand: { height: 5 },
    cardInner: { padding: 20 },
    topRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20, gap: 12 },
    spice: { fontFamily: 'Poppins_700Bold', fontSize: 20 },
    customer: { fontFamily: 'Poppins_400Regular', fontSize: 12, marginTop: 2 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
    statusText: { fontFamily: 'Poppins_700Bold', fontSize: 10 },
    metrics: { flexDirection: 'row', borderRadius: 18, padding: 14, marginBottom: 16 },
    metric: { flex: 1, alignItems: 'center' },
    mLabel: { fontFamily: 'Poppins_500Medium', fontSize: 10 },
    mVal: { fontFamily: 'Poppins_700Bold', fontSize: 13, marginTop: 4 },
    mDivider: { width: 1, marginHorizontal: 4 },
    actionsRow: { flexDirection: 'row', gap: 12 },
    rejectBtn: { flex: 1, height: 52, borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5 },
    rejectText: { fontFamily: 'Poppins_700Bold', fontSize: 14 },
    acceptBtn: { flex: 2, height: 52, borderRadius: 18, overflow: 'hidden' },
    acceptBtnG: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
    acceptText: { fontFamily: 'Poppins_700Bold', fontSize: 14, color: '#fff' },
    fullBtn: { height: 54, borderRadius: 18, overflow: 'hidden' },
    fullBtnG: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
    fullBtnText: { fontFamily: 'Poppins_700Bold', fontSize: 14, color: '#fff' },
    empty: { alignItems: 'center', marginTop: 80, paddingHorizontal: 20 },
    emptyTitle: { fontFamily: 'Poppins_700Bold', fontSize: 18, marginTop: 16 },
    emptySub: { fontFamily: 'Poppins_400Regular', fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 20 },
});
