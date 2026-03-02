import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    View,
    Text,
    TextInput,
    Pressable,
    ScrollView,
    FlatList,
    ActivityIndicator,
    Alert,
    Animated,
    RefreshControl,
    StyleSheet,
    Platform} from "react-native";
import { useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets , SafeAreaView} from "react-native-safe-area-context";
import { API_BASE_URL } from "../../src/config";

// ════════════════════════════════════════════════════════════
//  TYPES
// ════════════════════════════════════════════════════════════

interface AdminStats {
    total_listings: number;
    pending_count: number;
    verified_count: number;
    rejected_count: number;
    sold_count: number;
    total_area_acres: number;
    listings_this_week: number;
    restricted_zones_count: number;
}

interface AdminListing {
    id: number;
    title: string;
    verification_code: string;
    area_acres: number | null;
    area_hectares: number | null;
    listing_purpose: string | null;
    status: string | null;
    expected_price: number | null;
    submitted_at: string | null;
    analytics?: { prediction_label: string | null } | null;
    // Detailed fields (from detail endpoint)
    owner_name?: string;
    owner_phone?: string;
}

interface AdminZone {
    id: number;
    zone_name: string;
    restriction_type: string | null;
    reason: string | null;
    created_at: string | null;
    polygon_coordinates: number[][][] | null;
}

// ════════════════════════════════════════════════════════════
//  HELPERS
// ════════════════════════════════════════════════════════════

const ADMIN_PASSWORD = "admin123";

type StatusTab = "all" | "pending" | "verified" | "rejected" | "sold";

function landTypeBadge(label: string | null | undefined) {
    if (label === "VEGETATION_LAND")
        return { emoji: "🌿", text: "VEGETATION", bg: "#d1fae5", color: "#059669" };
    if (label === "IDLE_LAND")
        return { emoji: "🟤", text: "IDLE", bg: "#fef3c7", color: "#d97706" };
    if (label === "BUILT_LAND")
        return { emoji: "🏠", text: "BUILT", bg: "#f1f5f9", color: "#64748b" };
    return { emoji: "❔", text: "UNKNOWN", bg: "#f1f5f9", color: "#94a3b8" };
}

function statusBadge(status: string | null) {
    if (status === "pending")
        return { emoji: "⏳", text: "Pending", bg: "#fef3c7", color: "#d97706" };
    if (status === "verified")
        return { emoji: "✅", text: "Verified", bg: "#d1fae5", color: "#059669" };
    if (status === "rejected")
        return { emoji: "❌", text: "Rejected", bg: "#fee2e2", color: "#dc2626" };
    if (status === "sold")
        return { emoji: "💰", text: "Sold", bg: "#dbeafe", color: "#2563eb" };
    return { emoji: "❔", text: "Unknown", bg: "#f1f5f9", color: "#94a3b8" };
}

// ════════════════════════════════════════════════════════════
//  MAIN EXPORT
// ════════════════════════════════════════════════════════════

export default function AdminDashboardScreen() {
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [password, setPassword] = useState("");

    const handleUnlock = () => {
        if (password === ADMIN_PASSWORD) {
            setIsUnlocked(true);
        } else {
            Alert.alert("Access Denied", "Incorrect password. Try again.");
        }
    };

    if (!isUnlocked) {
        return (
            <AdminPasswordGate
                password={password}
                setPassword={setPassword}
                onSubmit={handleUnlock}
            />
        );
    }

    return <AdminDashboardContent onLock={() => setIsUnlocked(false)} />;
}

// ════════════════════════════════════════════════════════════
//  PASSWORD GATE
// ════════════════════════════════════════════════════════════

