import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Pressable,
    ActivityIndicator,
    Image,
    Dimensions,
    ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { API_BASE_URL } from '../../src/config';
import { useAuth } from '../../context/AuthContext';

const SCREEN_W = Dimensions.get('window').width;
const CARD_PAD = 16;
const CARD_W = SCREEN_W - CARD_PAD * 2;

// ══════════════════════════ TYPES ══════════════════════════

interface ListingPhoto { id: number; url: string; is_primary: boolean }

interface LandListing {
    id: number;
    title: string;
    status: string;
    area_acres: number | null;
    area_hectares: number | null;
    owner_name?: string;
    expected_price: number | null;
    listing_purpose?: string;
    photos?: ListingPhoto[] | null;
    analytics?: { prediction_label: string | null } | null;
}

// ══════════════════════════ HELPERS ══════════════════════════

function landBadge(label: string | null) {
    if (label === 'VEGETATION_LAND') return { emoji: '🌿', text: 'Vegetation', bg: '#dcfce7', color: '#16a34a', glow: '#bbf7d0' };
    if (label === 'IDLE_LAND') return { emoji: '🟤', text: 'Idle Land', bg: '#fef3c7', color: '#d97706', glow: '#fde68a' };
    if (label === 'BUILT_LAND') return { emoji: '🏠', text: 'Built-up', bg: '#e0e7ff', color: '#4338ca', glow: '#c7d2fe' };
    return { emoji: '❔', text: 'Unknown', bg: '#f1f5f9', color: '#64748b', glow: '#e2e8f0' };
}

function statusStyle(status: string) {
    if (status === 'verified') return { color: '#16a34a', bg: '#f0fdf4', icon: '✅', label: 'Verified' };
    if (status === 'pending') return { color: '#d97706', bg: '#fffbeb', icon: '⏳', label: 'Pending' };
    if (status === 'rejected') return { color: '#dc2626', bg: '#fef2f2', icon: '❌', label: 'Rejected' };
    if (status === 'sold') return { color: '#2563eb', bg: '#eff6ff', icon: '💰', label: 'Sold' };
    return { color: '#64748b', bg: '#f1f5f9', icon: '•', label: status };
}

function purposeLabel(p?: string) {
    if (p === 'sell') return '🏷️ For Sale';
    if (p === 'lease') return '📋 For Lease';
    if (p === 'partnership') return '🤝 Partnership';
    if (p === 'contract') return '📜 Contract';
    return '';
}

// ══════════════════════════ CARD COMPONENT ══════════════════════════

