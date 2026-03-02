import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    ScrollView,
    Pressable,
    ActivityIndicator,
    Alert,
    StyleSheet,
    Platform,
    Image,
    Linking,
    Modal,
    LayoutAnimation,
    UIManager
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets, SafeAreaView } from "react-native-safe-area-context";
import MapView, { Polygon, PROVIDER_GOOGLE } from "react-native-maps";
import { API_BASE_URL } from "../../src/config";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental)
    UIManager.setLayoutAnimationEnabledExperimental(true);

// ════════════════════════════════════════════════════════════
//  TYPES
// ════════════════════════════════════════════════════════════

interface DetailCropScore {
    crop_name: string;
    score: number | null;
    label: string | null;
}

interface DetailAnalytics {
    prediction_label: string | null;
    confidence: number | null;
    vegetation_pct: number | null;
    idle_pct: number | null;
    built_pct: number | null;
    ndvi_mean: number | null;
    ndwi_mean: number | null;
    evi_mean: number | null;
    elevation_mean: number | null;
    slope_mean: number | null;
}

interface DetailListing {
    id: number;
    title: string;
    description: string | null;
    owner_name: string;
    owner_phone: string;
    owner_email: string | null;
    owner_address: string | null;
    polygon_coordinates: number[][] | null;
    area_square_meters: number | null;
    area_acres: number | null;
    area_hectares: number | null;
    current_land_use: string | null;
    soil_type: string | null;
    water_availability: string | null;
    road_access: boolean;
    electricity: boolean;
    listing_purpose: string;
    expected_price: number | null;
    status: string;
    verification_code: string;
    submitted_at: string | null;
    verified_at: string | null;
    analytics: DetailAnalytics | null;
    crop_scores: DetailCropScore[];
    has_documents: boolean;
    photos: Array<{ id: number; url: string; is_primary: boolean }> | null;
    documents: Array<{ id: number; url: string; doc_type: string }> | null;
}

// ════════════════════════════════════════════════════════════
//  HELPERS
// ════════════════════════════════════════════════════════════

function detailLandBadge(label: string | null) {
    if (label === "VEGETATION_LAND")
        return { emoji: "🌿", text: "Vegetation Land", color: "#22c55e", bg: "#d1fae5" };
    if (label === "IDLE_LAND")
        return { emoji: "🟤", text: "Idle Land", color: "#d97706", bg: "#fef3c7" };
    if (label === "BUILT_LAND")
        return { emoji: "🏠", text: "Built-up Land", color: "#64748b", bg: "#f1f5f9" };
    return { emoji: "❔", text: "Unknown", color: "#94a3b8", bg: "#f1f5f9" };
}

function detailStatusBadge(status: string) {
    if (status === "pending") return { emoji: "⏳", text: "Pending", color: "#d97706", bg: "#fef3c7" };
    if (status === "verified") return { emoji: "✅", text: "Verified", color: "#059669", bg: "#d1fae5" };
    if (status === "rejected") return { emoji: "❌", text: "Rejected", color: "#dc2626", bg: "#fee2e2" };
    if (status === "sold") return { emoji: "💰", text: "Sold", color: "#2563eb", bg: "#dbeafe" };
    return { emoji: "❔", text: "Unknown", color: "#94a3b8", bg: "#f1f5f9" };
}

function detailScoreColor(score: number | null): string {
    if (score === null) return "#94a3b8";
    if (score >= 70) return "#22c55e";
    if (score >= 50) return "#eab308";
    return "#ef4444";
}

function detailScoreLabel(score: number | null): string {
    if (score === null) return "N/A";
    if (score >= 70) return "Good";
    if (score >= 50) return "Moderate";
    return "Poor";
}

// ════════════════════════════════════════════════════════════
//  MAIN EXPORT
// ════════════════════════════════════════════════════════════