function AdminPasswordGate({
    password,
    setPassword,
    onSubmit}: {
    password: string;
    setPassword: (v: string) => void;
    onSubmit: () => void;
}) {
    const insets = useSafeAreaInsets();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true}),
            Animated.spring(slideAnim, {
                toValue: 0,
                tension: 80,
                friction: 12,
                useNativeDriver: true}),
        ]).start();
    }, []);

    return (
        <SafeAreaView style={[ds.lockContainer, { paddingTop: insets.top }]}>
            <Animated.View
                style={[
                    ds.lockCard,
                    { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
                ]}
            >
                <View style={ds.lockIconCircle}>
                    <Text style={ds.lockIcon}>🔐</Text>
                </View>
                <Text style={ds.lockTitle}>Admin Access</Text>
                <Text style={ds.lockSubtitle}>
                    Enter admin password to continue
                </Text>

                <TextInput
                    style={ds.lockInput}
                    placeholder="Enter password"
                    placeholderTextColor="#94a3b8"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                    onSubmitEditing={onSubmit}
                    returnKeyType="done"
                />

                <Pressable
                    style={({ pressed }) => [
                        ds.lockButton,
                        pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                    ]}
                    onPress={onSubmit}
                >
                    <Text style={ds.lockButtonText}>Unlock Dashboard</Text>
                </Pressable>
            </Animated.View>
        </SafeAreaView>
    );
}

// ════════════════════════════════════════════════════════════
//  DASHBOARD CONTENT (Unlocked)
// ════════════════════════════════════════════════════════════