function ListingCard({ item, onPress }: { item: LandListing; onPress: () => void }) {
    const lb = landBadge(item.analytics?.prediction_label ?? null);
    const ss = statusStyle(item.status || 'unknown');
    const photos = Array.isArray(item.photos) ? item.photos : [];
    const hasPhotos = photos.length > 0;

    const [idx, setIdx] = useState(0);
    useEffect(() => {
        if (photos.length <= 1) { setIdx(0); return; }
        const t = setInterval(() => setIdx(prev => (prev + 1) % photos.length), 3000);
        return () => clearInterval(t);
    }, [photos.length]);

    const safeIdx = hasPhotos ? idx % photos.length : 0;
    const photoUrl = hasPhotos ? `${API_BASE_URL}${photos[safeIdx].url}` : null;

    return (
        <Pressable
            style={({ pressed }) => [
                s.card,
                { borderColor: lb.color + "44", borderWidth: 2 },
                pressed && { transform: [{ scale: 0.985 }] }
            ]}
            onPress={onPress}
        >
            {/* ── Visual Section ── */}
            <View style={s.visualSection}>
                {photoUrl ? (
                    <Image source={{ uri: photoUrl }} style={s.mainImage} resizeMode="cover" />
                ) : (
                    <View style={[s.imagePlaceholder, { backgroundColor: lb.bg }]}>
                        <Text style={{ fontSize: 44 }}>🏞️</Text>
                        <Text style={[s.placeholderLabel, { color: lb.color }]}>Visualizing Terrain...</Text>
                    </View>
                )}

                <View style={s.imageOverlay} />

                {/* Top Row Badges */}
                <View style={s.badgeRowTop}>
                    <View style={[s.typePill, { backgroundColor: 'rgba(255,255,255,0.92)', borderColor: lb.color }]}>
                        <Text style={[s.typeEmoji]}>{lb.emoji}</Text>
                        <Text style={[s.typeText, { color: '#0f172a' }]}>{lb.text}</Text>
                    </View>
                    <View style={[s.statusPill, { backgroundColor: ss.bg + "F2" }]}>
                        <Text style={[s.statusText, { color: ss.color }]}>{ss.icon} {ss.label}</Text>
                        {item.status === 'verified' && <Text style={{ fontSize: 10, marginLeft: 4 }}>✅</Text>}
                    </View>
                </View>

                {/* Bottom Row Info (Glass Style) */}
                <View style={s.badgeRowBottom}>
                    <View style={s.priceGlassContainer}>
                        <View style={s.priceTag}>
                            <Text style={s.priceCurrency}>EST. VALUE</Text>
                            <Text style={s.priceAmount}>{item.expected_price ? `LKR ${item.expected_price.toLocaleString()}` : 'Negotiable'}</Text>
                        </View>
                    </View>
                    {item.listing_purpose && (
                        <View style={s.purposeGlass}>
                            <Text style={s.purposeText}>{purposeLabel(item.listing_purpose)}</Text>
                        </View>
                    )}
                </View>

                {/* Indicator dots for gallery */}
                {hasPhotos && photos.length > 1 && (
                    <View style={s.galleryDots}>
                        {photos.map((_, i) => (
                            <View key={i} style={[s.gDot, i === safeIdx && s.gDotActive]} />
                        ))}
                    </View>
                )}
            </View>

            {/* ── Data Section (Beautified) ── */}
            <View style={s.dataSection}>
                <View style={s.infoSide}>
                    <Text style={s.listingTitle} numberOfLines={1}>{item.title || 'Property Undisclosed'}</Text>
                    <View style={s.ownerContainer}>
                        <View style={s.ownerAvatarMini}>
                            <Text style={{ fontSize: 10 }}>👤</Text>
                        </View>
                        <Text style={s.ownerNameText}>{item.owner_name || 'Land Owner'}</Text>
                        <View style={s.ownerVerifiedDot} />
                    </View>
                </View>

                <View style={s.metricsRow}>
                    <View style={[s.miniMetric, { backgroundColor: '#eff6ff' }]}>
                        <Text style={s.miniMetricVal}>{typeof item.area_acres === 'number' ? item.area_acres.toFixed(2) : '--'}</Text>
                        <Text style={s.miniMetricUnit}>ACRES</Text>
                    </View>
                    <View style={[s.miniMetric, { backgroundColor: '#f5f3ff' }]}>
                        <Text style={s.miniMetricVal}>{typeof item.area_hectares === 'number' ? item.area_hectares.toFixed(2) : '--'}</Text>
                        <Text style={s.miniMetricUnit}>HECTARES</Text>
                    </View>
                    <View style={s.chevronBox}>
                        <Text style={s.chevronIcon}>→</Text>
                    </View>
                </View>
            </View>
        </Pressable>
    );
}

// ══════════════════════════ MAIN SCREEN ══════════════════════════

