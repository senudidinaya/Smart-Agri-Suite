import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    View,
    Text,
    Pressable,
    ActivityIndicator,
    StyleSheet
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets, SafeAreaView } from "react-native-safe-area-context";
import MapView, {
    PROVIDER_GOOGLE,
    Polygon,
    Marker,
    Region
} from "react-native-maps";
import { API_BASE_URL } from "../../src/config";
import MarketplaceFilter, {
    LandTypeFilter
} from "../../components/marketplace-filter";

// ======================== TYPES ========================

interface ListingSummary {
    id: number;
    title: string;
    listing_purpose: string;
    status: string;
    area_hectares: number | null;
    analytics?: {
        prediction_label: string | null;
    } | null;
}

interface ListingWithPolygon extends ListingSummary {
    polygon_coordinates: number[][] | null;
}

interface RestrictedZone {
    id: number;
    zone_name: string;
    restriction_type: string | null;
    polygon_coordinates: number[][][] | null;
}

// ======================== HELPERS ========================

const INITIAL_REGION: Region = {
    latitude: 6.904,
    longitude: 79.969,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08
};

const ALL_FILTERS: LandTypeFilter[] = [
    "VEGETATION_LAND",
    "IDLE_LAND",
    "BUILT_LAND",
];

function polygonStyle(label: string | null | undefined) {
    if (label === "VEGETATION_LAND")
        return { stroke: "#22c55e", fill: "rgba(34,197,94,0.25)" };
    if (label === "IDLE_LAND")
        return { stroke: "#a16207", fill: "rgba(161,98,7,0.25)" };
    if (label === "BUILT_LAND")
        return { stroke: "#6b7280", fill: "rgba(107,114,128,0.25)" };
    return { stroke: "#3b82f6", fill: "rgba(59,130,246,0.2)" };
}

/** Return marker pin color based on listing status */
function statusPinColor(status: string | null): string {
    if (status === "verified") return "green";
    if (status === "pending") return "yellow";
    if (status === "rejected") return "red";
    if (status === "sold") return "blue";
    return "indigo";
}

/** Compute centroid of a polygon for marker placement */
function polygonCentroid(coords: { latitude: number; longitude: number }[]) {
    let lat = 0, lng = 0;
    for (const c of coords) {
        lat += c.latitude;
        lng += c.longitude;
    }
    return { latitude: lat / coords.length, longitude: lng / coords.length };
}

// ======================== COMPONENT ========================