function AdminDashboardContent({ onLock }: { onLock: () => void }) {
    const insets = useSafeAreaInsets();
    const router = useRouter();

    // State
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [listings, setListings] = useState<AdminListing[]>([]);
    const [zones, setZones] = useState<AdminZone[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<StatusTab>("all");
    const [actionLoading, setActionLoading] = useState<number | null>(null);

    // Animations
    const headerAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(headerAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true}).start();
    }, []);

    // ── Fetch ────────────────────────────────────────────
    const fetchAll = useCallback(async () => {
        try {
            const [statsRes, listRes, zonesRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/admin/stats`),
                fetch(`${API_BASE_URL}/api/listings?limit=50`),
                fetch(`${API_BASE_URL}/api/restricted-zones`),
            ]);
            const [statsData, listData, zonesData] = await Promise.all([
                statsRes.json(),
                listRes.json(),
                zonesRes.json(),
            ]);
            setStats(statsData);
            setListings(listData.listings ?? []);
            setZones(zonesData.zones ?? []);
        } catch (e) {
            console.error("Dashboard fetch error:", e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    // Auto-refresh on mount + every 30 seconds
    useEffect(() => {
        fetchAll();
        const interval = setInterval(fetchAll, 30000);
        return () => clearInterval(interval);
    }, [fetchAll]);

    // Re-fetch when the tab gains focus (e.g. after approving a listing)
    const navigation = useNavigation();
    useEffect(() => {
        const unsubscribe = navigation.addListener("focus", () => {
            fetchAll();
        });
        return unsubscribe;
    }, [navigation, fetchAll]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchAll();
    };

    // ── Admin Actions ────────────────────────────────────
    const updateListingStatus = async (id: number, newStatus: string) => {
        setActionLoading(id);
        try {
            await fetch(`${API_BASE_URL}/api/listings/${id}/status`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus })});
            fetchAll();
        } catch (e) {
            Alert.alert("Error", "Failed to update status.");
        } finally {
            setActionLoading(null);
        }
    };

    const deleteListing = (id: number) => {
        Alert.alert("Delete Listing", `Are you sure you want to delete listing #${id}?`, [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                    setActionLoading(id);
                    try {
                        await fetch(`${API_BASE_URL}/api/listings/${id}`, { method: "DELETE" });
                        fetchAll();
                    } catch {
                        Alert.alert("Error", "Delete failed.");
                    } finally {
                        setActionLoading(null);
                    }
                }},
        ]);
    };

    const deleteZone = (id: number, name: string) => {
        Alert.alert("Delete Zone", `Delete "${name}"?`, [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                    try {
                        await fetch(`${API_BASE_URL}/api/restricted-zones/${id}`, { method: "DELETE" });
                        fetchAll();
                    } catch {
                        Alert.alert("Error", "Delete failed.");
                    }
                }},
        ]);
    };

    // Filtered listings by tab
    const filteredListings =
        activeTab === "all"
            ? listings
            : listings.filter((l) => l.status === activeTab);

    const pendingListings = listings.filter((l) => l.status === "pending");

    // ── Loading ──────────────────────────────────────────
    if (loading) {
        return (
            <SafeAreaView style={ds.pageContainer}>
                <View style={ds.centered}>
                    <ActivityIndicator size="large" color="#3b82f6" />
                    <Text style={ds.loadingText}>Loading dashboard...</Text>
                </View>
            </SafeAreaView>
        );
    }

    // ════════════════════════════════════════════════════════
    //  RENDER
    // ════════════════════════════════════════════════════════

    return (
        <SafeAreaView style={[ds.pageContainer, { paddingTop: insets.top }]}>
            <ScrollView
                contentContainerStyle={ds.scroll}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />
                }
                showsVerticalScrollIndicator={false}
            >
                {/* ── Header ────────────────────────────────── */}
                <Animated.View style={[ds.header, { opacity: headerAnim }]}>
                    <View>
                        <Text style={ds.headerTitle}>📊 Admin Dashboard</Text>
                        <Text style={ds.headerSubtitle}>Manage listings and zones</Text>
                    </View>
                    <Pressable style={ds.lockBtn} onPress={onLock}>
                        <Text style={ds.lockBtnText}>🔒</Text>
                    </Pressable>
                </Animated.View>

                {/* ── Section A: Stats Cards ────────────────── */}
                <Text style={ds.sectionTitle}>📈 Overview</Text>
                <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={[
                        {
                            key: "total",
                            emoji: "📊",
                            bg: "#dbeafe",
                            value: stats?.total_listings ?? 0,
                            label: "Total Listings",
                            trend: stats?.listings_this_week
                                ? `+${stats.listings_this_week} this week`
                                : null,
                            trendColor: "#22c55e",
                            valueColor: "#1e293b"},
                        {
                            key: "pending",
                            emoji: "⏳",
                            bg: "#fef3c7",
                            value: stats?.pending_count ?? 0,
                            label: "Pending",
                            trend: null,
                            trendColor: null,
                            valueColor: (stats?.pending_count ?? 0) > 0 ? "#eab308" : "#1e293b"},
                        {
                            key: "verified",
                            emoji: "✅",
                            bg: "#d1fae5",
                            value: stats?.verified_count ?? 0,
                            label: "Verified",
                            trend: null,
                            trendColor: null,
                            valueColor: "#22c55e"},
                        {
                            key: "zones",
                            emoji: "🚫",
                            bg: "#fee2e2",
                            value: stats?.restricted_zones_count ?? 0,
                            label: "Restricted Zones",
                            trend: null,
                            trendColor: null,
                            valueColor: "#ef4444"},
                    ]}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}
                    renderItem={({ item }) => (
                        <DashboardStatCard
                            emoji={item.emoji}
                            bgColor={item.bg}
                            value={item.value}
                            label={item.label}
                            trend={item.trend}
                            trendColor={item.trendColor}
                            valueColor={item.valueColor}
                        />
                    )}
                />

                {/* ── Section B: Pending Listings ───────────── */}
                {pendingListings.length > 0 && (
                    <>
                        <Text style={ds.sectionTitle}>
                            ⏳ Pending Verifications ({pendingListings.length})
                        </Text>
                        {pendingListings.map((listing) => (
                            <AdminListingCard
                                key={listing.id}
                                listing={listing}
                                borderColor="#eab308"
                                actionLoading={actionLoading === listing.id}
                                onVerify={() => updateListingStatus(listing.id, "verified")}
                                onReject={() => updateListingStatus(listing.id, "rejected")}
                                onView={() =>
                                    router.push({
                                        pathname: "/admin/listing-detail",
                                        params: { id: String(listing.id) }} as any)
                                }
                                onDelete={() => deleteListing(listing.id)}
                            />
                        ))}
                    </>
                )}

                {/* ── Section C: All Listings ───────────────── */}
                <Text style={ds.sectionTitle}>📋 All Listings Management</Text>

                {/* Tab bar */}
                <View style={ds.tabBar}>
                    {(["all", "pending", "verified", "rejected", "sold"] as StatusTab[]).map(
                        (tab) => {
                            const count =
                                tab === "all"
                                    ? listings.length
                                    : listings.filter((l) => l.status === tab).length;
                            const isActive = activeTab === tab;
                            return (
                                <Pressable
                                    key={tab}
                                    style={[ds.tabItem, isActive && ds.tabItemActive]}
                                    onPress={() => setActiveTab(tab)}
                                >
                                    <Text style={[ds.tabText, isActive && ds.tabTextActive]}>
                                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                    </Text>
                                    <View style={[ds.tabBadge, isActive && ds.tabBadgeActive]}>
                                        <Text
                                            style={[
                                                ds.tabBadgeText,
                                                isActive && ds.tabBadgeTextActive,
                                            ]}
                                        >
                                            {count}
                                        </Text>
                                    </View>
                                </Pressable>
                            );
                        }
                    )}
                </View>

                {filteredListings.length === 0 ? (
                    <View style={ds.emptyCard}>
                        <Text style={ds.emptyEmoji}>📭</Text>
                        <Text style={ds.emptyText}>
                            No {activeTab === "all" ? "" : activeTab + " "}listings found.
                        </Text>
                    </View>
                ) : (
                    filteredListings.slice(0, 10).map((listing) => {
                        const sb = statusBadge(listing.status);
                        return (
                            <AdminListingCard
                                key={listing.id}
                                listing={listing}
                                borderColor={sb.color}
                                actionLoading={actionLoading === listing.id}
                                onVerify={
                                    listing.status === "pending"
                                        ? () => updateListingStatus(listing.id, "verified")
                                        : undefined
                                }
                                onReject={
                                    listing.status === "pending"
                                        ? () => updateListingStatus(listing.id, "rejected")
                                        : undefined
                                }
                                onView={() =>
                                    router.push({
                                        pathname: "/admin/listing-detail",
                                        params: { id: String(listing.id) }} as any)
                                }
                                onDelete={() => deleteListing(listing.id)}
                            />
                        );
                    })
                )}

                {filteredListings.length > 10 && (
                    <Pressable style={ds.viewAllBtn}>
                        <Text style={ds.viewAllText}>View All ({filteredListings.length}) →</Text>
                    </Pressable>
                )}

                {/* ── Section D: Restricted Zones ───────────── */}
                <Text style={ds.sectionTitle}>
                    🚫 Restricted Zones ({zones.length})
                </Text>
                {zones.length === 0 ? (
                    <View style={ds.emptyCard}>
                        <Text style={ds.emptyEmoji}>🗺️</Text>
                        <Text style={ds.emptyText}>No restricted zones defined yet.</Text>
                    </View>
                ) : (
                    zones.map((zone) => (
                        <AdminZoneCard
                            key={zone.id}
                            zone={zone}
                            onDelete={() => deleteZone(zone.id, zone.zone_name)}
                        />
                    ))
                )}

                <Pressable
                    style={({ pressed }) => [
                        ds.addZoneBtn,
                        pressed && { opacity: 0.85 },
                    ]}
                    onPress={() => router.push("/admin/add-zone" as any)}
                >
                    <Text style={ds.addZoneBtnText}>➕ Add New Restricted Zone</Text>
                </Pressable>

                {/* ── Section E: Recent Activity ────────────── */}
                <Text style={ds.sectionTitle}>🕒 Recent Activity</Text>
                <AdminActivityTimeline listings={listings} />

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

