import React from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useOrders, OrderStatus } from '../../context/OrderContext';
import { useUser } from '../../context/UserContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { SkeletonCard } from '../../components/SkeletonCard';

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string; darkBg: string; icon: string; step: number }> = {
    PENDING:    { label: 'Awaiting Farmer',  color: '#D97706', bg: '#FEF3C7', darkBg: '#2d1f06', icon: 'time-outline',             step: 1 },
    ACCEPTED:   { label: 'Accepted',         color: '#059669', bg: '#ECFDF5', darkBg: '#062010', icon: 'checkmark-circle-outline', step: 2 },
    REJECTED:   { label: 'Rejected',         color: '#DC2626', bg: '#FEF2F2', darkBg: '#2d0606', icon: 'close-circle-outline',     step: 0 },
    IN_TRANSIT: { label: 'On the Way',       color: '#6366F1', bg: '#EEF2FF', darkBg: '#12133a', icon: 'bus-outline',              step: 3 },
    DELIVERED:  { label: 'Delivered',        color: '#0EA5E9', bg: '#F0F9FF', darkBg: '#062030', icon: 'checkmark-done-outline',   step: 4 },
};

const TRANSPORT_ICONS: Record<string, string> = {
    'Bike': 'bicycle-outline', 'Three-Wheeler': 'car-sport-outline',
    'Lorry': 'bus-outline', 'Heavy Truck': 'trail-sign-outline',
};

const spiceColors: Record<string, [string, string]> = {
    Cinnamon: ['#F59E0B', '#D97706'], Pepper: ['#1E293B', '#0F172A'],
    Cardamom: ['#10B981', '#059669'], Clove: ['#8B5CF6', '#6D28D9'], Nutmeg: ['#EC4899', '#BE185D'],
};

const STEPS: OrderStatus[] = ['PENDING', 'ACCEPTED', 'IN_TRANSIT', 'DELIVERED'];

const OrderProgressBar = ({ status, theme }: { status: OrderStatus; theme: any }) => {
    if (status === 'REJECTED') return null;
    const currentStep = STATUS_CONFIG[status].step;
    return (
        <View style={styles.progressContainer}>
            {STEPS.map((s, i) => {
                const done = STATUS_CONFIG[s].step <= currentStep;
                const isActive = s === status;
                return (
                    <React.Fragment key={s}>
                        <View style={styles.stepWrapper}>
                            <View style={[
                                styles.stepDot,
                                { backgroundColor: theme.border },
                                done && styles.stepDotDone,
                                isActive && styles.stepDotActive
                            ]}>
                                {done && <Ionicons name="checkmark" size={10} color="#fff" />}
                            </View>
                            <Text style={[
                                styles.stepLabel,
                                { color: theme.textMuted },
                                isActive && { color: theme.indigo, fontFamily: 'Poppins_700Bold' }
                            ]}>
                                {STATUS_CONFIG[s].label}
                            </Text>
                        </View>
                        {i < STEPS.length - 1 && (
                            <View style={[
                                styles.progressLine,
                                { backgroundColor: theme.border },
                                STATUS_CONFIG[STEPS[i + 1]].step <= currentStep && styles.progressLineDone
                            ]} />
                        )}
                    </React.Fragment>
                );
            })}
        </View>
    );
};

