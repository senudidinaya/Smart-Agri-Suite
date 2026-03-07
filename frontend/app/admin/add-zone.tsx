import React, { useEffect, useRef, useState } from "react";
import {
    View,
    Text,
    TextInput,
    Pressable,
    ScrollView,
    Alert,
    ActivityIndicator,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    Keyboard
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets, SafeAreaView } from "react-native-safe-area-context";
import MapView, {
    PROVIDER_GOOGLE,
    Polygon,
    Polyline,
    Marker,
    MapPressEvent,
    LatLng
} from "react-native-maps";
import { API_BASE_URL } from "../../src/config";

// ════════════════════════════════════════════════════════════
//  ZONE TYPES
// ════════════════════════════════════════════════════════════

const ZONE_TYPES = [
    { key: "environmental_reserve", label: "🌿 Environmental Reserve" },
    { key: "government_land", label: "🏢 Government Land" },
    { key: "flood_zone", label: "🌊 Flood Zone" },
    { key: "heritage_site", label: "🏛️ Heritage Site" },
    { key: "military_zone", label: "⚔️ Military Zone" },
    { key: "wildlife_reserve", label: "🦁 Wildlife Reserve" },
    { key: "other", label: "📌 Other" },
];

type ExistingZone = {
    id: number;
    zone_name: string;
    restriction_type: string | null;
    coordinates: { latitude: number; longitude: number }[];
};

function polygonsOverlap(polyA: LatLng[], polyB: LatLng[]): boolean {
    // Simple check: does any point of A lie inside B or vice versa
    const pointInPoly = (pt: LatLng, poly: LatLng[]) => {
        let inside = false;
        for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
            const xi = poly[i].latitude, yi = poly[i].longitude;
            const xj = poly[j].latitude, yj = poly[j].longitude;
            if ((yi > pt.longitude) !== (yj > pt.longitude) &&
                pt.latitude < (xj - xi) * (pt.longitude - yi) / (yj - yi) + xi) {
                inside = !inside;
            }
        }
        return inside;
    };
    return polyA.some(p => pointInPoly(p, polyB)) || polyB.some(p => pointInPoly(p, polyA));
}

// ════════════════════════════════════════════════════════════
//  MAIN EXPORT
// ════════════════════════════════════════════════════════════