// ════════════════════════════════════════════════════════════
//  SUB-COMPONENTS (uniquely named)
// ════════════════════════════════════════════════════════════

/** DashboardStatCard — horizontal stat card */
function DashboardStatCard({
    emoji,
    bgColor,
    value,
    label,
    trend,
    trendColor,
    valueColor}: {
    emoji: string;
    bgColor: string;
    value: number;
    label: string;
    trend: string | null;
    trendColor: string | null;
    valueColor: string;
}) {
    return (
        <View style={ds.statCard}>
            <View style={[ds.statIconCircle, { backgroundColor: bgColor }]}>
                <Text style={ds.statIconEmoji}>{emoji}</Text>
            </View>
            <Text style={[ds.statValue, { color: valueColor }]}>{value}</Text>
            <Text style={ds.statLabel}>{label}</Text>
            {trend && (
                <Text style={[ds.statTrend, { color: trendColor ?? "#22c55e" }]}>
                    ↗ {trend}
                </Text>
            )}
        </View>
    );
}

/** AdminListingCard — listing card with actions */
function AdminListingCard({
    listing,
    borderColor,
    actionLoading,
    onVerify,
    onReject,
    onView,
    onDelete}: {
    listing: AdminListing;
    borderColor: string;
    actionLoading: boolean;
    onVerify?: () => void;
    onReject?: () => void;
    onView: () => void;
    onDelete: () => void;
}) {
    const sb = statusBadge(listing.status);
    const lt = landTypeBadge(listing.analytics?.prediction_label);

    return (
        <View style={[ds.listingCard, { borderLeftColor: borderColor }]}>
            {/* Row 1: status + code */}
            <View style={ds.listingRow}>
                <View style={[ds.badge, { backgroundColor: sb.bg }]}>
                    <Text style={[ds.badgeText, { color: sb.color }]}>
                        {sb.emoji} {sb.text}
                    </Text>
                </View>
                <Text style={ds.listingCode}>{listing.verification_code}</Text>
            </View>

            {/* Row 2: title */}
            <Text style={ds.listingTitle}>{listing.title}</Text>

            {/* Row 3: area */}
            <View style={ds.listingMetaRow}>
                {listing.area_acres != null && (
                    <Text style={ds.listingMeta}>
                        📐 {listing.area_acres.toFixed(2)} acres
                    </Text>
                )}
                {listing.expected_price != null && (
                    <Text style={ds.listingMeta}>
                        💰 LKR {listing.expected_price.toLocaleString()}
                    </Text>
                )}
            </View>

            {/* Row 4: land type */}
            <View style={[ds.badge, { backgroundColor: lt.bg, alignSelf: "flex-start", marginTop: 6 }]}>
                <Text style={[ds.badgeText, { color: lt.color }]}>
                    {lt.emoji} {lt.text}
                </Text>
            </View>

            {/* Row 5: Actions */}
            <View style={ds.actionRow}>
                {actionLoading ? (
                    <ActivityIndicator size="small" color="#3b82f6" />
                ) : (
                    <>
                        {onVerify && (
                            <Pressable
                                style={[ds.actionBtn, ds.actionBtnGreen]}
                                onPress={onVerify}
                            >
                                <Text style={ds.actionBtnText}>✅ Verify</Text>
                            </Pressable>
                        )}
                        <Pressable
                            style={[ds.actionBtn, ds.actionBtnBlueOutline]}
                            onPress={onView}
                        >
                            <Text style={ds.actionBtnTextOutline}>👁️ View</Text>
                        </Pressable>
                        {onReject && (
                            <Pressable
                                style={[ds.actionBtn, ds.actionBtnRed]}
                                onPress={onReject}
                            >
                                <Text style={ds.actionBtnText}>❌ Reject</Text>
                            </Pressable>
                        )}
                        <Pressable
                            style={[ds.actionBtn, ds.actionBtnGrayOutline]}
                            onPress={onDelete}
                        >
                            <Text style={[ds.actionBtnTextOutline, { color: "#ef4444" }]}>
                                🗑️
                            </Text>
                        </Pressable>
                    </>
                )}
            </View>
        </View>
    );
}

