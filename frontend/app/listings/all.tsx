import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Pressable,
    ActivityIndicator,
    Image,
    Dimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { API_BASE_URL } from '../../src/config';

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

    // ── Slideshow with perfect sync ──
    const [idx, setIdx] = useState(0);
    useEffect(() => {
        if (photos.length <= 1) { setIdx(0); return; }
        const t = setInterval(() => setIdx(prev => (prev + 1) % photos.length), 2000);
        return () => clearInterval(t);
    }, [photos.length]);

    // Clamp idx to valid range
    const safeIdx = hasPhotos ? idx % photos.length : 0;
    const photoUrl = hasPhotos ? `${API_BASE_URL}${photos[safeIdx].url}` : null;

    return (
        <Pressable style={s.card} onPress={onPress}>
            {/* ── Hero Image ── */}
            <View style={s.heroWrap}>
                {photoUrl ? (
                    <Image source={{ uri: photoUrl }} style={s.heroImage} resizeMode="cover" />
                ) : (
                    <View style={[s.heroPlaceholder, { backgroundColor: lb.bg }]}>
                        <Text style={{ fontSize: 56 }}>🏞️</Text>
                        <Text style={[s.placeholderText, { color: lb.color }]}>No photo uploaded</Text>
                    </View>
                )}

                {/* Gradient overlay at bottom */}
                <View style={s.heroGradient} />

                {/* Photo counter — perfectly synced */}
                {hasPhotos && photos.length > 1 && (
                    <View style={s.photoCounter}>
                        <Text style={s.photoCounterText}>📸 {safeIdx + 1}/{photos.length}</Text>
                    </View>
                )}

                {/* Land type badge */}
                <View style={[s.landTypeBadge, { backgroundColor: lb.bg, borderColor: lb.glow }]}>
                    <Text style={[s.landTypeBadgeText, { color: lb.color }]}>{lb.emoji} {lb.text}</Text>
                </View>

                {/* Purpose tag */}
                {item.listing_purpose && (
                    <View style={s.purposeTag}>
                        <Text style={s.purposeTagText}>{purposeLabel(item.listing_purpose)}</Text>
                    </View>
                )}

                {/* Price pill */}
                {typeof item.expected_price === 'number' && (
                    <View style={s.pricePill}>
                        <Text style={s.pricePillText}>LKR {item.expected_price.toLocaleString()}</Text>
                    </View>
                )}

                {/* Slideshow dots */}
                {hasPhotos && photos.length > 1 && (
                    <View style={s.dotRow}>
                        {photos.map((_, i) => (
                            <View key={i} style={[s.dot, i === safeIdx && s.dotActive]} />
                        ))}
                    </View>
                )}
            </View>

            {/* ── Card Body ── */}
            <View style={s.cardBody}>
                <View style={s.titleRow}>
                    <View style={{ flex: 1 }}>
                        <Text style={s.cardTitle} numberOfLines={1}>{item.title || 'Untitled'}</Text>
                        {item.owner_name && (
                            <Text style={s.ownerText} numberOfLines={1}>👤 {item.owner_name}</Text>
                        )}
                    </View>
                    <View style={[s.statusChip, { backgroundColor: ss.bg }]}>
                        <Text style={[s.statusChipText, { color: ss.color }]}>{ss.icon} {ss.label}</Text>
                    </View>
                </View>

                {/* Stats row */}
                <View style={s.statsRow}>
                    <View style={[s.statPill, { borderLeftColor: '#3b82f6' }]}>
                        <Text style={s.statEmoji}>📏</Text>
                        <View>
                            <Text style={[s.statVal, { color: '#3b82f6' }]}>
                                {typeof item.area_acres === 'number' ? `${item.area_acres.toFixed(2)}` : '--'}
                            </Text>
                            <Text style={s.statLbl}>acres</Text>
                        </View>
                    </View>
                    <View style={[s.statPill, { borderLeftColor: '#8b5cf6' }]}>
                        <Text style={s.statEmoji}>📐</Text>
                        <View>
                            <Text style={[s.statVal, { color: '#8b5cf6' }]}>
                                {typeof item.area_hectares === 'number' ? `${item.area_hectares.toFixed(2)}` : '--'}
                            </Text>
                            <Text style={s.statLbl}>hectares</Text>
                        </View>
                    </View>
                </View>
            </View>
        </Pressable>
    );
}

// ══════════════════════════ MAIN SCREEN ══════════════════════════

