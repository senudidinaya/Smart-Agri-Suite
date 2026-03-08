import React, { useCallback, useEffect, useState } from "react";
import {
    View,
    Text,
    Pressable,
    FlatList,
    ActivityIndicator,
    Alert,
    StyleSheet
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets, SafeAreaView } from "react-native-safe-area-context";
import MapView, { PROVIDER_GOOGLE, Polygon } from "react-native-maps";
import { API_BASE_URL } from "../../src/config";

// ════════════════════════════════════════════════════════════
//  TYPES
// ════════════════════════════════════════════════════════════

interface ZoneItem {
    id: number;
    zone_name: string;
    restriction_type: string | null;
    reason: string | null;
    created_at: string | null;
    polygon_coordinates: number[][][] | null;
}

// ════════════════════════════════════════════════════════════
//  MAIN EXPORT
// ════════════════════════════════════════════════════════════

export default function AdminZonesScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [zones, setZones] = useState<ZoneItem[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchZones = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/restricted-zones`);
            const data = await res.json();
            setZones(data.zones ?? []);
        } catch (e) {
            console.error("Zones fetch error:", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchZones();
    }, [fetchZones]);

    const handleDeleteZone = (id: number, name: string) => {
        Alert.alert("Delete Zone", `Delete "${name}"?`, [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                    try {
                        await fetch(`${API_BASE_URL}/api/restricted-zones/${id}`, {
                            method: "DELETE"
                        });
                        fetchZones();
                    } catch {
                        Alert.alert("Error", "Delete failed.");
                    }
                }
            },
        ]);
    };

    if (loading) {
        return (
            <SafeAreaView style={zs.page}>
                <View style={zs.centered}>
                    <ActivityIndicator size="large" color="#ef4444" />
                    <Text style={zs.loadText}>Loading zones...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={zs.page}>
            {/* Header */}
            <View style={zs.header}>
                <Pressable onPress={() => router.back()}>
                    <Text style={zs.headerBack}>← Back</Text>
                </Pressable>
                <Text style={zs.headerTitle}>🚫 Restricted Zones</Text>
                <View style={{ width: 50 }} />
            </View>

            {/* Map — top 55% */}
            <View style={zs.mapContainer}>
                <MapView
                    style={zs.map}
                    provider={PROVIDER_GOOGLE}
                    initialRegion={{
                        latitude: 6.904,
                        longitude: 79.969,
                        latitudeDelta: 0.15,
                        longitudeDelta: 0.15
                    }}
                    mapType="hybrid"
                >
                    {zones.map((z) => {
                        if (!z.polygon_coordinates || z.polygon_coordinates.length === 0)
                            return null;
                        const ring = z.polygon_coordinates[0];
                        if (!ring || ring.length < 3) return null;
                        const coords = ring.map(([lng, lat]) => ({
                            latitude: lat,
                            longitude: lng
                        }));
                        return (
                            <Polygon
                                key={z.id}
                                coordinates={coords}
                                strokeColor="#ef4444"
                                fillColor="rgba(239,68,68,0.25)"
                                strokeWidth={3}
                            />
                        );
                    })}
                </MapView>

                {/* FAB */}
                <Pressable
                    style={zs.fab}
                    onPress={() => router.push("/admin/add-zone" as any)}
                >
                    <Text style={zs.fabText}>➕</Text>
                </Pressable>
            </View>

            {/* Zone list — bottom 45% */}
            <View style={zs.listContainer}>
                <View style={zs.listHandle} />
                <Text style={zs.listTitle}>
                    {zones.length} Zone{zones.length !== 1 ? "s" : ""} Defined
                </Text>

                {zones.length === 0 ? (
                    <View style={zs.emptyBox}>
                        <Text style={zs.emptyEmoji}>🗺️</Text>
                        <Text style={zs.emptyText}>No restricted zones yet.</Text>
                    </View>
                ) : (
                    <FlatList
                        data={zones}
                        keyExtractor={(item) => String(item.id)}
                        renderItem={({ item }) => (
                            <ZoneListItem
                                zone={item}
                                onDelete={() => handleDeleteZone(item.id, item.zone_name)}
                            />
                        )}
                        contentContainerStyle={{ paddingBottom: 20 }}
                    />
                )}
            </View>
        </SafeAreaView>
    );
}

// ════════════════════════════════════════════════════════════
//  SUB-COMPONENT
// ════════════════════════════════════════════════════════════

function ZoneListItem({
    zone,
    onDelete }: {
        zone: ZoneItem;
        onDelete: () => void;
    }) {
    return (
        <View style={zs.zoneCard}>
            <View style={zs.zoneIconCircle}>
                <Text style={{ fontSize: 18 }}>🚫</Text>
            </View>
            <View style={{ flex: 1 }}>
                <Text style={zs.zoneName}>{zone.zone_name}</Text>
                {zone.restriction_type && (
                    <View style={zs.zoneBadge}>
                        <Text style={zs.zoneBadgeText}>{zone.restriction_type}</Text>
                    </View>
                )}
                {zone.reason && (
                    <Text style={zs.zoneReason} numberOfLines={1}>
                        {zone.reason}
                    </Text>
                )}
            </View>
            <Pressable style={zs.deleteBtn} onPress={onDelete}>
                <Text style={zs.deleteBtnText}>🗑️</Text>
            </Pressable>
        </View>
    );
}

// ════════════════════════════════════════════════════════════
//  STYLES
// ════════════════════════════════════════════════════════════

const zs = StyleSheet.create({
    page: { flex: 1, backgroundColor: "#f8fafc" },
    centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
    loadText: { color: "#64748b", fontSize: 14 },

    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#e2e8f0"
    },
    headerBack: { fontSize: 15, color: "#3b82f6", fontWeight: "600" },
    headerTitle: { fontSize: 18, fontWeight: "700", color: "#1e293b" },

    mapContainer: { flex: 0.55, position: "relative" },
    map: { flex: 1 },

    fab: {
        position: "absolute",
        bottom: 16,
        right: 16,
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: "#ef4444",
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#ef4444",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
        elevation: 8
    },
    fabText: { fontSize: 26 },

    listContainer: {
        flex: 0.45,
        backgroundColor: "#fff",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 12,
        marginTop: -16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 8
    },
    listHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: "#e2e8f0",
        alignSelf: "center",
        marginBottom: 12
    },
    listTitle: { fontSize: 16, fontWeight: "700", color: "#1e293b", marginBottom: 12 },

    emptyBox: { alignItems: "center", paddingTop: 32 },
    emptyEmoji: { fontSize: 36, marginBottom: 8 },
    emptyText: { color: "#94a3b8", fontSize: 14 },

    zoneCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#f8fafc",
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        gap: 12,
        borderWidth: 1,
        borderColor: "#fee2e2"
    },
    zoneIconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#fee2e2",
        alignItems: "center",
        justifyContent: "center"
    },
    zoneName: { fontSize: 14, fontWeight: "600", color: "#1e293b" },
    zoneBadge: {
        backgroundColor: "#fee2e2",
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
        alignSelf: "flex-start",
        marginTop: 4
    },
    zoneBadgeText: { fontSize: 10, color: "#dc2626", fontWeight: "700" },
    zoneReason: { fontSize: 12, color: "#64748b", marginTop: 3 },
    deleteBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#fee2e2",
        alignItems: "center",
        justifyContent: "center"
    },
    deleteBtnText: { fontSize: 16 }
});