/** AdminZoneCard — restricted zone row */
function AdminZoneCard({
    zone,
    onDelete}: {
    zone: AdminZone;
    onDelete: () => void;
}) {
    return (
        <View style={[ds.listingCard, { borderLeftColor: "#ef4444" }]}>
            <View style={ds.listingRow}>
                <View style={[ds.statIconCircle, { width: 40, height: 40, backgroundColor: "#fee2e2" }]}>
                    <Text style={{ fontSize: 18 }}>🚫</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={ds.listingTitle}>{zone.zone_name}</Text>
                    {zone.restriction_type && (
                        <View
                            style={[
                                ds.badge,
                                { backgroundColor: "#fee2e2", alignSelf: "flex-start", marginTop: 4 },
                            ]}
                        >
                            <Text style={[ds.badgeText, { color: "#dc2626" }]}>
                                {zone.restriction_type}
                            </Text>
                        </View>
                    )}
                    {zone.reason && (
                        <Text style={ds.listingMeta} numberOfLines={2}>
                            {zone.reason}
                        </Text>
                    )}
                </View>
                <Pressable
                    style={[ds.actionBtn, ds.actionBtnGrayOutline, { marginTop: 0 }]}
                    onPress={onDelete}
                >
                    <Text style={[ds.actionBtnTextOutline, { color: "#ef4444" }]}>
                        🗑️
                    </Text>
                </Pressable>
            </View>
        </View>
    );
}