export default function AdminListingDetailScreen() {
    const params = useLocalSearchParams<{ id?: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [listing, setListing] = useState<DetailListing | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
    const [analyticsOpen, setAnalyticsOpen] = useState(false);
    const [analysis, setAnalysis] = useState<any>(null);
    const [analysisLoading, setAnalysisLoading] = useState(false);

    useEffect(() => {
        if (!params.id) {
            setError("No listing ID.");
            setLoading(false);
            return;
        }
        fetch(`${API_BASE_URL}/api/listings/${params.id}`)
            .then((r) => r.json())
            .then((d) => {
                if (d.ok && d.listing) setListing(d.listing);
                else setError("Listing not found.");
            })
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }, [params.id]);

    // ── Actions ──────────────────────────────────────────
    const updateStatus = async (newStatus: string) => {
        if (!listing) return;
        setActionLoading(true);
        try {
            await fetch(`${API_BASE_URL}/api/listings/${listing.id}/status`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus })
            });
            setListing({ ...listing, status: newStatus });
            Alert.alert("Success", `Listing marked as ${newStatus}.`);
        } catch {
            Alert.alert("Error", "Failed to update status.");
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = () => {
        if (!listing) return;
        Alert.alert("Delete Listing", "This action cannot be undone.", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                    setActionLoading(true);
                    try {
                        await fetch(`${API_BASE_URL}/api/listings/${listing.id}`, {
                            method: "DELETE"
                        });
                        Alert.alert("Deleted", "Listing removed.", [
                            { text: "OK", onPress: () => router.back() },
                        ]);
                    } catch {
                        Alert.alert("Error", "Delete failed.");
                    } finally {
                        setActionLoading(false);
                    }
                }
            },
        ]);
    };

    // ── Loading / Error ──────────────────────────────────
    if (loading) {
        return (
            <SafeAreaView style={ad.page}>
                <View style={ad.centered}>
                    <ActivityIndicator size="large" color="#3b82f6" />
                    <Text style={ad.loadText}>Loading listing...</Text>
                </View>
            </SafeAreaView>
        );
    }
    if (error || !listing) {
        return (
            <SafeAreaView style={ad.page}>
                <View style={ad.centered}>
                    <Text style={ad.errorText}>⚠️ {error}</Text>
                    <Pressable style={ad.backBtn} onPress={() => router.back()}>
                        <Text style={ad.backBtnText}>← Go Back</Text>
                    </Pressable>
                </View>
            </SafeAreaView>
        );
    }

    const sb = detailStatusBadge(listing.status);
    const lb = detailLandBadge(listing.analytics?.prediction_label ?? null);

    const mapCoords =
        listing.polygon_coordinates?.map(([lng, lat]) => ({
            latitude: lat,
            longitude: lng
        })) ?? [];

    const centerLat = mapCoords.length
        ? mapCoords.reduce((s, c) => s + c.latitude, 0) / mapCoords.length
        : 6.9;
    const centerLng = mapCoords.length
        ? mapCoords.reduce((s, c) => s + c.longitude, 0) / mapCoords.length
        : 79.9;

    const sortedCrops = [...(listing.crop_scores ?? [])].sort(
        (a, b) => (b.score ?? 0) - (a.score ?? 0)
    );

    // ════════════════════════════════════════════════════════
    //  RENDER
    // ════════════════════════════════════════════════════════

    return (
        <SafeAreaView style={ad.page}>
            {/* Header */}
            <View style={ad.header}>
                <Pressable onPress={() => router.back()} style={ad.headerBackBtn}>
                    <Text style={ad.headerBackText}>← Back</Text>
                </Pressable>
                <View style={{ flex: 1 }}>
                    <Text style={ad.headerTitle}>{listing.verification_code}</Text>
                </View>
                <View style={[ad.statusBadge, { backgroundColor: sb.bg }]}>
                    <Text style={[ad.statusBadgeText, { color: sb.color }]}>
                        {sb.emoji} {sb.text}
                    </Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={ad.scroll} showsVerticalScrollIndicator={false}>
                {/* Card 1: Owner Info */}
                <View style={[ad.card, { borderLeftColor: "#3b82f6" }]}>
                    <Text style={ad.cardTitle}>👤 Owner Information</Text>
                    <View style={ad.ownerRow}>
                        <View style={ad.avatarCircle}>
                            <Text style={ad.avatarText}>
                                {listing.owner_name.charAt(0).toUpperCase()}
                            </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={ad.ownerName}>{listing.owner_name}</Text>
                            <Text style={ad.ownerDetail}>📱 {listing.owner_phone}</Text>
                            {listing.owner_email && (
                                <Text style={ad.ownerDetail}>✉️ {listing.owner_email}</Text>
                            )}
                            {listing.owner_address && (
                                <Text style={ad.ownerDetail}>📍 {listing.owner_address}</Text>
                            )}
                        </View>
                    </View>
                </View>

                {/* Card 2: Area & Details */}
                <View style={[ad.card, { borderLeftColor: "#22c55e" }]}>
                    <Text style={ad.cardTitle}>📐 Area & Details</Text>
                    <View style={[ad.statIconCircle, { backgroundColor: "#d1fae5" }]}>
                        <Text style={{ fontSize: 22 }}>🏞️</Text>
                    </View>
                    {listing.area_acres != null && (
                        <Text style={ad.bigNumber}>
                            {listing.area_acres.toFixed(2)}{" "}
                            <Text style={ad.bigNumberUnit}>acres</Text>
                        </Text>
                    )}
                    <View style={ad.metricsGrid}>
                        <DetailMetricItem label="Hectares" value={listing.area_hectares?.toFixed(2) ?? "—"} />
                        <DetailMetricItem label="Sq Meters" value={listing.area_square_meters?.toFixed(0) ?? "—"} />
                        <DetailMetricItem label="Purpose" value={listing.listing_purpose ?? "—"} />
                        <DetailMetricItem label="Price" value={listing.expected_price ? `LKR ${listing.expected_price.toLocaleString()}` : "—"} />
                    </View>
                </View>

                {/* Mini Map */}
                {mapCoords.length >= 3 && (
                    <View style={ad.mapCard}>
                        <MapView
                            style={ad.map}
                            provider={PROVIDER_GOOGLE}
                            initialRegion={{
                                latitude: centerLat,
                                longitude: centerLng,
                                latitudeDelta: 0.005,
                                longitudeDelta: 0.005
                            }}
                            scrollEnabled={false}
                            zoomEnabled={false}
                            pitchEnabled={false}
                            rotateEnabled={false}
                        >
                            <Polygon
                                coordinates={mapCoords}
                                strokeColor={lb.color}
                                fillColor={lb.color + "33"}
                                strokeWidth={3}
                            />
                        </MapView>
                    </View>
                )}

                {/* Removed obsolete cards (Classification, Composition, Indices, Crop Suitability) */}

                {/* Card 7: Media & Documents */}
                <View style={[ad.card, { borderLeftColor: "#a855f7" }]}>
                    <Text style={ad.cardTitle}>📸 Uploaded Media</Text>

                    {/* Photos */}
                    <Text style={ad.sectionSubtitle}>Photos</Text>
                    {(listing.photos && listing.photos.length > 0) ? (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                            {listing.photos.map((p) => (
                                <Pressable
                                    key={p.id}
                                    onPress={() => setFullScreenImage(`${API_BASE_URL}${p.url}`)}
                                >
                                    <Image
                                        source={{ uri: `${API_BASE_URL}${p.url}` }}
                                        style={ad.mediaImage}
                                    />
                                </Pressable>
                            ))}
                        </ScrollView>
                    ) : (
                        <Text style={ad.dimText}>No photos uploaded.</Text>
                    )}

                    {/* Documents */}
                    <Text style={ad.sectionSubtitle}>Documents ({listing.has_documents ? "Present" : "None"})</Text>
                    {(listing.documents && listing.documents.length > 0) ? (
                        <View style={ad.docWrap}>
                            {listing.documents.map((d) => (
                                <Pressable
                                    key={d.id}
                                    style={ad.docItem}
                                    onPress={async () => {
                                        try {
                                            const u = `${API_BASE_URL}${d.url}`;
                                            await Linking.openURL(u);
                                        } catch (e) {
                                            Alert.alert('Error', 'Cannot open document on this device.');
                                        }
                                    }}
                                >
                                    <View style={ad.docIcon}>
                                        <Text>📄</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={ad.docName} numberOfLines={1}>{d.doc_type}</Text>
                                        <Text style={ad.docUrl} numberOfLines={1}>Tap to view</Text>
                                    </View>
                                </Pressable>
                            ))}
                        </View>
                    ) : (
                        <Text style={ad.dimText}>No documents uploaded.</Text>
                    )}
                </View>

                {/* Card 8: Land Characteristics */}
                <View style={[ad.card, { borderLeftColor: "#64748b" }]}>
                    <Text style={ad.cardTitle}>🏡 Characteristics</Text>
                    <DetailInfoRow icon="🌱" label="Current Use" value={listing.current_land_use ?? "—"} />
                    <DetailInfoRow icon="🧱" label="Soil Type" value={listing.soil_type ?? "—"} />
                    <DetailInfoRow icon="💧" label="Water" value={listing.water_availability ?? "—"} />
                    <DetailInfoRow icon="🛣️" label="Road Access" value={listing.road_access ? "Yes ✅" : "No"} />
                    <DetailInfoRow icon="⚡" label="Electricity" value={listing.electricity ? "Yes ✅" : "No"} />
                    {
                        listing.description && (
                            <View style={{ marginTop: 10 }}>
                                <Text style={ad.descLabel}>Description</Text>
                                <Text style={ad.descText}>{listing.description}</Text>
                            </View>
                        )
                    }
                </View >

                {/* Full Analytics Toggle */}
                <Pressable style={ad.analyticsToggle} onPress={async () => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    if (!analyticsOpen && !analysis && listing.polygon_coordinates) {
                        setAnalyticsOpen(true); setAnalysisLoading(true);
                        try {
                            const res = await fetch(`${API_BASE_URL}/aoi/analyze-polygon`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ coordinates: listing.polygon_coordinates }) });
                            const data = await res.json();
                            if (data.ok) setAnalysis(data);
                        } catch (e) { console.error(e); } finally { setAnalysisLoading(false); }
                    } else { setAnalyticsOpen(p => !p); }
                }}>
                    <View style={ad.analyticsToggleInner}>
                        <Text style={{ fontSize: 24 }}>🔬</Text>
                        <View style={{ flex: 1 }}><Text style={ad.atTitle}>Full Land Analytics</Text><Text style={ad.atSub}>ML Analysis, Suitability, Intercropping, Recommendations</Text></View>
                        <View style={[ad.toggleArrow, analyticsOpen && { backgroundColor: '#3b82f6' }]}><Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>{analyticsOpen ? '▲' : '▼'}</Text></View>
                    </View>
                </Pressable>

                {analyticsOpen && analysisLoading && <View style={{ padding: 24, alignItems: 'center' }}><ActivityIndicator size="large" color="#3b82f6" /><Text style={{ color: '#64748b', marginTop: 8 }}>Running full analysis...</Text></View>}
                {analyticsOpen && analysis && <AdminFullAnalytics data={analysis} />}

                <View style={{ height: 100 }} />
            </ScrollView >
            <Modal
                visible={!!fullScreenImage}
                transparent={true}
                onRequestClose={() => setFullScreenImage(null)}
            >
                <View style={ad.modalContainer}>
                    <Pressable
                        style={ad.modalCloseArea}
                        onPress={() => setFullScreenImage(null)}
                    />
                    {fullScreenImage && (
                        <Image
                            source={{ uri: fullScreenImage }}
                            style={ad.modalImg}
                            resizeMode="contain"
                        />
                    )}
                    <Pressable
                        style={ad.modalCloseBtn}
                        onPress={() => setFullScreenImage(null)}
                    >
                        <Text style={ad.modalCloseText}>✕</Text>
                    </Pressable>
                </View>
            </Modal>

            {/* ── Fixed Bottom Action Bar ────────────────────── */}
            <View style={[ad.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
                {actionLoading ? (
                    <ActivityIndicator size="small" color="#3b82f6" />
                ) : (
                    <>
                        {listing.status === "pending" && (
                            <>
                                <Pressable
                                    style={[ad.bottomBtn, { backgroundColor: "#22c55e", flex: 1 }]}
                                    onPress={() => updateStatus("verified")}
                                >
                                    <Text style={ad.bottomBtnText}>✅ Verify</Text>
                                </Pressable>
                                <Pressable
                                    style={[ad.bottomBtn, { backgroundColor: "#ef4444", flex: 1 }]}
                                    onPress={() => updateStatus("rejected")}
                                >
                                    <Text style={ad.bottomBtnText}>❌ Reject</Text>
                                </Pressable>
                            </>
                        )}
                        {listing.status === "verified" && (
                            <>
                                <Pressable
                                    style={[ad.bottomBtn, { backgroundColor: "#3b82f6", flex: 1 }]}
                                    onPress={() => updateStatus("sold")}
                                >
                                    <Text style={ad.bottomBtnText}>💰 Mark Sold</Text>
                                </Pressable>
                                <Pressable
                                    style={[ad.bottomBtn, ad.bottomBtnOutline, { flex: 1 }]}
                                    onPress={() => updateStatus("pending")}
                                >
                                    <Text style={ad.bottomBtnOutlineText}>↩️ Revert</Text>
                                </Pressable>
                            </>
                        )}
                        <Pressable
                            style={[ad.bottomBtn, ad.bottomBtnOutline]}
                            onPress={handleDelete}
                        >
                            <Text style={[ad.bottomBtnOutlineText, { color: "#ef4444" }]}>🗑️</Text>
                        </Pressable>
                    </>
                )}
            </View>
        </SafeAreaView >
    );
}