export default function CustomerOrders() {
    const router = useRouter();
    const { orders, loading } = useOrders();
    const { profile } = useUser();
    const { t } = useLanguage();
    const { theme } = useTheme();

    const myOrders = profile.name
        ? orders.filter(o => o.customer === profile.name || o.customer?.includes(profile.name))
        : orders;

    return (
        <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.bg }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: theme.textPrimary }]}>{t('myOrders')}</Text>
                <Text style={[styles.subtitle, { color: theme.textMuted }]}>{t('trackShipments')}</Text>
            </View>

            {loading ? (
                <View style={styles.listContent}>
                    {[1, 2, 3].map(i => <SkeletonCard key={i} height={200} />)}
                </View>
            ) : (
                <FlatList
                    data={myOrders}
                    keyExtractor={o => o._id || o.id || Math.random().toString()}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item, index }) => {
                        const qty    = item.qty || item.quantity || 0;
                        const cfg    = STATUS_CONFIG[item.status] || STATUS_CONFIG['PENDING'];
                        const colors = spiceColors[item.spice] || ['#10B981', '#059669'];
                        const mode   = item.mode || 'Lorry';
                        const badgeBg = theme.mode === 'dark' ? cfg.darkBg : cfg.bg;

                        return (
                            <Animated.View entering={FadeInDown.delay(index * 100)} style={styles.cardWrapper}>
                                <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                                    <LinearGradient colors={colors} style={styles.colorBand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
                                    <View style={styles.cardInner}>
                                        <View style={styles.cardTopRow}>
                                            <View>
                                                <Text style={[styles.spiceName, { color: theme.textPrimary }]}>{item.spice}</Text>
                                                <Text style={[styles.orderId, { color: theme.textMuted }]}>#{item._id?.slice(-6).toUpperCase() || item.id?.slice(-6).toUpperCase() || 'NEW'}</Text>
                                            </View>
                                            <View style={[styles.statusBadge, { backgroundColor: badgeBg }]}>
                                                <Ionicons name={cfg.icon as any} size={13} color={cfg.color} />
                                                <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                                            </View>
                                        </View>

                                        <OrderProgressBar status={item.status} theme={theme} />

                                        <View style={[styles.metricsRow, { backgroundColor: theme.bgSecondary }]}>
                                            <View style={styles.metric}>
                                                <Text style={[styles.mLabel, { color: theme.textMuted }]}>{t('quantity')}</Text>
                                                <Text style={[styles.mVal, { color: theme.textPrimary }]}>{qty} {t('kg')}</Text>
                                            </View>
                                            <View style={[styles.mDivider, { backgroundColor: theme.border }]} />
                                            <View style={styles.metric}>
                                                <Text style={[styles.mLabel, { color: theme.textMuted }]}>{t('totalPaid')}</Text>
                                                <Text style={[styles.mVal, { color: theme.textPrimary }]}>{t('lkr')} {item.revenue?.toLocaleString() || '0'}</Text>
                                            </View>
                                            <View style={[styles.mDivider, { backgroundColor: theme.border }]} />
                                            <View style={styles.metric}>
                                                <Text style={[styles.mLabel, { color: theme.textMuted }]}>{t('transportLabel')}</Text>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                                                    <Ionicons name={TRANSPORT_ICONS[mode] as any || 'bus-outline'} size={14} color={theme.indigo} />
                                                    <Text style={[styles.mVal, { color: theme.indigo, fontSize: 11 }]}>{mode}</Text>
                                                </View>
                                            </View>
                                        </View>

                                        {item.status === 'REJECTED' && (
                                            <View style={[styles.rejectedBox, { backgroundColor: theme.mode === 'dark' ? '#2d0606' : '#FEF2F2' }]}>
                                                <Ionicons name="alert-circle-outline" size={16} color="#DC2626" />
                                                <Text style={[styles.rejectedText, { color: '#DC2626' }]}>{t('rejectedByCopy')}</Text>
                                            </View>
                                        )}

                                        {(item.status === 'IN_TRANSIT' || item.status === 'DELIVERED') && (
                                            <Pressable
                                                style={styles.trackBtn}
                                                onPress={() => router.push({
                                                    pathname: '/tracking-dashboard',
                                                    params: { id: item._id || item.id, spice: item.spice, status: item.status, mode, qty }
                                                })}
                                            >
                                                <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.trackBtnG}>
                                                    <Ionicons name="navigate-circle" size={20} color="#fff" />
                                                    <Text style={styles.trackBtnText}>{t('trackLiveRoute')}</Text>
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
                            <Text style={[styles.emptyTitle, { color: theme.textMuted }]}>{t('noOrdersYet')}</Text>
                            <Text style={[styles.emptySub, { color: theme.textMuted }]}>{t('noOrdersSub')}</Text>
                            <Pressable
                                style={[styles.shopBtn, { backgroundColor: theme.mode === 'dark' ? '#12133a' : '#EEF2FF' }]}
                                onPress={() => router.push('/(customer)/marketplace')}
                            >
                                <Text style={[styles.shopBtnText, { color: theme.indigo }]}>{t('goToMarketplace')}</Text>
                            </Pressable>
                        </View>
                    )}
                />
            )}
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
    cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    spiceName: { fontFamily: 'Poppins_700Bold', fontSize: 20 },
    orderId: { fontFamily: 'Poppins_400Regular', fontSize: 11, marginTop: 2 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
    statusText: { fontFamily: 'Poppins_700Bold', fontSize: 10 },
    progressContainer: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20, justifyContent: 'space-between' },
    stepWrapper: { alignItems: 'center', flex: 1 },
    stepDot: { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
    stepDotDone: { backgroundColor: '#10B981' },
    stepDotActive: { backgroundColor: '#6366F1', elevation: 4 },
    stepLabel: { fontFamily: 'Poppins_500Medium', fontSize: 9, textAlign: 'center' },
    progressLine: { flex: 1, height: 2, marginTop: 10, alignSelf: 'flex-start' },
    progressLineDone: { backgroundColor: '#10B981' },
    metricsRow: { flexDirection: 'row', borderRadius: 18, padding: 14, marginBottom: 16 },
    metric: { flex: 1, alignItems: 'center' },
    mLabel: { fontFamily: 'Poppins_500Medium', fontSize: 10 },
    mVal: { fontFamily: 'Poppins_700Bold', fontSize: 13, marginTop: 4 },
    mDivider: { width: 1, marginHorizontal: 4 },
    rejectedBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 16, marginBottom: 16 },
    rejectedText: { fontFamily: 'Poppins_500Medium', fontSize: 12, flex: 1 },
    trackBtn: { height: 56, borderRadius: 18, overflow: 'hidden' },
    trackBtnG: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
    trackBtnText: { fontFamily: 'Poppins_700Bold', fontSize: 14, color: '#fff' },
    empty: { alignItems: 'center', marginTop: 60, paddingHorizontal: 20 },
    emptyTitle: { fontFamily: 'Poppins_700Bold', fontSize: 18, marginTop: 16 },
    emptySub: { fontFamily: 'Poppins_400Regular', fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 20 },
    shopBtn: { marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
    shopBtnText: { fontFamily: 'Poppins_700Bold', fontSize: 13 },
});