/** AdminActivityTimeline — recent activity */
function AdminActivityTimeline({ listings }: { listings: AdminListing[] }) {
    // Build timeline from listing submitted_at
    const recent = [...listings]
        .filter((l) => l.submitted_at)
        .sort(
            (a, b) =>
                new Date(b.submitted_at!).getTime() -
                new Date(a.submitted_at!).getTime()
        )
        .slice(0, 5);

    if (recent.length === 0) {
        return (
            <View style={ds.emptyCard}>
                <Text style={ds.emptyEmoji}>🕐</Text>
                <Text style={ds.emptyText}>No recent activity yet.</Text>
            </View>
        );
    }

    return (
        <View style={ds.timelineCard}>
            {recent.map((l, i) => {
                const sb = statusBadge(l.status);
                const date = new Date(l.submitted_at!);
                const timeAgo = formatTimeAgo(date);
                return (
                    <View key={l.id} style={ds.timelineRow}>
                        {/* Vertical line */}
                        <View style={ds.timelineLineContainer}>
                            <View
                                style={[ds.timelineDot, { backgroundColor: sb.color }]}
                            />
                            {i < recent.length - 1 && <View style={ds.timelineLine} />}
                        </View>
                        {/* Content */}
                        <View style={ds.timelineContent}>
                            <Text style={ds.timelineText}>
                                {sb.emoji}{" "}
                                <Text style={{ fontWeight: "700" }}>{l.title}</Text> —{" "}
                                {sb.text}
                            </Text>
                            <Text style={ds.timelineTime}>{timeAgo}</Text>
                        </View>
                    </View>
                );
            })}
        </View>
    );
}