export default function MyListingsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { token } = useAuth();

    const [listings, setListings] = useState<LandListing[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!token) return;
        let alive = true;
        (async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/listings/my`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (alive) setListings(data?.listings ?? []);
            } catch (e: any) {
                if (alive) setError(e.message);
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => { alive = false; };
    }, [token]);

    return (
        <View style={s.page}>
            <Stack.Screen options={{ headerShown: false }} />

            {loading ? (
                <View style={[s.center, { paddingTop: insets.top }]}>
                    <ActivityIndicator size="large" color="#3b82f6" />
                    <Text style={s.centerText}>Loading listings...</Text>
                </View>
            ) : error ? (
                <View style={[s.center, { paddingTop: insets.top }]}>
                    <Text style={{ fontSize: 48 }}>😕</Text>
                    <Text style={s.errorText}>⚠️ {error}</Text>
                </View>
            ) : (
                <FlatList
                    data={listings}
                    keyExtractor={(item) => String(item.id)}
                    renderItem={({ item }) => (
                        <ListingCard
                            item={item}
                            onPress={() => router.push({ pathname: '/listings/detail', params: { id: String(item.id) } })}
                        />
                    )}
                    contentContainerStyle={[s.listContent, { paddingTop: insets.top + 24 }]}
                    showsVerticalScrollIndicator={false}
                    ListHeaderComponent={
                        <View style={s.fullscreenHeader}>
                            <Text style={s.headerTitle}>My Portfolio</Text>
                            <Text style={s.headerSub}>{listings.length} ASSETS CURRENTLY LISTED</Text>
                        </View>
                    }
                    ListEmptyComponent={
                        <View style={s.center}>
                            <Text style={{ fontSize: 56 }}>🏜️</Text>
                            <Text style={s.centerText}>No listings found</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

// ══════════════════════════ STYLES ══════════════════════════

const s = StyleSheet.create({
    page: { flex: 1, backgroundColor: '#f8fafc' },

    // ── Fullscreen Header (Minimal) ──
    fullscreenHeader: {
        marginBottom: 20,
        paddingHorizontal: 4,
    },
    headerTitle: { fontSize: 32, fontWeight: "900", color: "#0f172a", letterSpacing: -1 },
    headerSub: { fontSize: 10, fontWeight: "800", color: "#94a3b8", marginTop: 4, letterSpacing: 1.5, textTransform: 'uppercase' },

    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 100 },
    centerText: { fontSize: 16, color: '#64748b', fontWeight: '700' },
    errorText: { fontSize: 16, color: '#ef4444', fontWeight: '800' },

    listContent: { padding: 16, paddingBottom: 60, gap: 24 },

    // ── Premium Card Design ──
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 32,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.12,
        shadowRadius: 24,
        elevation: 8,
    },

    // Visual Section (Image + Overlays)
    visualSection: {
        position: 'relative',
        height: 260,
    },
    mainImage: {
        width: '100%',
        height: '100%',
        backgroundColor: '#f1f5f9',
    },
    imagePlaceholder: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    placeholderLabel: {
        fontSize: 14,
        fontWeight: '800',
        marginTop: 12,
        letterSpacing: 0.5,
    },
    imageOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.05)',
    },

    // Badges Row - Top
    badgeRowTop: {
        position: 'absolute',
        top: 16,
        left: 16,
        right: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    typePill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 14,
        borderWidth: 1.5,
        shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6,
    },
    typeEmoji: { fontSize: 13, marginRight: 6 },
    typeText: { fontSize: 12, fontWeight: '900', letterSpacing: -0.2 },

    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 14,
        shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4,
    },
    statusText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5, textTransform: 'uppercase' },

    // Badges Row - Bottom
    badgeRowBottom: {
        position: 'absolute',
        bottom: 20,
        left: 16,
        right: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    priceGlassContainer: {
        backgroundColor: 'rgba(15, 23, 42, 0.88)',
        borderRadius: 18,
        padding: 12,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    },
    priceTag: { gap: 2 },
    priceCurrency: {
        color: '#94a3b8',
        fontSize: 8,
        fontWeight: '900',
        letterSpacing: 0.8,
    },
    priceAmount: {
        color: '#fbbf24',
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: -0.4,
    },
    purposeGlass: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1, borderColor: '#f1f5f9',
    },
    purposeText: {
        fontSize: 11,
        fontWeight: '900',
        color: '#1e293b',
        textTransform: 'uppercase',
    },

    // Gallery / Indicator
    galleryDots: {
        position: 'absolute',
        bottom: 6,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 5,
    },
    gDot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: 'rgba(255,255,255,0.3)',
    },
    gDotActive: {
        width: 16,
        backgroundColor: '#ffffff',
    },

    // Data Section
    dataSection: {
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    infoSide: { flex: 1, marginRight: 12 },
    listingTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: '#0f172a',
        letterSpacing: -0.4,
        marginBottom: 8,
    },
    ownerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    ownerAvatarMini: {
        width: 20, height: 20, borderRadius: 10,
        backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center',
    },
    ownerNameText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#64748b',
    },
    ownerVerifiedDot: {
        width: 6, height: 6, borderRadius: 3,
        backgroundColor: '#10b981',
    },

    metricsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    miniMetric: {
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 12,
        alignItems: 'center',
        minWidth: 60,
    },
    miniMetricVal: {
        fontSize: 14,
        fontWeight: '900',
        color: '#0f172a',
    },
    miniMetricUnit: {
        fontSize: 8,
        fontWeight: '900',
        color: '#64748b',
        marginTop: 1,
    },
    chevronBox: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: '#f1f5f9',
    },
    chevronIcon: { fontSize: 16, fontWeight: '900', color: '#cbd5e1' }
});