export default function MarketplaceScreen() {
    const router = useRouter();
    const { focusId } = useLocalSearchParams();
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const mapRef = useRef<MapView>(null);

    const [listings, setListings] = useState<ListingWithPolygon[]>([]);
    const [zones, setZones] = useState<RestrictedZone[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [filterVisible, setFilterVisible] = useState(false);
    const [activeFilters, setActiveFilters] =
        useState<LandTypeFilter[]>(ALL_FILTERS);

    const [AOI_COORDS, setAOI_COORDS] = useState<{ latitude: number; longitude: number }[]>([]);

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/aoi`);
                const json = await res.json();
                if (!alive) return;
                const ring = json?.aoi?.coordinates?.[0] ?? [];
                const coords = ring.map((p: number[]) => ({
                    longitude: p[0],
                    latitude: p[1]
                }));
                setAOI_COORDS(coords);
            } catch (e) {
                console.error("Failed to load AOI:", e);
            }
        })();
        return () => { alive = false; };
    }, []);

    useEffect(() => {
        if (!mapRef.current) return;
        if (!focusId) return;

        const listing = listings.find(l => String(l.id) === String(focusId));
        if (!listing || !listing.polygon_coordinates) return;

        const coords = listing.polygon_coordinates.map(([lng, lat]) => ({
            latitude: lat,
            longitude: lng
        }));

        setTimeout(() => {
            mapRef.current?.fitToCoordinates(coords, {
                edgePadding: { top: 100, right: 100, bottom: 100, left: 100 },
                animated: true
            });
        }, 500);

    }, [focusId, listings]);

    // ---- Fetch all listings + restricted zones ----
    const fetchAll = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [listRes, zonesRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/listings?limit=50`),
                fetch(`${API_BASE_URL}/api/restricted-zones`),
            ]);
            const [listData, zonesData] = await Promise.all([
                listRes.json(),
                zonesRes.json(),
            ]);

            const summaries: ListingSummary[] = listData.listings ?? [];
            setZones(zonesData.zones ?? []);

            if (summaries.length === 0) {
                setListings([]);
                return;
            }

            // Fetch detail for each listing (to get polygon_coordinates)
            const details = await Promise.all(
                summaries.map((s) =>
                    fetch(`${API_BASE_URL}/api/listings/${s.id}`)
                        .then((r) => r.json())
                        .then((d) => d.listing as ListingWithPolygon)
                        .catch(() => null)
                )
            );

            setListings(details.filter(Boolean) as ListingWithPolygon[]);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    // Re-fetch when the tab gains focus (real-time updates after admin changes)
    useEffect(() => {
        const unsubscribe = navigation.addListener("focus", () => {
            fetchAll();
        });
        return unsubscribe;
    }, [navigation, fetchAll]);

    // ---- Filters & Navigation ----
    const filteredListings = listings.filter((l) => {
        const label = l.analytics?.prediction_label ?? null;
        if (!label) return true;
        return activeFilters.includes(label as LandTypeFilter);
    });

    const activeFilterCount =
        activeFilters.length === ALL_FILTERS.length
            ? 0
            : ALL_FILTERS.length - activeFilters.length;

    const handleListLand = () => router.push("/(main)/map?startDraw=true" as any);
    const handleSeeAll = () => {
        // @ts-ignore
        router.push("/listings/all");
    };
    const handleMyLands = () => router.push("/listings/my" as any);

    // ======================== RENDER ========================

    return (
        <SafeAreaView style={s.container}>
            {/* Map */}
            <MapView
                ref={mapRef}
                style={s.map}
                provider={PROVIDER_GOOGLE}
                initialRegion={INITIAL_REGION}
                mapType="hybrid"
            >
                {/* AOI Polygon */}
                {AOI_COORDS.length > 2 && (
                    <Polygon
                        coordinates={AOI_COORDS}
                        strokeColor="#3b82f6"
                        fillColor="transparent"
                        strokeWidth={2}
                        lineDashPattern={[5, 5]}
                    />
                )}

                {/* Restricted Zones — red polygons */}
                {zones.map((zone) => {
                    if (!zone.polygon_coordinates || zone.polygon_coordinates.length === 0)
                        return null;

                    const ring = zone.polygon_coordinates[0];
                    if (!ring || ring.length < 3) return null;

                    const coords = ring.map(([lng, lat]) => ({
                        latitude: lat,
                        longitude: lng
                    }));

                    return (
                        <Polygon
                            key={`zone-${zone.id}`}
                            coordinates={coords}
                            strokeColor="#ef4444"
                            fillColor="rgba(239,68,68,0.25)"
                            strokeWidth={2}
                        />
                    );
                })}

                {/* Listing polygons + status markers */}
                {filteredListings.map((listing) => {
                    if (!listing.polygon_coordinates || listing.polygon_coordinates.length < 3)
                        return null;

                    const coords = listing.polygon_coordinates.map(([lng, lat]) => ({
                        latitude: lat,
                        longitude: lng
                    }));

                    const style = polygonStyle(listing.analytics?.prediction_label);
                    const centroid = polygonCentroid(coords);
                    const pinColor = statusPinColor(listing.status);

                    return (
                        <React.Fragment key={listing.id}>
                            {/* Land polygon */}
                            <Polygon
                                coordinates={coords}
                                strokeColor={style.stroke}
                                fillColor={style.fill}
                                strokeWidth={3}
                                tappable
                                onPress={() => {
                                    // @ts-ignore
                                    router.push({
                                        pathname: "/listings/detail",
                                        params: { id: String(listing.id) }
                                    } as any);
                                }}
                            />
                            {/* Status marker at centroid */}
                            <Marker
                                coordinate={centroid}
                                pinColor={pinColor}
                                title={listing.title}
                                description={`Status: ${listing.status ?? "unknown"}`}
                                onPress={() => {
                                    // @ts-ignore
                                    router.push({
                                        pathname: "/listings/detail",
                                        params: { id: String(listing.id) }
                                    } as any);
                                }}
                            />
                        </React.Fragment>
                    );
                })}
            </MapView>

            {/* Loading overlay */}
            {loading && (
                <View style={s.loadingOverlay}>
                    <ActivityIndicator size="large" color="#3b82f6" />
                    <Text style={s.loadingText}>Loading listings...</Text>
                </View>
            )}

            {/* Error overlay */}
            {!loading && error && (
                <View style={s.messageOverlay}>
                    <Text style={s.messageText}>⚠️ {error}</Text>
                    <Pressable style={s.retryBtn} onPress={fetchAll}>
                        <Text style={s.retryBtnText}>Retry</Text>
                    </Pressable>
                </View>
            )}

            {/* Empty state */}
            {!loading && !error && filteredListings.length === 0 && (
                <View style={s.messageOverlay} pointerEvents="none">
                    <Text style={s.messageText}>
                        {activeFilters.length === ALL_FILTERS.length
                            ? "No listings available yet."
                            : "No listings match your filters.\nTry clearing filters."}
                    </Text>
                </View>
            )}

            {/* Legend — top-left */}
            <View
                style={[s.legend, { top: insets.top + 12 }]}
                pointerEvents="none"
            >
                <Text style={s.legendHeader}>Land Types</Text>
                <LegendItem color="#22c55e" label="Vegetation" />
                <LegendItem color="#a16207" label="Idle Land" />
                <LegendItem color="#6b7280" label="Built-up" />
                <View style={s.legendDivider} />
                <Text style={s.legendHeader}>Status Markers</Text>
                <LegendItem color="#22c55e" label="✅ Verified" />
                <LegendItem color="#eab308" label="⏳ Pending" />
                <LegendItem color="#ef4444" label="❌ Rejected" />
                <View style={s.legendDivider} />
                <LegendItem color="#ef4444" label="🚫 Restricted" isSquare />
            </View>

            {/* Listing count badge — top-right */}
            {!loading && (
                <View style={[s.countBadge, { top: insets.top + 12 }]}>
                    <Text style={s.countText}>
                        {filteredListings.length} listing
                        {filteredListings.length !== 1 ? "s" : ""}
                    </Text>
                    {zones.length > 0 && (
                        <Text style={[s.countText, { color: "#ef4444" }]}>
                            {zones.length} zone{zones.length !== 1 ? "s" : ""}
                        </Text>
                    )}
                </View>
            )}

            {/* Floating Buttons — bottom-right */}
            <View style={[s.fabContainer, { bottom: insets.bottom + 24 }]}>
                {/* Search Filter toggle icon */}
                <Pressable
                    style={s.fabIconOnly}
                    onPress={() => setFilterVisible(true)}
                >
                    <Text style={{ fontSize: 20 }}>🔍</Text>
                    {activeFilterCount > 0 && (
                        <View style={s.fabBadge}>
                            <Text style={s.fabBadgeText}>{activeFilterCount}</Text>
                        </View>
                    )}
                </Pressable>

                <Pressable style={s.fabSecondary} onPress={handleMyLands}>
                    <Text style={s.fabSecondaryText}>📝 My Lands</Text>
                </Pressable>
                <Pressable style={s.fabSecondary} onPress={handleSeeAll}>
                    <Text style={s.fabSecondaryText}>📋 See All</Text>
                </Pressable>
                <Pressable style={s.fabPrimary} onPress={handleListLand}>
                    <Text style={s.fabPrimaryText}>➕ List Land</Text>
                </Pressable>
            </View>

            {/* Filter sheet */}
            <MarketplaceFilter
                visible={filterVisible}
                activeFilters={activeFilters}
                onApply={(f) => setActiveFilters(f)}
                onClose={() => setFilterVisible(false)}
            />
        </SafeAreaView>
    );
}