// ════════════════════════════════════════════════════════════
//  SUB-COMPONENTS (uniquely named with Detail prefix)
// ════════════════════════════════════════════════════════════

function DetailMetricItem({ label, value }: { label: string; value: string }) {
    return (
        <View style={ad.metricItem}>
            <Text style={ad.metricLabel}>{label}</Text>
            <Text style={ad.metricValue}>{value}</Text>
        </View>
    );
}

function DetailProgressBar({
    label,
    pct,
    color }: {
        label: string;
        pct: number;
        color: string;
    }) {
    return (
        <View style={ad.progressRow}>
            <Text style={ad.progressLabel}>{label}</Text>
            <View style={ad.progressBarBg}>
                <View
                    style={[
                        ad.progressBarFill,
                        { width: `${pct.toFixed(0)}%` as any, backgroundColor: color },
                    ]}
                />
            </View>
            <Text style={[ad.progressPct, { color }]}>{pct.toFixed(1)}%</Text>
        </View>
    );
}

function DetailIndexChip({
    label,
    value,
    color,
    decimals = 3,
    info }: {
        label: string;
        value: number;
        color: string;
        decimals?: number;
        info?: string;
    }) {
    return (
        <View style={[ad.indexChip, { borderColor: color + "40" }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={ad.indexChipLabel}>{label}</Text>
                {info && <Pressable onPress={() => Alert.alert("ℹ️ " + label, info, [{ text: "Got it" }])} style={ad.infoBubble}><Text style={{ fontSize: 10 }}>❓</Text></Pressable>}
            </View>
            <Text style={[ad.indexChipValue, { color }]}>{value.toFixed(decimals)}</Text>
        </View>
    );
}

function DetailCropScoreRow({ crop }: { crop: DetailCropScore }) {
    const color = detailScoreColor(crop.score);
    const badge = detailScoreLabel(crop.score);
    return (
        <View style={ad.cropRow}>
            <Text style={ad.cropName}>{crop.crop_name}</Text>
            <View style={ad.cropBarWrap}>
                <View style={ad.cropBarBg}>
                    <View
                        style={[
                            ad.cropBarFill,
                            { width: `${crop.score ?? 0}%` as any, backgroundColor: color },
                        ]}
                    />
                </View>
                <View style={[ad.cropBadge, { backgroundColor: color + "20" }]}>
                    <Text style={[ad.cropBadgeText, { color }]}>{badge}</Text>
                </View>
            </View>
        </View>
    );
}

function DetailInfoRow({
    icon,
    label,
    value }: {
        icon: string;
        label: string;
        value: string;
    }) {
    return (
        <View style={ad.infoRow}>
            <Text style={ad.infoIcon}>{icon}</Text>
            <Text style={ad.infoLabel}>{label}</Text>
            <Text style={ad.infoValue}>{value}</Text>
        </View>
    );
}

// ════════════════════════════════════════════════════════════
//  ADMIN FULL ANALYTICS (same as listing detail)
// ════════════════════════════════════════════════════════════

type LevelTone = "good" | "moderate" | "bad" | "neutral";
function toneColor(t: LevelTone) { return t === "good" ? "#16a34a" : t === "moderate" ? "#ca8a04" : t === "bad" ? "#ef4444" : "#64748b"; }
function toneBgC(t: LevelTone) { return t === "good" ? "#dcfce7" : t === "moderate" ? "#fef3c7" : t === "bad" ? "#fee2e2" : "#f1f5f9"; }
function fmtVal(n?: number, d = 3) { if (typeof n !== "number") return "-"; return n.toFixed(d); }
const normIdx = (v: number) => Math.max(0, Math.min(1, (v + 1) / 2));
function getSafe(s: any): number | undefined { if (typeof s === "number") return s; if (s && typeof s === "object" && "mean" in s) return s.mean; return undefined; }
function classNDVI(v?: number) { if (typeof v !== "number") return { title: "Unknown", tone: "neutral" as LevelTone, explain: "", tip: "" }; if (v >= 0.6) return { title: "Good vegetation", tone: "good" as LevelTone, explain: "Strong plant growth.", tip: "Good for spices." }; if (v >= 0.3) return { title: "Moderate vegetation", tone: "moderate" as LevelTone, explain: "Patchy cover.", tip: "Add compost." }; return { title: "Low vegetation", tone: "bad" as LevelTone, explain: "Little green growth.", tip: "Clear weeds, add organic matter." }; }
function classNDWI(v?: number) { if (typeof v !== "number") return { title: "Unknown", tone: "neutral" as LevelTone, explain: "", tip: "" }; if (v >= 0.15) return { title: "Wet / high moisture", tone: "good" as LevelTone, explain: "Good water.", tip: "Ensure drainage." }; if (v >= 0.0) return { title: "Moderate moisture", tone: "moderate" as LevelTone, explain: "Not strong.", tip: "Mulch recommended." }; return { title: "Dry land", tone: "bad" as LevelTone, explain: "Dry soil.", tip: "Use drip irrigation." }; }
function classEVI(v?: number) { if (typeof v !== "number") return { title: "Unknown", tone: "neutral" as LevelTone, explain: "", tip: "" }; if (v >= 0.5) return { title: "Dense canopy", tone: "good" as LevelTone, explain: "Dense plant cover.", tip: "Excellent for shade-loving crops." }; if (v >= 0.2) return { title: "Moderate canopy", tone: "moderate" as LevelTone, explain: "Partial canopy.", tip: "Plant more shade trees." }; return { title: "Sparse vegetation", tone: "bad" as LevelTone, explain: "Little canopy.", tip: "Add ground cover." }; }
function classSAVI(v?: number) { if (typeof v !== "number") return { title: "Unknown", tone: "neutral" as LevelTone, explain: "", tip: "" }; if (v >= 0.5) return { title: "Good soil-adjusted greenness", tone: "good" as LevelTone, explain: "Healthy balance.", tip: "Maintain with mulch." }; if (v >= 0.2) return { title: "Moderate mix", tone: "moderate" as LevelTone, explain: "Some bare soil.", tip: "Add ground cover." }; return { title: "Exposed soil", tone: "bad" as LevelTone, explain: "Mostly bare.", tip: "Establish cover crops." }; }
function slopeChkA(v?: number) { if (typeof v !== "number") return { status: "Unknown", tone: "neutral" as LevelTone, why: "N/A", tip: "" }; if (v <= 8) return { status: "OK", tone: "good" as LevelTone, why: "Low slope → easy farming.", tip: "Normal planting." }; if (v <= 20) return { status: "OK", tone: "moderate" as LevelTone, why: "Moderate slope → erosion risk.", tip: "Use contour planting." }; return { status: "Not OK", tone: "bad" as LevelTone, why: "High slope → strong erosion.", tip: "Use terraces." }; }
function elevChkA(v?: number) { if (typeof v !== "number") return { status: "Unknown", tone: "neutral" as LevelTone, why: "N/A" }; if (v < 1200) return { status: "OK", tone: "good" as LevelTone, why: "Suitable for most crops." }; return { status: "OK", tone: "moderate" as LevelTone, why: "Higher elevation — choose carefully." }; }
function aspectA(v?: number) { if (typeof v !== "number") return { status: "Unknown", tone: "neutral" as LevelTone, why: "N/A", tip: "" }; let d = "North"; if (v >= 45 && v < 135) d = "East"; else if (v >= 135 && v < 225) d = "South"; else if (v >= 225 && v < 315) d = "West"; const s = d === "South" || d === "West"; return { status: `${d}-facing`, tone: (s ? "moderate" : "good") as LevelTone, why: `Faces ${d} (${v.toFixed(0)}°). ${s ? "More sun, hotter." : "Cooler, more moisture."}`, tip: s ? "Consider shade trees." : "Good for moisture-loving crops." }; }
function scoreBarSegsA(args: { score: number; ndvi?: number; ndwi?: number }) { const s = Math.max(0, Math.min(100, args.score)); let l = 0, m = s, r = 0, n = "Balanced suitability."; if (typeof args.ndwi === "number" && args.ndwi < 0) { l = Math.min(30, Math.round(s * 0.25)); m = Math.max(0, s - l); n = "Moisture low — improve water."; } if (typeof args.ndvi === "number" && args.ndvi >= 0.6) { const x = Math.min(25, Math.round(s * 0.22)); r = Math.min(x, m); m = Math.max(0, m - r); n = n.includes("Moisture") ? "Good vegetation, moisture limiting." : "Good vegetation base."; } return { left: l, mid: m, right: r, note: n }; }
function recStepsA(args: { spiceName: string; ndvi?: number; ndwi?: number; slope?: number; landLabel?: string }) { const st: string[] = []; let b = 0; if (typeof args.ndwi === "number" && args.ndwi < 0) { st.push("💧 Use mulch for moisture."); st.push("🌳 Add shade trees."); b += 10; } if (typeof args.ndvi === "number" && args.ndvi < 0.6) { st.push("🌿 Add compost."); b += 8; } if (typeof args.slope === "number" && args.slope > 20) { st.push("⛰️ Use terraces."); b -= 6; } if (args.landLabel === "BUILT_LAND") { st.unshift("🏠 Built area — limited."); b -= 20; } return { steps: st.slice(0, 5), boostScore: b }; }
function colorForScA(s: number) { return s >= 75 ? "#16a34a" : s >= 55 ? "#ca8a04" : s >= 30 ? "#ea580c" : "#dc2626"; }

function AdminSpiceCard({ sp, ndvi, ndwi, slope, landLabel }: { sp: any; ndvi?: number; ndwi?: number; slope?: number; landLabel?: string }) {
    const [showAfter, setShowAfter] = useState(false);
    const score = Math.max(0, Math.min(100, sp.score ?? 0));
    const baseColor = sp.label === "Good" ? "#16a34a" : sp.label === "Moderate" ? "#ca8a04" : "#ea580c";
    const seg = scoreBarSegsA({ score, ndvi, ndwi });
    const rec = recStepsA({ spiceName: sp.name, ndvi, ndwi, slope, landLabel });
    const backendProj = typeof sp.improvement?.projected_score === "number" ? Math.round(sp.improvement.projected_score) : null;
    const projected = backendProj ?? Math.max(0, Math.min(100, Math.round(score + rec.boostScore)));
    const improvementSteps = sp.improvement?.steps?.length > 0 ? sp.improvement.steps : rec.steps;
    const showBoost = improvementSteps.length > 0 && projected > score;
    const afterColor = colorForScA(projected);
    const confText = showBoost && projected >= 75 ? `✅ Can grow ${sp.name} well (~${projected}/100).` : showBoost ? `⚠️ Suitability can improve (~${projected}/100).` : score >= 75 ? `✅ Good for ${sp.name}.` : `ℹ️ Manage land to improve.`;

    return (
        <View style={{ backgroundColor: '#f8f9fa', borderRadius: 16, padding: 14, marginBottom: 10, borderLeftWidth: 5, borderLeftColor: baseColor }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}><Text style={{ fontSize: 15, fontWeight: '900', flex: 1 }}>{sp.name}</Text><View style={{ backgroundColor: baseColor + '22', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 20 }}><Text style={{ fontSize: 11, fontWeight: '900', color: baseColor }}>{sp.label}</Text></View></View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 8 }}><Text style={{ fontSize: 22, fontWeight: '900' }}>{Math.round(score)}</Text><Text style={{ fontSize: 12, fontWeight: '800', color: '#64748b' }}>/100</Text></View>
            <View style={{ height: 12, backgroundColor: '#e5e7eb', borderRadius: 6, overflow: 'hidden', marginBottom: 8 }}><View style={{ flexDirection: 'row', width: '100%', height: '100%' }}>{seg.left > 0 && <View style={{ flex: seg.left / 100, backgroundColor: '#ef4444' }} />}{seg.mid > 0 && <View style={{ flex: seg.mid / 100, backgroundColor: baseColor }} />}{seg.right > 0 && <View style={{ flex: seg.right / 100, backgroundColor: '#16a34a' }} />}<View style={{ flex: (100 - score) / 100, backgroundColor: '#e5e7eb' }} /></View></View>
            <Text style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>{seg.note}</Text>
            {(sp.reasons ?? []).length > 0 && <View style={{ marginBottom: 8 }}>{(sp.reasons ?? []).slice(0, 3).map((r: string, i: number) => <Text key={i} style={{ fontSize: 12, color: '#475569', lineHeight: 17 }}>• {r}</Text>)}</View>}
            {showBoost ? (
                <View style={{ marginTop: 4 }}>
                    <Pressable style={{ backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingVertical: 8, alignItems: 'center' }} onPress={() => setShowAfter(v => !v)}>
                        <Text style={{ fontWeight: '900', fontSize: 12, color: '#0f172a' }}>{showAfter ? "Hide after improvement ▲" : "Show after improvement ▼"}</Text>
                    </Pressable>
                    {showAfter && (
                        <View style={{ marginTop: 10 }}>
                            <Text style={{ fontSize: 12, fontWeight: '800', color: '#475569' }}>After: <Text style={{ color: afterColor, fontWeight: '900' }}>{projected}/100 {projected >= 75 ? "✅" : ""}</Text></Text>
                            <View style={{ height: 12, backgroundColor: '#e5e7eb', borderRadius: 6, overflow: 'hidden', marginTop: 6, marginBottom: 10 }}>
                                <View style={{ flexDirection: 'row', width: '100%', height: '100%' }}><View style={{ flex: projected / 100, backgroundColor: afterColor }} /><View style={{ flex: 1 - projected / 100, backgroundColor: '#e5e7eb' }} /></View>
                            </View>
                            <View style={{ backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 12, padding: 10 }}>
                                <Text style={{ fontSize: 12, fontWeight: '900', color: '#14532d' }}>🧑‍🌾 Recommendation</Text>
                                <Text style={{ fontSize: 12, fontWeight: '800', color: '#14532d', marginTop: 4, lineHeight: 17 }}>{confText}</Text>
                                {improvementSteps.length > 0 && improvementSteps.slice(0, 5).map((t: string, i: number) => <Text key={i} style={{ fontSize: 11, fontWeight: '700', color: '#14532d', marginTop: 4 }}>• {t}</Text>)}
                            </View>
                        </View>
                    )}
                </View>
            ) : (
                <View style={{ backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 12, padding: 10, marginTop: 10 }}>
                    <Text style={{ fontSize: 12, fontWeight: '900', color: '#14532d' }}>🧑‍🌾 Recommendation</Text>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#14532d', marginTop: 4, lineHeight: 17 }}>{confText}</Text>
                </View>
            )}
        </View>
    );
}