export default function AllListingsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [listings, setListings] = useState<LandListing[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/listings?limit=50`);
                const data = await res.json();
                if (alive) setListings(data?.listings ?? []);
            } catch (e: any) {
                if (alive) setError(e.message);
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => { alive = false; };
    }, []);

    return (
        <SafeAreaView style={s.page}>
            {/* Header */}
            <View style={[s.header, { paddingTop: insets.top + 8 }]}>
                <Pressable onPress={() => router.back()} style={s.backBtn}>
                    <Text style={s.backBtnArrow}>←</Text>
                </Pressable>
                <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={s.headerTitle}>🏘️ All Listings</Text>
                    {!loading && <Text style={s.headerSub}>{listings.length} properties available</Text>}
                </View>
                <View style={{ width: 44 }} />
            </View>

            {loading ? (
                <View style={s.center}>
                    <ActivityIndicator size="large" color="#3b82f6" />
                    <Text style={s.centerText}>Loading listings...</Text>
                </View>
            ) : error ? (
                <View style={s.center}>
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
                    contentContainerStyle={s.listContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={s.center}>
                            <Text style={{ fontSize: 56 }}>🏜️</Text>
                            <Text style={s.centerText}>No listings found</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

// ══════════════════════════ STYLES ══════════════════════════

const s = StyleSheet.create({
    page: { flex: 1, backgroundColor: '#f0f4f8' },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 14,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderColor: '#e2e8f0',
        shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10,
        shadowOffset: { width: 0, height: 3 }, elevation: 4,
    },
    backBtn: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center',
    },
    backBtnArrow: { fontSize: 24, fontWeight: '700', color: '#1e293b', marginTop: -2 },
    headerTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
    headerSub: { fontSize: 12, fontWeight: '600', color: '#94a3b8', marginTop: 2 },

    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 60 },
    centerText: { fontSize: 15, color: '#64748b', fontWeight: '600' },
    errorText: { fontSize: 15, color: '#ef4444', fontWeight: '700' },

    listContent: { padding: CARD_PAD, paddingBottom: 50, gap: 20 },

    // ── Card ──
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 24,
        overflow: 'hidden',
        shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1, shadowRadius: 18, elevation: 6,
    },

    // Hero image area
    heroWrap: { position: 'relative' },
    heroImage: { width: '100%', height: 220, backgroundColor: '#e2e8f0' },
    heroPlaceholder: {
        width: '100%', height: 220,
        alignItems: 'center', justifyContent: 'center',
    },
    placeholderText: { fontSize: 13, fontWeight: '700', marginTop: 8 },

    heroGradient: {
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 70,
        backgroundColor: 'rgba(0,0,0,0.15)',
    },

    // Photo counter — top-left
    photoCounter: {
        position: 'absolute', top: 14, left: 14,
        backgroundColor: 'rgba(15,23,42,0.8)',
        paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10,
        flexDirection: 'row', alignItems: 'center',
    },
    photoCounterText: { color: '#f8fafc', fontSize: 12, fontWeight: '800' },

    // Land type badge — top-right
    landTypeBadge: {
        position: 'absolute', top: 14, right: 14,
        paddingHorizontal: 12, paddingVertical: 6,
        borderRadius: 14, borderWidth: 1.5,
    },
    landTypeBadgeText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.3 },

    // Purpose tag — bottom-right
    purposeTag: {
        position: 'absolute', bottom: 14, right: 14,
        backgroundColor: 'rgba(255,255,255,0.9)',
        paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10,
    },
    purposeTagText: { fontSize: 11, fontWeight: '700', color: '#334155' },

    // Price pill — bottom-left above dots
    pricePill: {
        position: 'absolute', bottom: 42, left: 14,
        backgroundColor: 'rgba(15,23,42,0.88)',
        paddingHorizontal: 14, paddingVertical: 7, borderRadius: 14,
    },
    pricePillText: { color: '#fbbf24', fontSize: 15, fontWeight: '900' },

    // Dots
    dotRow: {
        position: 'absolute', bottom: 14, left: 0, right: 0,
        flexDirection: 'row', justifyContent: 'center', gap: 5,
    },
    dot: {
        width: 8, height: 8, borderRadius: 4,
        backgroundColor: 'rgba(255,255,255,0.4)',
    },
    dotActive: { width: 22, backgroundColor: '#3b82f6' },

    // Card body
    cardBody: { padding: 18, paddingTop: 14 },
    titleRow: {
        flexDirection: 'row', alignItems: 'flex-start',
        justifyContent: 'space-between', marginBottom: 14, gap: 10,
    },
    cardTitle: { fontSize: 19, fontWeight: '900', color: '#0f172a' },
    ownerText: { fontSize: 13, color: '#64748b', fontWeight: '500', marginTop: 3 },

    statusChip: {
        paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10,
    },
    statusChipText: { fontSize: 11, fontWeight: '800' },

    // Stats
    statsRow: { flexDirection: 'row', gap: 10 },
    statPill: {
        flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#f8fafc', borderRadius: 14,
        paddingVertical: 10, paddingHorizontal: 12,
        borderLeftWidth: 4,
    },
    statEmoji: { fontSize: 20 },
    statVal: { fontSize: 16, fontWeight: '900' },
    statLbl: { fontSize: 10, color: '#94a3b8', fontWeight: '600', marginTop: 1 },
});