function formatTimeAgo(date: Date): string {
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

// ════════════════════════════════════════════════════════════
//  STYLES
// ════════════════════════════════════════════════════════════

const ds = StyleSheet.create({
    // -- Page --
    pageContainer: { flex: 1, backgroundColor: "#f8fafc" },
    centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
    loadingText: { color: "#64748b", fontSize: 14 },
    scroll: { paddingBottom: 40 },

    // -- Lock screen --
    lockContainer: {
        flex: 1,
        backgroundColor: "#f8fafc",
        alignItems: "center",
        justifyContent: "center"},
    lockCard: {
        width: 300,
        backgroundColor: "#fff",
        borderRadius: 20,
        padding: 32,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
        elevation: 6},
    lockIconCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: "#dbeafe",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 20},
    lockIcon: { fontSize: 32 },
    lockTitle: { fontSize: 22, fontWeight: "700", color: "#1e293b", marginBottom: 6 },
    lockSubtitle: { fontSize: 14, color: "#64748b", marginBottom: 24, textAlign: "center" },
    lockInput: {
        width: "100%",
        backgroundColor: "#f8fafc",
        borderWidth: 1,
        borderColor: "#e2e8f0",
        borderRadius: 12,
        padding: 14,
        fontSize: 15,
        color: "#1e293b",
        marginBottom: 16},
    lockButton: {
        width: "100%",
        backgroundColor: "#3b82f6",
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: "center"},
    lockButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },

    // -- Header --
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 8},
    headerTitle: { fontSize: 28, fontWeight: "700", color: "#1e293b" },
    headerSubtitle: { fontSize: 14, color: "#64748b", marginTop: 2 },
    lockBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "#fff",
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2},
    lockBtnText: { fontSize: 20 },

    // -- Section title --
    sectionTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#1e293b",
        paddingHorizontal: 20,
        marginTop: 24,
        marginBottom: 14},

    // -- Stat Cards --
    statCard: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 20,
        minWidth: 160,
        marginRight: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3},
    statIconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 14},
    statIconEmoji: { fontSize: 26 },
    statValue: { fontSize: 36, fontWeight: "700", color: "#1e293b" },
    statLabel: { fontSize: 14, color: "#64748b", marginTop: 2 },
    statTrend: { fontSize: 12, marginTop: 6, fontWeight: "600" },

    // -- Listing Card --
    listingCard: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 20,
        marginHorizontal: 16,
        marginBottom: 14,
        borderLeftWidth: 4,
        borderLeftColor: "#22c55e",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3},
    listingRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8},
    listingTitle: { fontSize: 18, fontWeight: "600", color: "#1e293b" },
    listingCode: { fontSize: 12, color: "#64748b", fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }) },
    listingMetaRow: { flexDirection: "row", gap: 16, marginTop: 4 },
    listingMeta: { fontSize: 14, color: "#64748b" },

    // -- Badges --
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20},
    badgeText: { fontSize: 12, fontWeight: "700" },

    // -- Action buttons --
    actionRow: {
        flexDirection: "row",
        gap: 8,
        marginTop: 14,
        flexWrap: "wrap",
        alignItems: "center"},
    actionBtn: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center"},
    actionBtnGreen: { backgroundColor: "#22c55e" },
    actionBtnRed: { backgroundColor: "#ef4444" },
    actionBtnBlueOutline: {
        backgroundColor: "transparent",
        borderWidth: 1.5,
        borderColor: "#3b82f6"},
    actionBtnGrayOutline: {
        backgroundColor: "transparent",
        borderWidth: 1.5,
        borderColor: "#e2e8f0"},
    actionBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
    actionBtnTextOutline: { color: "#3b82f6", fontWeight: "700", fontSize: 13 },

    // -- Tab bar --
    tabBar: {
        flexDirection: "row",
        paddingHorizontal: 16,
        marginBottom: 14,
        gap: 4,
        flexWrap: "wrap"},
    tabItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: "#f1f5f9",
        gap: 6},
    tabItemActive: {
        backgroundColor: "#dbeafe"},
    tabText: { fontSize: 13, color: "#64748b", fontWeight: "500" },
    tabTextActive: { color: "#2563eb", fontWeight: "700" },
    tabBadge: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: "#e2e8f0",
        alignItems: "center",
        justifyContent: "center"},
    tabBadgeActive: { backgroundColor: "#3b82f6" },
    tabBadgeText: { fontSize: 10, color: "#64748b", fontWeight: "700" },
    tabBadgeTextActive: { color: "#fff" },

    // -- Empty --
    emptyCard: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 32,
        marginHorizontal: 16,
        marginBottom: 14,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 1},
    emptyEmoji: { fontSize: 36, marginBottom: 8 },
    emptyText: { fontSize: 14, color: "#94a3b8" },

    // -- View All --
    viewAllBtn: {
        marginHorizontal: 16,
        paddingVertical: 12,
        alignItems: "center"},
    viewAllText: { color: "#3b82f6", fontWeight: "700", fontSize: 14 },

    // -- Add Zone --
    addZoneBtn: {
        marginHorizontal: 16,
        paddingVertical: 16,
        borderRadius: 14,
        backgroundColor: "#ef4444",
        alignItems: "center",
        marginTop: 8,
        shadowColor: "#ef4444",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 4},
    addZoneBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },

    // -- Timeline --
    timelineCard: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 20,
        marginHorizontal: 16,
        marginBottom: 14,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3},
    timelineRow: {
        flexDirection: "row",
        minHeight: 48},
    timelineLineContainer: {
        width: 24,
        alignItems: "center"},
    timelineDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginTop: 4},
    timelineLine: {
        width: 2,
        flex: 1,
        backgroundColor: "#e2e8f0",
        marginTop: 4},
    timelineContent: {
        flex: 1,
        paddingLeft: 10,
        paddingBottom: 16},
    timelineText: { fontSize: 14, color: "#334155", lineHeight: 20 },
    timelineTime: { fontSize: 12, color: "#94a3b8", marginTop: 2 }});
