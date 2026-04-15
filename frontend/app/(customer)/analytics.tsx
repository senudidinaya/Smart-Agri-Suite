import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { useOrders } from '../../context/OrderContext';
import { useUser } from '../../context/UserContext';
import { getCustomerTrends } from '../../lib/priceApi';

const SPICES = ['Cinnamon', 'Pepper', 'Cardamom', 'Clove', 'Nutmeg'];

export default function CustomerAnalytics() {
    const { t } = useLanguage();
    const { theme } = useTheme();
    const { orders } = useOrders();
    const { profile } = useUser();

    const [trends, setTrends] = useState<Record<string, Record<number, number>>>({});
    const [fetching, setFetching] = useState(true);

    const currentMonth = new Date().getMonth() + 1;
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    useEffect(() => {
        const fetchT = async () => {
            const data = await getCustomerTrends();
            setTrends(data.trends || {});
            setFetching(false);
        };
        fetchT();
    }, []);

    // Analyze Customer Purchase Pattern
    const myOrders = orders.filter(o => o.customer === profile.name || o.customer?.includes(profile.name || ""));
    const purchasedSpices: Record<string, number> = {};
    let totalSpent = 0;
    myOrders.forEach(o => {
        if (!purchasedSpices[o.spice]) purchasedSpices[o.spice] = 0;
        purchasedSpices[o.spice] += o.qty;
        totalSpent += o.revenue || 0;
    });

    const favoriteSpice = Object.keys(purchasedSpices).length > 0 
        ? Object.keys(purchasedSpices).reduce((a, b) => purchasedSpices[a] > purchasedSpices[b] ? a : b) 
        : null;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top']}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                
                {/* Header */}
                <View style={styles.header}>
                    <Text style={[styles.title, { color: theme.textPrimary }]}>Market Insights</Text>
                    <Text style={[styles.subtitle, { color: theme.textMuted }]}>Predictive Purchasing Trends & Seasonality</Text>
                </View>

                {/* 1. My Purchasing Patterns */}
                <Animated.View entering={FadeInDown} style={styles.heroWrapper}>
                    <LinearGradient colors={['#3B82F6', '#2563EB']} style={styles.heroCard}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                            <Ionicons name="pie-chart" size={18} color="#fff" />
                            <Text style={styles.hLabel}>Your Purchase Pattern</Text>
                        </View>
                        
                        {favoriteSpice ? (
                            <View style={styles.patternRow}>
                                <View style={styles.patternItem}>
                                    <Text style={styles.pLabel}>Top Spice</Text>
                                    <Text style={styles.pVal}>{favoriteSpice}</Text>
                                </View>
                                <View style={styles.patternDivider} />
                                <View style={styles.patternItem}>
                                    <Text style={styles.pLabel}>Volume</Text>
                                    <Text style={styles.pVal}>{purchasedSpices[favoriteSpice]}kg</Text>
                                </View>
                                <View style={styles.patternDivider} />
                                <View style={styles.patternItem}>
                                    <Text style={styles.pLabel}>Total Spent</Text>
                                    <Text style={styles.pVal}>LKR {(totalSpent / 1000).toFixed(1)}k</Text>
                                </View>
                            </View>
                        ) : (
                            <Text style={styles.hVal}>
                                You haven't made any purchases yet. Your patterns will appear here once you buy.
                            </Text>
                        )}
                        
                    </LinearGradient>
                    <View style={[styles.heroShadow, { backgroundColor: '#3B82F6' }]} />
                </Animated.View>

                {/* Smart Restock Alert */}
                {favoriteSpice && trends[favoriteSpice] && (
                    <Animated.View entering={FadeInDown.delay(100)} style={[styles.alertCard, { backgroundColor: theme.mode === 'dark' ? '#0f2e22' : '#F0FDF4', borderColor: theme.green + '40' }]}>
                        <View style={[styles.alertIcon, { backgroundColor: theme.green }]}>
                            <Ionicons name="notifications" size={20} color="#fff" />
                        </View>
                        <View style={styles.alertContent}>
                            <Text style={[styles.alertTitle, { color: theme.textPrimary }]}>Smart Restock Alert</Text>
                            <Text style={[styles.alertDesc, { color: theme.textMuted }]}>
                                Supply for your favorite <Text style={{ fontFamily: 'Poppins_700Bold', color: theme.green }}>{favoriteSpice}</Text> is currently 
                                {trends[favoriteSpice][currentMonth] > 0.6 ? ' HIGH. ' : ' LOW. '} 
                                {trends[favoriteSpice][currentMonth] > 0.6 ? 'Great time to buy in bulk as market prices are lower.' : 'Consider waiting until next month as market prices are elevated.'}
                            </Text>
                        </View>
                    </Animated.View>
                )}

                {/* 2. Seasonal Supply Heatmap */}
                <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Spice Seasonality Heatmap</Text>
                <Text style={[styles.sectionSub, { color: theme.textMuted }]}>1.0 = Peak Supply (Cheaper) | 0.1 = Low Supply (Expensive)</Text>

                <Animated.View entering={FadeInDown.delay(200)} style={[styles.heatmapCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                    {fetching ? (
                        <ActivityIndicator size="large" color={theme.indigo} style={{ padding: 40 }}/>
                    ) : (
                        <View>
                            <View style={styles.hmHeader}>
                                <Text style={[styles.hmColSp, { color: theme.textMuted }]}>Spice</Text>
                                <Text style={[styles.hmCol, { color: theme.textMuted }]}>{monthNames[currentMonth === 1 ? 11 : currentMonth - 2]}</Text>
                                <Text style={[styles.hmCol, { color: theme.indigo, fontFamily: 'Poppins_700Bold' }]}>{monthNames[currentMonth - 1]}</Text>
                                <Text style={[styles.hmCol, { color: theme.textMuted }]}>{monthNames[currentMonth === 12 ? 0 : currentMonth]}</Text>
                            </View>

                            {SPICES.map(spice => {
                                const tr = trends[spice] || {};
                                const prev = tr[currentMonth === 1 ? 12 : currentMonth - 1] || 0.5;
                                const curr = tr[currentMonth] || 0.5;
                                const next = tr[currentMonth === 12 ? 1 : currentMonth + 1] || 0.5;

                                const getColor = (val: number) => {
                                    if (val >= 0.8) return '#10B981'; // High Supply
                                    if (val >= 0.4) return '#F59E0B'; // Med Supply
                                    return '#EF4444'; // Low Supply
                                };

                                return (
                                    <View key={spice} style={[styles.hmRow, { borderBottomColor: theme.border }]}>
                                        <Text style={[styles.hmItemSp, { color: theme.textPrimary }]}>{spice}</Text>
                                        <View style={styles.hmCol}>
                                            <View style={[styles.heatPill, { backgroundColor: getColor(prev) + (theme.mode === 'dark' ? '40' : '20') }]}>
                                                <Text style={[styles.heatVal, { color: getColor(prev) }]}>{prev.toFixed(1)}</Text>
                                            </View>
                                        </View>
                                        <View style={styles.hmCol}>
                                            <View style={[styles.heatPill, { backgroundColor: getColor(curr) + (theme.mode === 'dark' ? '60' : '30'), borderWidth: 1, borderColor: getColor(curr) }]}>
                                                <Text style={[styles.heatVal, { color: getColor(curr) }]}>{curr.toFixed(1)}</Text>
                                            </View>
                                        </View>
                                        <View style={styles.hmCol}>
                                            <View style={[styles.heatPill, { backgroundColor: getColor(next) + (theme.mode === 'dark' ? '40' : '20') }]}>
                                                <Text style={[styles.heatVal, { color: getColor(next) }]}>{next.toFixed(1)}</Text>
                                            </View>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </Animated.View>

                <View style={{ height: 120 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { padding: 24 },
    header: { marginBottom: 28 },
    title: { fontFamily: 'Poppins_700Bold', fontSize: 28 },
    subtitle: { fontFamily: 'Poppins_400Regular', fontSize: 13, marginTop: 4 },
    
    heroWrapper: { position: 'relative', marginBottom: 24 },
    heroCard: { borderRadius: 32, padding: 32, zIndex: 2 },
    heroShadow: { position: 'absolute', bottom: -10, left: 20, right: 20, height: 30, borderRadius: 40, opacity: 0.3, zIndex: 1 },
    hLabel: { fontFamily: 'Poppins_700Bold', fontSize: 14, color: '#DBEAFE' },
    hVal: { fontFamily: 'Poppins_500Medium', fontSize: 14, color: '#fff', lineHeight: 22 },
    
    patternRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    patternItem: { flex: 1 },
    patternDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.2)' },
    pLabel: { fontFamily: 'Poppins_500Medium', fontSize: 11, color: '#BFDBFE' },
    pVal: { fontFamily: 'Poppins_700Bold', fontSize: 18, color: '#fff', marginTop: 4 },
    
    alertCard: { flexDirection: 'row', padding: 20, borderRadius: 24, borderWidth: 1, marginBottom: 32, alignItems: 'center' },
    alertIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    alertContent: { flex: 1, marginLeft: 16 },
    alertTitle: { fontFamily: 'Poppins_700Bold', fontSize: 14 },
    alertDesc: { fontFamily: 'Poppins_400Regular', fontSize: 12, marginTop: 4, lineHeight: 18 },

    sectionTitle: { fontFamily: 'Poppins_700Bold', fontSize: 18 },
    sectionSub: { fontFamily: 'Poppins_500Medium', fontSize: 11, marginBottom: 16 },

    heatmapCard: { borderRadius: 24, borderWidth: 1, padding: 20, overflow: 'hidden' },
    hmHeader: { flexDirection: 'row', paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.1)' },
    hmColSp: { flex: 2, fontFamily: 'Poppins_600SemiBold', fontSize: 11, textTransform: 'uppercase' },
    hmCol: { flex: 1, alignItems: 'center', fontFamily: 'Poppins_600SemiBold', fontSize: 11, textTransform: 'uppercase' },
    
    hmRow: { flexDirection: 'row', paddingVertical: 14, borderBottomWidth: 1, alignItems: 'center' },
    hmItemSp: { flex: 2, fontFamily: 'Poppins_700Bold', fontSize: 13 },
    heatPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    heatVal: { fontFamily: 'Poppins_700Bold', fontSize: 11 },
});