export default function AdminAddZoneScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const mapRef = useRef<MapView>(null);

    // Drawing state
    const [points, setPoints] = useState<LatLng[]>([]);
    const [drawMode, setDrawMode] = useState(true);

    // Form state
    const [zoneName, setZoneName] = useState("");
    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [reason, setReason] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // Existing zones & AOI boundary
    const [existingZones, setExistingZones] = useState<ExistingZone[]>([]);
    const [aoiCoords, setAoiCoords] = useState<LatLng[]>([]);

    useEffect(() => {
        // Fetch existing restricted zones
        fetch(`${API_BASE_URL}/api/restricted-zones`)
            .then(r => r.json())
            .then(data => {
                const zones: ExistingZone[] = (data.zones ?? []).map((z: any) => {
                    let coords: { latitude: number; longitude: number }[] = [];
                    if (z.polygon_coordinates) {
                        const ring = z.polygon_coordinates[0] ?? [];
                        coords = ring.map((c: number[]) => ({ latitude: c[1], longitude: c[0] }));
                    }
                    return { id: z.id, zone_name: z.zone_name, restriction_type: z.restriction_type, coordinates: coords };
                });
                setExistingZones(zones);
            }).catch(e => console.error("Failed to load zones:", e));

        // Fetch AOI boundary
        fetch(`${API_BASE_URL}/aoi`)
            .then(r => r.json())
            .then(json => {
                const ring = json?.aoi?.coordinates?.[0] ?? [];
                const coords = ring.map((c: number[]) => ({ latitude: c[1], longitude: c[0] }));
                setAoiCoords(coords);
            }).catch(e => console.error("Failed to load AOI:", e));
    }, []);

    const handleMapPress = (e: MapPressEvent) => {
        Keyboard.dismiss();
        if (!drawMode) return;
        // Extract coordinate BEFORE the state updater to avoid
        // accessing a recycled synthetic event's nativeEvent
        const coordinate = e.nativeEvent.coordinate;
        setPoints((prev) => [...prev, coordinate]);
    };

    const undoLastPoint = () => {
        setPoints((prev) => prev.slice(0, -1));
    };

    const clearPoints = () => {
        setPoints([]);
        setDrawMode(true);
    };

    const finishDrawing = () => {
        if (points.length < 3) {
            Alert.alert("Not Enough Points", "Draw at least 3 points to create a zone.");
            return;
        }
        setDrawMode(false);
    };

    const isFormValid = zoneName.trim().length > 0 && selectedType && points.length >= 3;

    const checkOverlap = (): string | null => {
        if (points.length < 3) return null;
        for (const zone of existingZones) {
            if (zone.coordinates.length >= 3 && polygonsOverlap(points, zone.coordinates)) {
                return zone.zone_name;
            }
        }
        return null;
    };

    const handleSave = async () => {
        if (!isFormValid) return;
        // Check overlap with existing zones
        const overlap = checkOverlap();
        if (overlap) {
            Alert.alert("⚠️ Zone Overlap", `This area overlaps with existing zone: "${overlap}". You cannot mark a zone that is already restricted.`);
            return;
        }
        setSubmitting(true);
        try {
            const coordinates = points.map((p) => [p.longitude, p.latitude]);
            // Close the ring
            if (
                coordinates[0][0] !== coordinates[coordinates.length - 1][0] ||
                coordinates[0][1] !== coordinates[coordinates.length - 1][1]
            ) {
                coordinates.push([...coordinates[0]]);
            }

            const res = await fetch(`${API_BASE_URL}/api/restricted-zones`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    zone_name: zoneName.trim(),
                    polygon_coordinates: [coordinates],
                    restriction_type: selectedType,
                    reason: reason.trim() || null
                })
            });
            const data = await res.json();
            if (data.success) {
                Alert.alert("Zone Created", `"${zoneName}" has been saved.`, [
                    { text: "OK", onPress: () => router.back() },
                ]);
            } else {
                Alert.alert("Error", "Failed to create zone.");
            }
        } catch (e) {
            Alert.alert("Error", "Network error.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={azs.page}>
            {/* Header */}
            <View style={azs.header}>
                <Pressable onPress={() => router.back()}>
                    <Text style={azs.headerBack}>← Cancel</Text>
                </Pressable>
                <Text style={azs.headerTitle}>➕ New Zone</Text>
                <View style={{ width: 60 }} />
            </View>

            {/* Map — top 55% */}
            <View style={azs.mapContainer}>
                {/* Instructions banner */}
                {drawMode && (
                    <View style={azs.instructionBanner}>
                        <Text style={azs.instructionText}>
                            📍 Tap the map to place zone boundary points ({points.length}{" "}
                            placed)
                        </Text>
                    </View>
                )}

                <MapView
                    ref={mapRef}
                    style={azs.map}
                    provider={PROVIDER_GOOGLE}
                    initialRegion={{
                        latitude: 6.904,
                        longitude: 79.969,
                        latitudeDelta: 0.08,
                        longitudeDelta: 0.08
                    }}
                    mapType="hybrid"
                    onPress={handleMapPress}
                >
                    {/* AOI Boundary */}
                    {aoiCoords.length > 2 && (
                        <Polygon
                            coordinates={aoiCoords}
                            strokeColor="#3b82f6"
                            fillColor="rgba(59,130,246,0.08)"
                            strokeWidth={3}
                            lineDashPattern={[12, 6]}
                        />
                    )}

                    {/* Existing restricted zones */}
                    {existingZones.map(z => z.coordinates.length >= 3 && (
                        <Polygon
                            key={`ez-${z.id}`}
                            coordinates={z.coordinates}
                            strokeColor="#dc2626"
                            fillColor="rgba(220,38,38,0.20)"
                            strokeWidth={2}
                        />
                    ))}
                    {existingZones.map(z => z.coordinates.length > 0 && (
                        <Marker
                            key={`ezm-${z.id}`}
                            coordinate={z.coordinates[0]}
                            anchor={{ x: 0.5, y: 0.5 }}
                            opacity={0.9}
                        >
                            <View style={azs.zoneLabel}>
                                <Text style={azs.zoneLabelText}>🚫 {z.zone_name}</Text>
                            </View>
                        </Marker>
                    ))}

                    {/* ALWAYS show Polyline for all points to securely draw the boundaries (chain) */}
                    {points.length >= 2 && (
                        <Polyline
                            coordinates={drawMode ? points : [...points, points[0]]}
                            strokeColor="#ef4444"
                            strokeWidth={drawMode ? 2 : 3}
                            lineDashPattern={drawMode ? [8, 4] : undefined}
                            zIndex={39}
                        />
                    )}

                    {/* Polygon fill when done or previewing */}
                    {points.length >= 3 && (
                        <Polygon
                            coordinates={points}
                            strokeColor="transparent"
                            fillColor={drawMode ? "rgba(239,68,68,0.15)" : "rgba(239,68,68,0.25)"}
                            strokeWidth={0}
                            zIndex={38}
                        />
                    )}

                    {/* User's Current Drawing Markers (must be on top) */}
                    {points.map((pt, i) => (
                        <Marker
                            key={`marker-${i}-${pt.latitude}-${pt.longitude}`}
                            coordinate={pt}
                            anchor={{ x: 0.5, y: 0.5 }}
                            zIndex={41}
                            tracksViewChanges={true}
                            pinColor="#ef4444"
                            title={`Point ${i + 1}`}
                        />
                    ))}
                </MapView>

                {/* Map Legend */}
                <View style={azs.legend}>
                    <View style={azs.legendItem}><View style={[azs.legendDot, { backgroundColor: '#3b82f6' }]} /><Text style={azs.legendText}>Malabe AOI</Text></View>
                    <View style={azs.legendItem}><View style={[azs.legendDot, { backgroundColor: '#dc2626' }]} /><Text style={azs.legendText}>Existing Zones ({existingZones.length})</Text></View>
                    <View style={azs.legendItem}><View style={[azs.legendDot, { backgroundColor: '#ef4444', borderWidth: 1, borderColor: '#fff' }]} /><Text style={azs.legendText}>New Zone</Text></View>
                </View>

                {/* Drawing controls */}
                <View style={azs.drawControls}>
                    {drawMode && points.length > 0 && (
                        <Pressable style={azs.drawBtn} onPress={undoLastPoint}>
                            <Text style={azs.drawBtnText}>↩️</Text>
                        </Pressable>
                    )}
                    {drawMode && points.length >= 3 && (
                        <Pressable
                            style={[azs.drawBtn, { backgroundColor: "#22c55e" }]}
                            onPress={finishDrawing}
                        >
                            <Text style={azs.drawBtnText}>✓</Text>
                        </Pressable>
                    )}
                    {!drawMode && (
                        <Pressable style={azs.drawBtn} onPress={clearPoints}>
                            <Text style={azs.drawBtnText}>🔄</Text>
                        </Pressable>
                    )}
                </View>
            </View>

            {/* Form — bottom 45% */}
            <KeyboardAvoidingView
                style={azs.formContainer}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                <View style={azs.formHandle} />
                <ScrollView showsVerticalScrollIndicator={false}>
                    {/* Zone Name */}
                    <Text style={azs.fieldLabel}>Zone Name *</Text>
                    <TextInput
                        style={azs.textInput}
                        placeholder="e.g. Sinharaja Forest Reserve"
                        placeholderTextColor="#94a3b8"
                        value={zoneName}
                        onChangeText={setZoneName}
                    />

                    {/* Type selector */}
                    <Text style={azs.fieldLabel}>Restriction Type *</Text>
                    <View style={azs.typeGrid}>
                        {ZONE_TYPES.map((t) => (
                            <Pressable
                                key={t.key}
                                style={[
                                    azs.typeBtn,
                                    selectedType === t.key && azs.typeBtnActive,
                                ]}
                                onPress={() => setSelectedType(t.key)}
                            >
                                <Text
                                    style={[
                                        azs.typeBtnText,
                                        selectedType === t.key && azs.typeBtnTextActive,
                                    ]}
                                >
                                    {t.label}
                                </Text>
                            </Pressable>
                        ))}
                    </View>

                    {/* Reason */}
                    <Text style={azs.fieldLabel}>Reason (optional)</Text>
                    <TextInput
                        style={[azs.textInput, { height: 80, textAlignVertical: "top" }]}
                        placeholder="Why is this zone restricted?"
                        placeholderTextColor="#94a3b8"
                        multiline
                        value={reason}
                        onChangeText={setReason}
                    />

                    {/* Save button */}
                    <Pressable
                        style={[
                            azs.saveBtn,
                            !isFormValid && { opacity: 0.5 },
                        ]}
                        disabled={!isFormValid || submitting}
                        onPress={handleSave}
                    >
                        {submitting ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={azs.saveBtnText}>
                                {points.length < 3
                                    ? "Draw polygon first"
                                    : "💾 Save Restricted Zone"}
                            </Text>
                        )}
                    </Pressable>

                    <View style={{ height: 32 }} />
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

// ════════════════════════════════════════════════════════════
//  STYLES
// ════════════════════════════════════════════════════════════

const azs = StyleSheet.create({
    page: { flex: 1, backgroundColor: "#f8fafc" },

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

    instructionBanner: {
        position: "absolute",
        top: 12,
        left: 16,
        right: 16,
        zIndex: 10,
        backgroundColor: "rgba(15,23,42,0.85)",
        borderRadius: 12,
        padding: 12
    },
    instructionText: { color: "#f8fafc", fontSize: 13, textAlign: "center", fontWeight: "500" },

    drawControls: {
        position: "absolute",
        top: 70,
        right: 12,
        gap: 8
    },
    drawBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "#1e293b",
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 4
    },
    drawBtnText: { fontSize: 20, color: "#fff" },

    formContainer: {
        flex: 0.45,
        backgroundColor: "#fff",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 24,
        paddingTop: 12,
        marginTop: -16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 8
    },
    formHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: "#e2e8f0",
        alignSelf: "center",
        marginBottom: 16
    },

    fieldLabel: {
        fontSize: 12,
        fontWeight: "700",
        color: "#64748b",
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginBottom: 6,
        marginTop: 12
    },
    textInput: {
        backgroundColor: "#f8fafc",
        borderWidth: 1,
        borderColor: "#e2e8f0",
        borderRadius: 12,
        padding: 14,
        fontSize: 15,
        color: "#1e293b"
    },
    typeGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8
    },
    typeBtn: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: "#f1f5f9",
        borderWidth: 1,
        borderColor: "#e2e8f0"
    },
    typeBtnActive: {
        backgroundColor: "#fee2e2",
        borderColor: "#ef4444"
    },
    typeBtnText: { fontSize: 13, color: "#64748b", fontWeight: "500" },
    typeBtnTextActive: { color: "#dc2626", fontWeight: "700" },

    saveBtn: {
        backgroundColor: "#ef4444",
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: "center",
        marginTop: 20,
        shadowColor: "#ef4444",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 4
    },
    saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

    legend: {
        position: "absolute",
        bottom: 12,
        left: 12,
        backgroundColor: "rgba(255,255,255,0.93)",
        borderRadius: 12,
        padding: 10,
        gap: 5,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4
    },
    legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
    legendDot: { width: 12, height: 12, borderRadius: 6 },
    legendText: { fontSize: 11, fontWeight: "600", color: "#1e293b" },
    zoneLabel: {
        backgroundColor: "rgba(220,38,38,0.85)",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    zoneLabelText: { fontSize: 10, fontWeight: "700", color: "#fff" },
});