// ======================== SUB-COMPONENTS ========================

function LegendItem({ color, label, isSquare }: { color: string; label: string; isSquare?: boolean }) {
    return (
        <View style={s.legendItem}>
            <View
                style={[
                    s.legendDot,
                    { backgroundColor: color },
                    isSquare && { borderRadius: 2 },
                ]}
            />
            <Text style={s.legendLabel}>{label}</Text>
        </View>
    );
}

// ======================== STYLES ========================

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f8fafc" },
    map: { flex: 1 },

    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(255,255,255,0.8)",
        alignItems: "center",
        justifyContent: "center",
        gap: 12
    },
    loadingText: { color: "#475569", fontSize: 14 },

    messageOverlay: {
        position: "absolute",
        bottom: 100,
        left: 24,
        right: 24,
        backgroundColor: "rgba(255,255,255,0.95)",
        borderRadius: 16,
        padding: 20,
        alignItems: "center",
        gap: 12,
        borderWidth: 1,
        borderColor: "#e2e8f0",
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 4
    },
    messageText: {
        color: "#334155",
        fontSize: 14,
        textAlign: "center",
        lineHeight: 20
    },
    retryBtn: {
        backgroundColor: "#3b82f6",
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 10
    },
    retryBtnText: { color: "#fff", fontWeight: "700" },

    legend: {
        position: "absolute",
        left: 12,
        backgroundColor: "rgba(255,255,255,0.95)",
        borderRadius: 12,
        padding: 10,
        gap: 4,
        borderWidth: 1,
        borderColor: "#e2e8f0",
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 3
    },
    legendHeader: {
        fontSize: 10,
        color: "#64748b",
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginTop: 2
    },
    legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
    legendDot: { width: 10, height: 10, borderRadius: 5 },
    legendLabel: { fontSize: 11, color: "#334155", fontWeight: "500" },
    legendDivider: {
        height: 1,
        backgroundColor: "#e2e8f0",
        marginVertical: 3
    },

    countBadge: {
        position: "absolute",
        right: 12,
        backgroundColor: "rgba(255,255,255,0.95)",
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: "#e2e8f0",
        gap: 2,
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 1 },
        elevation: 2
    },
    countText: { fontSize: 12, color: "#475569", fontWeight: "600" },

    /* Floating Actions */
    fabContainer: {
        position: "absolute",
        right: 16,
        gap: 12,
        alignItems: "flex-end"
    },
    fabIconOnly: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "#fff",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "#e2e8f0",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 6
    },
    fabPrimary: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#3b82f6",
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 30,
        shadowColor: "#3b82f6",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8
    },
    fabPrimaryText: { color: "#fff", fontWeight: "700", fontSize: 15 },

    fabSecondary: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 30,
        borderWidth: 1,
        borderColor: "#e2e8f0",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 3
    },
    fabSecondaryText: { color: "#2563eb", fontWeight: "700", fontSize: 15 },

    fabBadge: {
        position: "absolute",
        top: -4,
        right: -4,
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: "#ef4444",
        alignItems: "center",
        justifyContent: "center"
    },
    fabBadgeText: { color: "#fff", fontSize: 10, fontWeight: "700" }
});