function AdminFullAnalytics({ data }: { data: any }) {
    const f = data.features ?? {}; const stats = data.statistics ?? {};
    const ndvi = getSafe(f.NDVI ?? stats.NDVI), ndwi = getSafe(f.NDWI ?? stats.NDWI);
    const slope = getSafe(f.SLOPE ?? stats.SLOPE), elev = getSafe(f.ELEV ?? stats.ELEV);
    const aspect = getSafe(f.ASPECT ?? stats.ASPECT);
    const evi = getSafe(f.EVI ?? stats.EVI), savi = getSafe(f.SAVI ?? stats.SAVI);
    const pred = data.prediction;
    const spices = data.intelligence?.spices ?? [];
    const goodPairs = data.intelligence?.intercropping?.good_pairs ?? [];
    const avoidPairs = data.intelligence?.intercropping?.avoid_pairs ?? [];
    const conf = pred?.confidence ?? 0;
    const nc = classNDVI(ndvi), wc = classNDWI(ndwi), ec = classEVI(evi), sc = classSAVI(savi);
    const slC = slopeChkA(slope), elC = elevChkA(elev), asC = aspectA(aspect);
    const farmHeadline = pred?.label === "BUILT_LAND" ? "Built-up area. Limited farming." : nc.tone === "good" && wc.tone !== "bad" ? "Good conditions for farming." : wc.tone === "bad" ? "Dry land. Moisture management needed." : nc.tone === "bad" ? "Weak vegetation. Soil improvement needed." : "Mixed signals — review details.";

    const ABlockFull = ({ name, val, c, info }: { name: string; val?: number; c: { title: string; tone: LevelTone; explain: string; tip: string }; info: string }) => {
        const color = toneColor(c.tone); const fill = typeof val === 'number' ? normIdx(val) : 0;
        return <View style={{ marginBottom: 10 }}><View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}><Text style={{ fontSize: 14, fontWeight: '800', color: '#1e293b' }}>{name}</Text><Pressable onPress={() => Alert.alert("ℹ️ " + name, info, [{ text: "Got it" }])} style={ad.infoBubble}><Text style={{ fontSize: 10 }}>❓</Text></Pressable></View><Text style={{ fontSize: 18, fontWeight: '900', color }}>{fmtVal(val, 3)}</Text></View><View style={{ height: 12, borderRadius: 6, flexDirection: 'row', overflow: 'hidden' }}><View style={{ flex: fill, backgroundColor: color }} /><View style={{ flex: 1 - fill, backgroundColor: '#e5e7eb' }} /></View><Text style={{ fontSize: 14, fontWeight: '800', color, marginTop: 6 }}>{c.title}</Text><Text style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>{c.explain}</Text>{c.tip ? <Text style={{ fontSize: 12, color: '#a16207', fontWeight: '700', marginTop: 4 }}>💡 {c.tip}</Text> : null}</View>;
    };

    const TerrainRowA = ({ name, val, unit, status, tone, why, tip, info }: { name: string; val?: number; unit: string; status: string; tone: LevelTone; why: string; tip?: string; info: string }) => {
        const color = toneColor(tone);
        return <View style={{ marginBottom: 8 }}><View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}><Text style={{ fontSize: 14, fontWeight: '800', color: '#1e293b' }}>{name}</Text><Pressable onPress={() => Alert.alert("ℹ️ " + name, info, [{ text: "Got it" }])} style={ad.infoBubble}><Text style={{ fontSize: 10 }}>❓</Text></Pressable></View><Text style={{ fontSize: 18, fontWeight: '900', color }}>{fmtVal(val, 2)} {unit}</Text></View><View style={{ backgroundColor: toneBgC(tone), paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 }}><Text style={{ fontSize: 12, fontWeight: '800', color, lineHeight: 17 }}>{status} — {why}</Text></View>{tip ? <Text style={{ fontSize: 12, color: '#a16207', fontWeight: '700', marginTop: 4 }}>💡 {tip}</Text> : null}</View>;
    };

    return (
        <View style={{ gap: 14, marginBottom: 14 }}>
            {/* MODEL PREDICTION */}
            <View style={[ad.card, { borderLeftColor: pred?.label === "VEGETATION_LAND" ? "#16a34a" : pred?.label === "IDLE_LAND" ? "#ca8a04" : "#ef4444" }]}><Text style={ad.cardTitle}>🤖 Model Prediction</Text><View style={{ backgroundColor: pred?.label === "VEGETATION_LAND" ? "#dcfce7" : pred?.label === "IDLE_LAND" ? "#fef3c7" : "#fee2e2", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 14, alignSelf: 'flex-start', marginBottom: 10 }}><Text style={{ fontSize: 16, fontWeight: '900' }}>{pred?.label ?? "UNKNOWN"}</Text></View><View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}><Text style={{ fontSize: 22, fontWeight: '900' }}>{(conf * 100).toFixed(0)}%</Text><View style={{ flex: 1, height: 12, backgroundColor: '#e5e7eb', borderRadius: 6, overflow: 'hidden' }}><View style={{ width: `${conf * 100}%` as any, height: '100%', borderRadius: 6, backgroundColor: conf >= 0.75 ? '#16a34a' : conf >= 0.6 ? '#ca8a04' : '#ef4444' }} /></View></View>{pred?.probabilities && <Text style={{ fontSize: 12, color: '#64748b' }}>🟢 Veg: {fmtVal(pred.probabilities.vegetation_land, 2)} | 🟤 Idle: {fmtVal(pred.probabilities.idle_land, 2)} | 🏠 Built: {fmtVal(pred.probabilities.built_land, 2)}</Text>}</View>

            {/* VEGETATION & WATER */}
            <View style={[ad.card, { borderLeftColor: "#2563eb" }]}><Text style={ad.cardTitle}>🌱 Vegetation & Water Health</Text>
                <ABlockFull name="NDVI (Greenness)" val={ndvi} c={nc} info="NDVI measures vegetation greenness. Higher = denser plants." />
                <ABlockFull name="NDWI (Moisture)" val={ndwi} c={wc} info="NDWI detects water content. Positive = moist. Negative = dry." />
                <ABlockFull name="EVI (Enhanced Vegetation)" val={evi} c={ec} info="EVI corrects for atmosphere/soil. Higher = denser canopy." />
                <ABlockFull name="SAVI (Soil-Adjusted)" val={savi} c={sc} info="SAVI accounts for exposed soil. Low = bare soil dominates." />
            </View>

            {/* TERRAIN */}
            <View style={[ad.card, { borderLeftColor: "#ca8a04" }]}><Text style={ad.cardTitle}>⛰️ Terrain Assessment</Text>
                <TerrainRowA name="Elevation" val={elev} unit="m" status={elC.status} tone={elC.tone} why={elC.why} info="Height above sea level. <1200m suits most spice crops." />
                <TerrainRowA name="Slope" val={slope} unit="°" status={slC.status} tone={slC.tone} why={slC.why} tip={slC.tip} info="How steep the land is. 0-8° easy, >20° difficult." />
                <TerrainRowA name="Aspect" val={aspect} unit="°" status={asC.status} tone={asC.tone} why={asC.why} tip={asC.tip} info="Compass direction the slope faces. South/West = hotter." />
            </View>

            {/* SPICE SUITABILITY — FULL */}
            {spices.length > 0 && <View style={[ad.card, { borderLeftColor: "#ea580c" }]}><Text style={ad.cardTitle}>🌶️ Spice Suitability</Text><Text style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>Scores (0–100) based on vegetation, moisture, terrain & land class.</Text>{spices.map((sp: any) => <AdminSpiceCard key={sp.name} sp={sp} ndvi={ndvi} ndwi={ndwi} slope={slope} landLabel={pred?.label} />)}</View>}

            {/* INTERCROPPING */}
            {(goodPairs.length > 0 || avoidPairs.length > 0) && <View style={[ad.card, { borderLeftColor: "#14532d" }]}><Text style={ad.cardTitle}>🌾 Intercropping Recommendations</Text>{goodPairs.length > 0 && <><Text style={{ fontSize: 13, fontWeight: '900', marginBottom: 6 }}>✅ Can Grow Together</Text>{goodPairs.map((p: any, i: number) => <View key={`g${i}`} style={{ backgroundColor: '#f0fdf4', borderRadius: 12, padding: 10, marginBottom: 6, borderLeftWidth: 4, borderLeftColor: '#16a34a' }}><Text style={{ fontSize: 13, fontWeight: '900' }}>{p.a} + {p.b}</Text><Text style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>{p.why}</Text></View>)}</>}{avoidPairs.length > 0 && <><Text style={{ fontSize: 13, fontWeight: '900', marginTop: 10, marginBottom: 6 }}>⚠️ Avoid Together</Text>{avoidPairs.map((p: any, i: number) => <View key={`a${i}`} style={{ backgroundColor: '#fef3c7', borderRadius: 12, padding: 10, marginBottom: 6, borderLeftWidth: 4, borderLeftColor: '#ca8a04' }}><Text style={{ fontSize: 13, fontWeight: '900' }}>{p.a} + {p.b}</Text><Text style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>{p.why}</Text></View>)}</>}</View>}

            {/* FARMER SUMMARY */}
            <View style={[ad.card, { borderLeftColor: "#16a34a" }]}><Text style={ad.cardTitle}>👨‍🌾 Farmer-Friendly Summary</Text><Text style={{ fontSize: 16, fontWeight: '900', color: '#065f46', marginBottom: 8, lineHeight: 22 }}>{farmHeadline}</Text><Text style={{ fontSize: 13, color: '#374151', lineHeight: 19 }}>• Vegetation: {nc.title}</Text><Text style={{ fontSize: 13, color: '#374151', lineHeight: 19 }}>• Moisture: {wc.title}</Text><Text style={{ fontSize: 13, color: '#374151', lineHeight: 19 }}>• Slope: {slC.status} ({slC.why})</Text><Text style={{ fontSize: 12, color: '#16a34a', marginTop: 10, lineHeight: 17 }}>💡 Good farming areas have healthy vegetation, adequate moisture, and gentle slopes.</Text></View>
        </View>
    );
}


// ════════════════════════════════════════════════════════════
//  STYLES
// ════════════════════════════════════════════════════════════

const ad = StyleSheet.create({
    page: { flex: 1, backgroundColor: "#f8fafc" },
    centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
    loadText: { color: "#64748b", fontSize: 14 },
    errorText: { color: "#ef4444", fontSize: 15, textAlign: "center", paddingHorizontal: 24 },
    backBtn: { backgroundColor: "#3b82f6", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
    backBtnText: { color: "#fff", fontWeight: "700" },
    scroll: { padding: 16, paddingBottom: 120 },

    // Header
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#e2e8f0",
        gap: 10
    },
    headerBackBtn: { paddingVertical: 4 },
    headerBackText: { fontSize: 15, color: "#3b82f6", fontWeight: "600" },
    headerTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1e293b",
        fontFamily: Platform.select({ ios: "Menlo", android: "monospace" })
    },
    statusBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
    statusBadgeText: { fontSize: 12, fontWeight: "700" },

    // Card
    card: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 20,
        marginBottom: 14,
        borderLeftWidth: 4,
        borderLeftColor: "#3b82f6",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3
    },
    cardTitle: {
        fontSize: 14,
        fontWeight: "700",
        color: "#64748b",
        marginBottom: 14,
        textTransform: "uppercase",
        letterSpacing: 0.5
    },

    // Owner
    ownerRow: { flexDirection: "row", alignItems: "center", gap: 14 },
    avatarCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: "#dbeafe",
        alignItems: "center",
        justifyContent: "center"
    },
    avatarText: { fontSize: 24, fontWeight: "700", color: "#3b82f6" },
    ownerName: { fontSize: 17, fontWeight: "700", color: "#1e293b" },
    ownerDetail: { fontSize: 13, color: "#64748b", marginTop: 3 },

    // Area
    statIconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 10
    },
    bigNumber: { fontSize: 36, fontWeight: "700", color: "#1e293b" },
    bigNumberUnit: { fontSize: 16, fontWeight: "500", color: "#64748b" },
    metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 14 },
    metricItem: {
        width: "46%",
        backgroundColor: "#f8fafc",
        borderRadius: 10,
        padding: 10
    },
    metricLabel: { fontSize: 11, color: "#94a3b8", textTransform: "uppercase" },
    metricValue: { fontSize: 15, fontWeight: "600", color: "#1e293b", marginTop: 2 },

    // Map
    mapCard: {
        height: 180,
        borderRadius: 16,
        overflow: "hidden",
        marginBottom: 14,
        borderWidth: 1,
        borderColor: "#e2e8f0"
    },
    map: { flex: 1 },

    // Classification
    classBadge: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, alignSelf: "flex-start" },
    classBadgeText: { fontSize: 16, fontWeight: "700" },
    confSection: { marginTop: 14 },
    confLabel: { fontSize: 13, color: "#64748b", marginBottom: 6 },
    confBarBg: { height: 8, backgroundColor: "#f1f5f9", borderRadius: 4, overflow: "hidden" },
    confBarFill: { height: 8, borderRadius: 4 },

    // Progress bars
    progressRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
        gap: 10
    },
    progressLabel: { width: 80, fontSize: 13, color: "#64748b", fontWeight: "500" },
    progressBarBg: { flex: 1, height: 10, backgroundColor: "#f1f5f9", borderRadius: 5, overflow: "hidden" },
    progressBarFill: { height: 10, borderRadius: 5 },
    progressPct: { width: 50, fontSize: 13, fontWeight: "700", textAlign: "right" },

    // Indices
    indicesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    indexChip: {
        backgroundColor: "#f8fafc",
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 8,
        alignItems: "center",
        minWidth: 80
    },
    indexChipLabel: { fontSize: 10, color: "#94a3b8", textTransform: "uppercase" },
    indexChipValue: { fontSize: 16, fontWeight: "700", marginTop: 2 },

    // Crop scores
    cropRow: { marginBottom: 14 },
    cropName: { fontSize: 13, fontWeight: "600", color: "#1e293b", marginBottom: 6 },
    cropBarWrap: { flexDirection: "row", alignItems: "center", gap: 10 },
    cropBarBg: { flex: 1, height: 8, backgroundColor: "#f1f5f9", borderRadius: 4, overflow: "hidden" },
    cropBarFill: { height: 8, borderRadius: 4 },
    cropBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
    cropBadgeText: { fontSize: 11, fontWeight: "700" },

    // Info rows
    infoRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: "#f1f5f9",
        gap: 8
    },
    infoIcon: { fontSize: 16 },
    infoLabel: { flex: 1, fontSize: 13, color: "#64748b" },
    infoValue: { fontSize: 13, fontWeight: "600", color: "#1e293b" },
    descLabel: { fontSize: 12, color: "#94a3b8", marginBottom: 4 },
    descText: { fontSize: 13, color: "#475569", lineHeight: 20 },

    // Media & Docs
    sectionSubtitle: { fontSize: 12, fontWeight: "700", color: "#64748b", marginTop: 10, marginBottom: 8, textTransform: "uppercase" },
    dimText: { fontSize: 13, color: "#94a3b8", fontStyle: "italic", marginBottom: 12 },
    mediaImage: { width: 140, height: 100, borderRadius: 8, marginRight: 10, backgroundColor: "#e2e8f0" },
    docWrap: { gap: 8 },
    docItem: { flexDirection: "row", alignItems: "center", backgroundColor: "#f8fafc", padding: 10, borderRadius: 10, borderWidth: 1, borderColor: "#e2e8f0" },
    docIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#dbeafe", alignItems: "center", justifyContent: "center", marginRight: 10 },
    docName: { fontSize: 13, fontWeight: "600", color: "#1e293b" },
    docUrl: { fontSize: 11, color: "#3b82f6", marginTop: 2 },

    // Bottom bar
    bottomBar: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: "row",
        gap: 10,
        padding: 16,
        backgroundColor: "#fff",
        borderTopWidth: 1,
        borderTopColor: "#e2e8f0",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 8
    },
    bottomBtn: {
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center"
    },
    bottomBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
    bottomBtnOutline: {
        backgroundColor: "transparent",
        borderWidth: 1.5,
        borderColor: "#e2e8f0"
    },
    bottomBtnOutlineText: { color: "#64748b", fontWeight: "700", fontSize: 14 },
    modalContainer: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.95)", justifyContent: "center", alignItems: "center" },
    modalCloseArea: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0 },
    modalImg: { width: "100%", height: "80%" },
    modalCloseBtn: { position: "absolute", top: 40, right: 20, width: 40, height: 40, backgroundColor: "#ffffff", borderRadius: 20, alignItems: "center", justifyContent: "center" },
    modalCloseText: { color: "#1e293b", fontSize: 20, fontWeight: "700" },
    analyticsToggle: { backgroundColor: '#1e293b', borderRadius: 16, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 10, elevation: 4 },
    analyticsToggleInner: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
    atTitle: { fontSize: 15, fontWeight: '900', color: '#f8fafc' },
    atSub: { fontSize: 11, color: '#94a3b8', fontWeight: '500', marginTop: 2 },
    toggleArrow: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#334155', alignItems: 'center', justifyContent: 'center' },
    infoBubble: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#e0e7ff', alignItems: 'center', justifyContent: 'center' },
});
