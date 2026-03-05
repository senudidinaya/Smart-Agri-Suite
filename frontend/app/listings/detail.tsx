import React, { useEffect, useState } from "react";
import {
    View, Text, ScrollView, Pressable, ActivityIndicator, StyleSheet,
    Image, Modal, Linking, Alert, LayoutAnimation, Platform, UIManager,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets, SafeAreaView } from "react-native-safe-area-context";
import MapView, { Polygon, PROVIDER_GOOGLE } from "react-native-maps";
import { API_BASE_URL } from "../../src/config";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental)
    UIManager.setLayoutAnimationEnabledExperimental(true);

// ═══════ TYPES ═══════
type Pair = { a: string; b: string; why: string };
type LevelTone = "good" | "moderate" | "bad" | "neutral";
interface AnalysisResp {
    ok: boolean; area_hectares?: number; area_acres?: number; pixel_count?: number;
    features?: Record<string, number>;
    statistics?: Record<string, { mean?: number }>;
    prediction?: {
        prediction: number; label: string; confidence?: number;
        probabilities?: { idle_land: number; vegetation_land: number; built_land: number };
    };
    intelligence?: {
        spices?: Array<{
            name: string; score: number; label: string; confidence?: number;
            reasons?: string[]; tips?: string[];
            improvement?: { projected_score?: number; projected_good_75?: boolean; steps?: string[] };
        }>;
        intercropping?: { good_pairs?: Pair[]; avoid_pairs?: Pair[]; notes?: string[] };
        health?: { headline?: string; tags?: string[] };
    };
    composition?: { vegetation_pct?: number; idle_pct?: number; built_pct?: number };
}
interface Listing {
    id: number; title: string; description: string | null;
    owner_name: string; owner_phone: string; owner_email: string | null; owner_address: string | null;
    polygon_coordinates: number[][] | null;
    area_square_meters: number | null; area_acres: number | null; area_hectares: number | null;
    current_land_use: string | null; soil_type: string | null; water_availability: string | null;
    road_access: boolean; electricity: boolean; listing_purpose: string;
    expected_price: number | null; status: string; verification_code: string; submitted_at: string | null;
    admin_comment?: string | null;
    analytics: any; crop_scores: any[];
    photos?: { id: number; url: string; is_primary: boolean }[];
    documents?: { id: number; url: string; doc_type: string }[];
}

// ═══════ HELPERS (identical to analytics.tsx) ═══════
function toneColor(t: LevelTone) { return t === "good" ? "#16a34a" : t === "moderate" ? "#ca8a04" : t === "bad" ? "#ef4444" : "#64748b"; }
function toneBg(t: LevelTone) { return t === "good" ? "#dcfce7" : t === "moderate" ? "#fef3c7" : t === "bad" ? "#fee2e2" : "#f1f5f9"; }
function fmt(n?: number | null, d = 3) { if (typeof n !== "number" || Number.isNaN(n)) return "-"; return n.toFixed(d); }
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const normIndex = (v: number) => clamp01((v + 1) / 2);
function getSafeValue(stat: any): number | undefined {
    if (typeof stat === "number") return stat;
    if (stat && typeof stat === "object" && "mean" in stat) return stat.mean;
    return undefined;
}
function landLabelColor(l?: string) { return l === "VEGETATION_LAND" ? "#16a34a" : l === "IDLE_LAND" ? "#ca8a04" : l === "BUILT_LAND" ? "#ef4444" : "#111827"; }
function landLabelBg(l?: string) { return l === "VEGETATION_LAND" ? "#dcfce7" : l === "IDLE_LAND" ? "#fef3c7" : l === "BUILT_LAND" ? "#fee2e2" : "#f3f4f6"; }
function classifyNDVI(v?: number): { title: string; tone: LevelTone; explain: string; tip: string } {
    if (typeof v !== "number") return { title: "Unknown", tone: "neutral", explain: "NDVI not available.", tip: "" };
    if (v >= 0.6) return { title: "Good vegetation (healthy green cover)", tone: "good", explain: "High NDVI means strong plant growth.", tip: "Good for spices. Keep moisture stable." };
    if (v >= 0.3) return { title: "Moderate vegetation (patchy / mixed)", tone: "moderate", explain: "Medium NDVI — some plants exist but cover is not dense.", tip: "Add compost, improve irrigation, reduce weeds." };
    return { title: "Low vegetation (bare soil / weak plants)", tone: "bad", explain: "Low NDVI — little green growth.", tip: "Clear weeds, add organic matter, check water access." };
}
function classifyNDWI(v?: number): { title: string; tone: LevelTone; explain: string; tip: string } {
    if (typeof v !== "number") return { title: "Unknown", tone: "neutral", explain: "NDWI not available.", tip: "" };
    if (v >= 0.15) return { title: "Wet / high moisture", tone: "good", explain: "Higher NDWI — good water/moisture.", tip: "Good for moisture-loving crops. Ensure drainage." };
    if (v >= 0.0) return { title: "Moderate moisture", tone: "moderate", explain: "NDWI near zero — moisture present but not strong.", tip: "Mulch and occasional irrigation recommended." };
    return { title: "Dry land / low moisture", tone: "bad", explain: "Negative NDWI — dry soil.", tip: "Use mulch + shade + drip irrigation." };
}
function classifyEVI(v?: number): { title: string; tone: LevelTone; explain: string; tip: string } {
    if (typeof v !== "number") return { title: "Unknown", tone: "neutral", explain: "EVI not available.", tip: "" };
    if (v >= 0.5) return { title: "Dense, healthy canopy", tone: "good", explain: "High EVI means dense, actively photosynthesizing plant cover.", tip: "Excellent for shade-loving spices." };
    if (v >= 0.2) return { title: "Moderate canopy cover", tone: "moderate", explain: "Medium EVI — partial canopy, not dense.", tip: "Plant more cover crops or shade trees." };
    return { title: "Sparse / bare vegetation", tone: "bad", explain: "Low EVI — very little active plant canopy.", tip: "Add organic matter, establish ground cover." };
}
function classifySAVI(v?: number): { title: string; tone: LevelTone; explain: string; tip: string } {
    if (typeof v !== "number") return { title: "Unknown", tone: "neutral", explain: "SAVI not available.", tip: "" };
    if (v >= 0.5) return { title: "Good soil-adjusted greenness", tone: "good", explain: "Good vegetation even after accounting for exposed soil.", tip: "Soil and vegetation balance is healthy." };
    if (v >= 0.2) return { title: "Moderate soil-vegetation mix", tone: "moderate", explain: "Some bare soil visible between plants.", tip: "Add ground cover crops or mulch." };
    return { title: "Exposed soil dominates", tone: "bad", explain: "Mostly bare/exposed soil with little plant cover.", tip: "Apply compost, establish cover crops." };
}
function slopeCheck(v?: number): { status: string; tone: LevelTone; why: string; tip: string } {
    if (typeof v !== "number") return { status: "Unknown", tone: "neutral", why: "Slope not available.", tip: "" };
    if (v <= 8) return { status: "OK", tone: "good", why: "Low slope → easier farming.", tip: "Normal planting is fine." };
    if (v <= 20) return { status: "OK", tone: "moderate", why: "Moderate slope → erosion risk in rain.", tip: "Use contour planting, mulch, drainage." };
    return { status: "Not OK", tone: "bad", why: "High slope → strong erosion risk.", tip: "Use terraces and ground cover." };
}
function elevCheck(v?: number): { status: string; tone: LevelTone; why: string } {
    if (typeof v !== "number") return { status: "Unknown", tone: "neutral", why: "Elevation not available." };
    if (v < 1200) return { status: "OK", tone: "good", why: "Suitable for most lowland/midland crops." };
    return { status: "OK", tone: "moderate", why: "Higher elevation — choose varieties carefully." };
}
function aspectExplain(v?: number): { status: string; tone: LevelTone; why: string; tip: string } {
    if (typeof v !== "number") return { status: "Unknown", tone: "neutral", why: "Aspect not available.", tip: "" };
    let dir = "North";
    if (v >= 45 && v < 135) dir = "East";
    else if (v >= 135 && v < 225) dir = "South";
    else if (v >= 225 && v < 315) dir = "West";
    const isSunny = dir === "South" || dir === "West";
    return {
        status: `${dir}-facing`, tone: isSunny ? "moderate" : "good",
        why: `Faces ${dir} (${v.toFixed(0)}°). ${isSunny ? "More sun, hotter/drier." : "Cooler, retains more moisture."}`,
        tip: isSunny ? "Consider shade trees for sun-sensitive crops." : "Good for moisture-loving crops."
    };
}
function scoreBarSegments(args: { score: number; ndvi?: number; ndwi?: number }) {
    const score = Math.max(0, Math.min(100, args.score));
    let left = 0, mid = score, right = 0, note = "Balanced suitability signals.";
    if (typeof args.ndwi === "number" && args.ndwi < 0) { const p = Math.min(30, Math.max(12, Math.round(score * 0.25))); left = p; mid = Math.max(0, score - left); note = "Moisture looks low — improving water retention can raise suitability."; }
    if (typeof args.ndvi === "number" && args.ndvi >= 0.6) { const s = Math.min(25, Math.max(10, Math.round(score * 0.22))); right = Math.min(s, mid); mid = Math.max(0, mid - right); note = note.includes("Moisture") ? "Good vegetation, but moisture is limiting." : "Good vegetation — strong base for spice growth."; }
    const sum = left + mid + right; if (sum > score) mid = Math.max(0, mid - (sum - score));
    return { left, mid, right, note };
}
function recommendedSteps(args: { spiceName: string; ndvi?: number; ndwi?: number; slope?: number; landLabel?: string }) {
    const steps: string[] = []; let boost = 0;
    if (typeof args.ndwi === "number" && args.ndwi < 0) { steps.push("💧 Use mulch to keep soil moisture."); steps.push("🌳 Add shade trees to reduce drying."); steps.push("🚿 Use drip irrigation if possible."); boost += args.spiceName === "Cinnamon" ? 14 : 10; }
    if (args.spiceName === "Nutmeg" && typeof args.ndwi === "number" && args.ndwi < 0.05) steps.push("🌿 Nutmeg needs consistent humidity — establish dense canopy.");
    if (typeof args.ndvi === "number" && args.ndvi < 0.6) { steps.push("🌿 Add compost/manure and remove weeds."); boost += 8; }
    if (typeof args.slope === "number" && args.slope > 20) { steps.push("⛰️ Use contour planting/terraces."); boost -= 6; }
    else if (typeof args.slope === "number" && args.slope > 8) { steps.push("🧱 Use contour lines + mulch."); boost -= 2; }
    if (args.landLabel === "BUILT_LAND") { steps.unshift("🏠 Built-up area — focus on green pockets."); boost -= 20; }
    return { steps: steps.slice(0, 5), boostScore: boost };
}
function colorForScore75(s: number) { return s >= 75 ? "#16a34a" : s >= 55 ? "#ca8a04" : s >= 30 ? "#ea580c" : "#dc2626"; }
function makeFarmerSummary(args: { landLabel?: string; ndvi?: number; ndwi?: number; slope?: number }) {
    const nc = classifyNDVI(args.ndvi), wc = classifyNDWI(args.ndwi), sc = slopeCheck(args.slope);
    const bullets = [`Vegetation: ${nc.title}`, `Moisture: ${wc.title}`, `Slope: ${sc.status} (${sc.why})`];
    let headline = "This land has mixed signals.";
    if (args.landLabel === "BUILT_LAND") headline = "Built-up area. Farming potential is limited.";
    else if (nc.tone === "good" && wc.tone !== "bad" && sc.tone !== "bad") headline = "Good conditions: healthy vegetation, acceptable moisture, manageable terrain.";
    else if (wc.tone === "bad") headline = "Land looks dry. Moisture management is important.";
    else if (nc.tone === "bad") headline = "Vegetation is weak. Soil improvement needed.";
    else if (sc.tone === "bad") headline = "Steep slope. Erosion control required.";
    return { headline, bullets };
}
function predBadge(l: string | null) {
    if (l === "VEGETATION_LAND") return { emoji: "🌿", color: "#16a34a", bg: "#dcfce7", text: "Vegetation" };
    if (l === "IDLE_LAND") return { emoji: "🟤", color: "#d97706", bg: "#fef3c7", text: "Idle Land" };
    if (l === "BUILT_LAND") return { emoji: "🏢", color: "#4338ca", bg: "#e0e7ff", text: "Built-up" };
    return { emoji: "❔", color: "#64748b", bg: "#f1f5f9", text: "Unknown" };
}

// ═══════ MAIN COMPONENT ═══════
export default function ListingDetailScreen() {
    const params = useLocalSearchParams<{ id?: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [listing, setListing] = useState<Listing | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [fullImg, setFullImg] = useState<string | null>(null);
    const [analyticsOpen, setAnalyticsOpen] = useState(false);
    const [photoSlide, setPhotoSlide] = useState(0);
    const [analysis, setAnalysis] = useState<AnalysisResp | null>(null);
    const [analysisLoading, setAnalysisLoading] = useState(false);

    useEffect(() => {
        if (!params.id) { setError("No listing ID."); setLoading(false); return; }
        fetch(`${API_BASE_URL}/api/listings/${params.id}`)
            .then(r => r.json()).then(d => { if (d.ok && d.listing) setListing(d.listing); else setError("Not found."); })
            .catch(e => setError(e.message)).finally(() => setLoading(false));
    }, [params.id]);

    // Photo slideshow
    useEffect(() => {
        const photos = listing?.photos ?? [];
        if (photos.length <= 1) return;
        const t = setInterval(() => setPhotoSlide(p => (p + 1) % photos.length), 2000);
        return () => clearInterval(t);
    }, [listing?.photos?.length]);

    // Fetch FULL analysis when analytics panel opened
    const toggleAnalytics = async () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        if (!analyticsOpen && !analysis && listing?.polygon_coordinates) {
            setAnalyticsOpen(true);
            setAnalysisLoading(true);
            try {
                const coords = listing.polygon_coordinates;
                const res = await fetch(`${API_BASE_URL}/aoi/analyze-polygon`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ coordinates: coords }),
                });
                const data = await res.json();
                if (data.ok) setAnalysis(data);
            } catch (e) { console.error("Analysis fetch error:", e); }
            finally { setAnalysisLoading(false); }
        } else {
            setAnalyticsOpen(p => !p);
        }
    };

    if (loading) return <SafeAreaView style={S.container}><View style={S.centered}><ActivityIndicator size="large" color="#3b82f6" /><Text style={S.loadingText}>Loading...</Text></View></SafeAreaView>;
    if (error || !listing) return <SafeAreaView style={S.container}><View style={S.centered}><Text style={{ fontSize: 48 }}>😕</Text><Text style={S.errorText}>{error || "Something went wrong."}</Text><Pressable style={S.goBackBtn} onPress={() => router.back()}><Text style={S.goBackBtnText}>← Go Back</Text></Pressable></View></SafeAreaView>;

    const badge = predBadge(listing.analytics?.prediction_label ?? null);
    const mapCoords = listing.polygon_coordinates?.map(([lng, lat]) => ({ latitude: lat, longitude: lng })) ?? [];
    const cLat = mapCoords.length ? mapCoords.reduce((s, c) => s + c.latitude, 0) / mapCoords.length : 6.904;
    const cLng = mapCoords.length ? mapCoords.reduce((s, c) => s + c.longitude, 0) / mapCoords.length : 79.969;
    const photos = listing.photos ?? [];
    const safeSlide = photos.length > 0 ? photoSlide % photos.length : 0;

    return (
        <SafeAreaView style={S.container}>
            <View style={S.header}>
                <Pressable style={S.headerBack} onPress={() => router.back()}><Text style={S.headerBackText}>←</Text></Pressable>
                <View style={{ flex: 1 }}><Text style={S.headerTitle} numberOfLines={1}>{listing.title}</Text><Text style={S.headerCode}>{listing.verification_code}</Text></View>
                <View style={[S.headerBadge, { backgroundColor: badge.bg }]}><Text style={[S.headerBadgeText, { color: badge.color }]}>{badge.emoji} {badge.text}</Text></View>
            </View>
            <ScrollView contentContainerStyle={S.scroll}>
                {/* STATUS BANNERS */}
                {listing.status === "rejected" && (
                    <View style={[S.card, { backgroundColor: '#fef2f2', borderColor: '#fca5a5', borderWidth: 1 }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <Text style={{ fontSize: 24 }}>❌</Text>
                            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#991b1b' }}>Listing Rejected</Text>
                        </View>
                        {listing.admin_comment && (
                            <Text style={{ fontSize: 15, color: '#991b1b', lineHeight: 22 }}>
                                <Text style={{ fontWeight: 'bold' }}>Reason:</Text> {listing.admin_comment}
                            </Text>
                        )}
                        <Text style={{ fontSize: 13, color: '#dc2626', marginTop: 12 }}>This listing has been removed from the public marketplace.</Text>
                    </View>
                )}
                {listing.status === "pending" && (
                    <View style={[S.card, { backgroundColor: '#fffbeb', borderColor: '#fde047', borderWidth: 1 }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <Text style={{ fontSize: 24 }}>⏳</Text>
                            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#854d0e' }}>Pending Verification</Text>
                        </View>
                        <Text style={{ fontSize: 15, color: '#854d0e', lineHeight: 22 }}>
                            This listing is currently under review by our team and is not yet visible to the public.
                        </Text>
                    </View>
                )}

                {/* MAP */}
                {mapCoords.length >= 3 && <View style={S.mapBox}><MapView style={S.map} provider={PROVIDER_GOOGLE} initialRegion={{ latitude: cLat, longitude: cLng, latitudeDelta: 0.005, longitudeDelta: 0.005 }} scrollEnabled={false} zoomEnabled={false}><Polygon coordinates={mapCoords} strokeColor={badge.color} fillColor={badge.color + "33"} strokeWidth={3} /></MapView></View>}

                {/* PHOTO SLIDESHOW */}
                {photos.length > 0 && (
                    <View style={S.card}>
                        <View style={S.cardHeader}><Text style={{ fontSize: 20 }}>📸</Text><Text style={S.cardTitle}>Land Photos</Text><View style={S.countPill}><Text style={S.countPillText}>{safeSlide + 1} / {photos.length}</Text></View></View>
                        <View style={{ borderRadius: 16, overflow: 'hidden', height: 220, backgroundColor: '#0f172a' }}>
                            <Image source={{ uri: `${API_BASE_URL}${photos[safeSlide].url}` }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                            {photos.length > 1 && <View style={S.slideDots}>{photos.map((_, i) => <View key={i} style={[S.slideDot, i === safeSlide && S.slideDotActive]} />)}</View>}
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }} contentContainerStyle={{ gap: 8 }}>{photos.map((p, i) => <Pressable key={p.id} onPress={() => setFullImg(`${API_BASE_URL}${p.url}`)}><Image source={{ uri: `${API_BASE_URL}${p.url}` }} style={[S.thumb, i === safeSlide && S.thumbActive]} /></Pressable>)}</ScrollView>
                    </View>
                )}

                {/* DOCUMENTS */}
                {listing.documents && listing.documents.length > 0 && (
                    <View style={S.card}>
                        <View style={S.cardHeader}><Text style={{ fontSize: 20 }}>📄</Text><Text style={S.cardTitle}>Documents</Text><View style={S.countPill}><Text style={S.countPillText}>{listing.documents.length}</Text></View></View>
                        {listing.documents.map(d => <Pressable key={d.id} style={S.docRow} onPress={() => Linking.openURL(`${API_BASE_URL}${d.url}`).catch(() => { })}><View style={S.docIcon}><Text style={{ fontSize: 22 }}>📎</Text></View><View style={{ flex: 1 }}><Text style={S.docName}>{d.doc_type || 'Document'}</Text><Text style={S.docHint}>Tap to open</Text></View><Text style={{ color: '#94a3b8' }}>→</Text></Pressable>)}
                    </View>
                )}

                {/* AREA & LISTING */}
                <View style={S.card}>
                    <View style={S.cardHeader}><Text style={{ fontSize: 20 }}>📐</Text><Text style={S.cardTitle}>Area & Listing</Text></View>
                    <View style={S.statGrid}>
                        <StatBox emoji="🎯" label="Purpose" value={listing.listing_purpose} color="#6366f1" />
                        <StatBox emoji="📏" label="Acres" value={listing.area_acres?.toFixed(2) ?? "—"} color="#3b82f6" />
                        <StatBox emoji="📐" label="Hectares" value={listing.area_hectares?.toFixed(2) ?? "—"} color="#0ea5e9" />
                        {listing.expected_price && <StatBox emoji="💰" label="Price" value={`LKR ${listing.expected_price.toLocaleString()}`} color="#f59e0b" />}
                    </View>
                </View>

                {/* LAND DETAILS */}
                <View style={S.card}>
                    <View style={S.cardHeader}><Text style={{ fontSize: 20 }}>🌾</Text><Text style={S.cardTitle}>Land Details</Text></View>
                    <View style={{ gap: 8 }}>
                        <DetailRow emoji="🌱" label="Current Use" value={listing.current_land_use ?? "—"} />
                        <DetailRow emoji="🪨" label="Soil Type" value={listing.soil_type ?? "—"} />
                        <DetailRow emoji="💧" label="Water" value={listing.water_availability ?? "—"} />
                        <DetailRow emoji="🛣️" label="Road Access" value={listing.road_access ? "Yes ✅" : "No ❌"} />
                        <DetailRow emoji="⚡" label="Electricity" value={listing.electricity ? "Yes ✅" : "No ❌"} />
                    </View>
                    {listing.description && <View style={S.descBox}><Text style={S.descLabel}>📝 Description</Text><Text style={S.descText}>{listing.description}</Text></View>}
                </View>

                {/* ANALYTICS TOGGLE */}
                <Pressable style={S.analyticsToggle} onPress={toggleAnalytics}>
                    <View style={S.analyticsToggleInner}>
                        <Text style={{ fontSize: 28 }}>🔬</Text>
                        <View style={{ flex: 1 }}><Text style={S.atTitle}>Full Land Analytics</Text><Text style={S.atSub}>ML Prediction, Vegetation, Terrain, Crop Suitability, Intercropping</Text></View>
                        <View style={[S.toggleArrow, analyticsOpen && S.toggleArrowOpen]}><Text style={S.toggleArrowText}>{analyticsOpen ? '▲' : '▼'}</Text></View>
                    </View>
                </Pressable>

                {/* FULL ANALYTICS PANEL */}
                {analyticsOpen && analysisLoading && <View style={{ padding: 30, alignItems: 'center' }}><ActivityIndicator size="large" color="#3b82f6" /><Text style={{ color: '#64748b', marginTop: 10 }}>Running full land analysis...</Text></View>}
                {analyticsOpen && analysis && <FullAnalyticsPanel data={analysis} />}

                {/* OWNER */}
                <View style={[S.card, { borderLeftWidth: 5, borderLeftColor: '#3b82f6' }]}>
                    <View style={S.cardHeader}><Text style={{ fontSize: 20 }}>👤</Text><Text style={S.cardTitle}>Owner / Contact</Text></View>
                    <View style={S.ownerRow}>
                        <View style={S.ownerAvatar}><Text style={{ fontSize: 28 }}>👤</Text></View>
                        <View style={{ flex: 1 }}><Text style={S.ownerName}>{listing.owner_name}</Text><Text style={S.ownerPhone}>{listing.owner_phone}</Text>{listing.owner_email && <Text style={S.ownerEmail}>{listing.owner_email}</Text>}</View>
                    </View>
                    {listing.owner_address && <View style={S.addressRow}><Text>📍</Text><Text style={S.addressText}>{listing.owner_address}</Text></View>}
                    <View style={S.contactBtns}>
                        <Pressable style={[S.contactBtn, { backgroundColor: '#16a34a' }]} onPress={() => Linking.openURL(`tel:${listing.owner_phone}`)}><Text style={S.contactBtnText}>📞 Call</Text></Pressable>
                        {listing.owner_email && <Pressable style={[S.contactBtn, { backgroundColor: '#3b82f6' }]} onPress={() => Linking.openURL(`mailto:${listing.owner_email}`)}><Text style={S.contactBtnText}>✉️ Email</Text></Pressable>}
                    </View>
                </View>
            </ScrollView>

            <Modal visible={!!fullImg} transparent onRequestClose={() => setFullImg(null)}>
                <View style={S.modalBg}><Pressable style={StyleSheet.absoluteFill} onPress={() => setFullImg(null)} />{fullImg && <Image source={{ uri: fullImg }} style={S.modalImg} resizeMode="contain" />}<Pressable style={S.modalClose} onPress={() => setFullImg(null)}><Text style={S.modalCloseText}>✕</Text></Pressable></View>
            </Modal>
        </SafeAreaView>
    );
}

// ═══════ FULL ANALYTICS PANEL — 100% same as analytics page ═══════
function FullAnalyticsPanel({ data }: { data: AnalysisResp }) {
    const f = data.features ?? {};
    const stats = data.statistics ?? {};
    const ndviVal = getSafeValue(f.NDVI ?? stats.NDVI);
    const ndwiVal = getSafeValue(f.NDWI ?? stats.NDWI);
    const slopeVal = getSafeValue(f.SLOPE ?? stats.SLOPE);
    const elevVal = getSafeValue(f.ELEV ?? stats.ELEV);
    const aspectVal = getSafeValue(f.ASPECT ?? stats.ASPECT);
    const eviVal = getSafeValue(f.EVI ?? stats.EVI);
    const saviVal = getSafeValue(f.SAVI ?? stats.SAVI);
    const pred = data.prediction;
    const intel = data.intelligence ?? {};
    const spices = intel.spices ?? [];
    const goodPairs = intel.intercropping?.good_pairs ?? [];
    const avoidPairs = intel.intercropping?.avoid_pairs ?? [];
    const confidence = pred?.confidence ?? (pred?.probabilities ? Math.max(pred.probabilities.idle_land ?? 0, pred.probabilities.vegetation_land ?? 0, pred.probabilities.built_land ?? 0) : 0);
    const ndviC = classifyNDVI(ndviVal);
    const ndwiC = classifyNDWI(ndwiVal);
    const slopeC = slopeCheck(slopeVal);
    const elevC = elevCheck(elevVal);
    const aspectC = aspectExplain(aspectVal);
    const summary = makeFarmerSummary({ landLabel: pred?.label, ndvi: ndviVal, ndwi: ndwiVal, slope: slopeVal });

    return (
        <View style={{ gap: 16 }}>
            {/* MODEL PREDICTION */}
            <View style={[S.card, { borderLeftWidth: 6, borderLeftColor: landLabelColor(pred?.label) }]}>
                <View style={S.cardHeader}><Text style={{ fontSize: 20 }}>🤖</Text><Text style={S.cardTitle}>Model Prediction</Text><View style={S.confBadge}><Text style={S.confBadgeText}>Confidence</Text></View></View>
                <View style={[S.predChip, { backgroundColor: landLabelBg(pred?.label) }]}><Text style={[S.predChipText, { color: landLabelColor(pred?.label) }]}>{pred?.label ?? "UNKNOWN"}</Text></View>
                <View style={S.confRow}><Text style={S.confValue}>{((confidence) * 100).toFixed(0)}%</Text><View style={S.confBarBg}><View style={[S.confBarFill, { width: `${confidence * 100}%` as any, backgroundColor: confidence >= 0.75 ? "#16a34a" : confidence >= 0.6 ? "#ca8a04" : "#ef4444" }]} /></View></View>
                {pred?.probabilities && <Text style={S.smallGray}>🟢 Vegetation: {fmt(pred.probabilities.vegetation_land, 2)} | 🟤 Idle: {fmt(pred.probabilities.idle_land, 2)} | 🏠 Built: {fmt(pred.probabilities.built_land, 2)}</Text>}
                <Text style={S.descText}>The model identifies land type from satellite data. Higher confidence = more reliable.</Text>
            </View>

            {/* VEGETATION & WATER */}
            <View style={[S.card, { borderLeftWidth: 6, borderLeftColor: "#2563eb" }]}>
                <Text style={S.cardTitleBig}>🌱 Vegetation & Water Health</Text>
                <IndexBlock name="NDVI (Greenness)" value={ndviVal} tone={ndviC.tone} title={ndviC.title} explain={ndviC.explain} tip={ndviC.tip} info="NDVI (Normalized Difference Vegetation Index) measures how green and healthy vegetation is. Values range from -1 to +1. Higher values (>0.6) = dense healthy plants." />
                <View style={S.divider} />
                <IndexBlock name="NDWI (Soil Moisture)" value={ndwiVal} tone={ndwiC.tone} title={ndwiC.title} explain={ndwiC.explain} tip={ndwiC.tip} info="NDWI (Normalized Difference Water Index) detects water content in vegetation and soil. Positive values = moist conditions. Negative = dry soil." />
                <View style={S.divider} />
                <IndexBlock name="EVI (Enhanced Vegetation)" value={eviVal} tone={classifyEVI(eviVal).tone} title={classifyEVI(eviVal).title} explain={classifyEVI(eviVal).explain} tip={classifyEVI(eviVal).tip} info="EVI (Enhanced Vegetation Index) corrects for atmospheric and soil effects. More sensitive in dense canopy areas. Higher values = denser plant canopy." />
                <View style={S.divider} />
                <IndexBlock name="SAVI (Soil-Adjusted)" value={saviVal} tone={classifySAVI(saviVal).tone} title={classifySAVI(saviVal).title} explain={classifySAVI(saviVal).explain} tip={classifySAVI(saviVal).tip} info="SAVI (Soil-Adjusted Vegetation Index) minimizes the effect of exposed soil. Low values indicate bare soil dominating the area." />
            </View>

            {/* TERRAIN */}
            <View style={[S.card, { borderLeftWidth: 6, borderLeftColor: "#ca8a04" }]}>
                <Text style={S.cardTitleBig}>⛰️ Terrain Assessment</Text>
                <TerrainRow name="Elevation" value={elevVal} unit="m" status={elevC.status} tone={elevC.tone} why={elevC.why} info="Elevation is the height above sea level. It affects temperature and which crops can grow. Lower elevations (<1200m) suit most spice crops." />
                <View style={S.divider} />
                <TerrainRow name="Slope" value={slopeVal} unit="°" status={slopeC.status} tone={slopeC.tone} why={slopeC.why} tip={slopeC.tip} info="Slope measures how steep the land is. Flat land (0-8°) is easiest to farm. Steep slopes (>20°) are difficult for crops." />
                <View style={S.divider} />
                <TerrainRow name="Aspect" value={aspectVal} unit="°" status={aspectC.status} tone={aspectC.tone} why={aspectC.why} tip={aspectC.tip} info="Aspect is the compass direction a slope faces (0°=North, 180°=South). South/West slopes are hotter, North/East slopes are cooler and wetter." />
            </View>

            {/* SPICE SUITABILITY — EXACT SAME AS ANALYTICS PAGE */}
            <View style={[S.card, { borderLeftWidth: 6, borderLeftColor: "#ea580c" }]}>
                <Text style={S.cardTitleBig}>🌶️ Spice Suitability</Text>
                <Text style={S.cardDesc}>Scores (0–100) based on vegetation, moisture, terrain & land class.</Text>
                {spices.map(sp => <SpiceCard key={sp.name} sp={sp} ndvi={ndviVal} ndwi={ndwiVal} slope={slopeVal} landLabel={pred?.label} />)}
                {spices.length === 0 && <Text style={S.emptyText}>No spice data available</Text>}
            </View>

            {/* INTERCROPPING */}
            <View style={[S.card, { borderLeftWidth: 6, borderLeftColor: "#14532d" }]}>
                <Text style={S.cardTitleBig}>🌾 Intercropping Recommendations</Text>
                {goodPairs.length > 0 && <><Text style={S.pairSub}>✅ Can Grow Together</Text>{goodPairs.map((p, i) => <PairRow key={`g${i}`} pair={p} />)}</>}
                {avoidPairs.length > 0 && <><Text style={[S.pairSub, { marginTop: 12 }]}>⚠️ Avoid Together</Text>{avoidPairs.map((p, i) => <PairRow key={`a${i}`} pair={p} isWarning />)}</>}
                {goodPairs.length === 0 && avoidPairs.length === 0 && <Text style={S.emptyText}>No intercropping pairs detected.</Text>}
            </View>

            {/* FARMER SUMMARY */}
            <View style={[S.card, { borderLeftWidth: 6, borderLeftColor: "#16a34a" }]}>
                <Text style={S.cardTitleBig}>👨‍🌾 Farmer-Friendly Summary</Text>
                <Text style={S.summaryHeadline}>{summary.headline}</Text>
                {summary.bullets.map((b, i) => <Text key={i} style={S.bulletPoint}>• {b}</Text>)}
                <Text style={S.summaryTip}>💡 Tip: Good farming areas have <Text style={{ fontWeight: '900' }}>healthy vegetation</Text>, <Text style={{ fontWeight: '900' }}>adequate moisture</Text>, and <Text style={{ fontWeight: '900' }}>gentle slopes</Text>.</Text>
            </View>
        </View>
    );
}

// ═══════ SUB-COMPONENTS (exact analytics page replicas) ═══════
function StatBox({ emoji, label, value, color }: { emoji: string; label: string; value: string; color: string }) {
    return <View style={[{ backgroundColor: "#f8fafc", borderRadius: 14, padding: 14, borderLeftWidth: 4, borderLeftColor: color, width: '48%', marginBottom: 10 }]}><Text style={{ fontSize: 18 }}>{emoji}</Text><Text style={{ fontSize: 15, fontWeight: "900", color, marginTop: 4 }}>{value}</Text><Text style={{ fontSize: 11, color: "#94a3b8", fontWeight: "600", marginTop: 2 }}>{label}</Text></View>;
}
function DetailRow({ emoji, label, value }: { emoji: string; label: string; value: string }) {
    return <View style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#f8fafc", borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12 }}><Text style={{ fontSize: 16 }}>{emoji}</Text><View style={{ flex: 1 }}><Text style={{ fontSize: 11, color: "#94a3b8", fontWeight: "600" }}>{label}</Text><Text style={{ fontSize: 14, color: "#1e293b", fontWeight: "700", marginTop: 1 }}>{value}</Text></View></View>;
}
function InfoBubble({ text }: { text: string }) {
    return <Pressable onPress={() => Alert.alert("ℹ️ What is this?", text, [{ text: "Got it" }])} style={S.infoBubble}><Text style={S.infoBubbleText}>❓</Text></Pressable>;
}
function IndexBlock({ name, value, tone, title, explain, tip, info }: { name: string; value?: number; tone: LevelTone; title: string; explain: string; tip: string; info?: string }) {
    const color = toneColor(tone); const fill = typeof value === 'number' ? normIndex(value) : 0;
    return <View style={{ marginBottom: 4 }}><View style={S.indexHeader}><View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 6 }}><Text style={S.metricLabel}>{name}</Text>{info && <InfoBubble text={info} />}</View><Text style={[S.metricValue, { color }]}>{fmt(value, 3)}</Text></View><View style={S.barBg}><View style={[S.barFill, { flex: fill, backgroundColor: color }]} /><View style={{ flex: 1 - fill, backgroundColor: '#e5e7eb' }} /></View><Text style={[S.statusTitle, { color, marginTop: 8 }]}>{title}</Text><Text style={S.explainText}>{explain}</Text>{tip ? <Text style={S.tipText}>💡 {tip}</Text> : null}</View>;
}
function TerrainRow({ name, value, unit, status, tone, why, tip, info }: { name: string; value?: number; unit: string; status: string; tone: LevelTone; why: string; tip?: string; info?: string }) {
    const color = toneColor(tone);
    return <View style={{ marginBottom: 4 }}><View style={S.indexHeader}><View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 6 }}><Text style={S.metricLabel}>{name}</Text>{info && <InfoBubble text={info} />}</View><Text style={[S.metricValue, { color }]}>{fmt(value, 2)} {unit}</Text></View><View style={[S.statusChip, { backgroundColor: toneBg(tone) }]}><Text style={[S.statusChipText, { color }]}>{status} — {why}</Text></View>{tip ? <Text style={S.tipText}>💡 {tip}</Text> : null}</View>;
}
function SpiceCard({ sp, ndvi, ndwi, slope, landLabel }: { sp: any; ndvi?: number; ndwi?: number; slope?: number; landLabel?: string }) {
    const [showAfter, setShowAfter] = useState(false);
    const score = Math.max(0, Math.min(100, sp.score ?? 0));
    const baseColor = sp.label === "Good" ? "#16a34a" : sp.label === "Moderate" ? "#ca8a04" : sp.label === "Poor" ? "#ea580c" : "#dc2626";
    const seg = scoreBarSegments({ score, ndvi, ndwi });
    const rec = recommendedSteps({ spiceName: sp.name, ndvi, ndwi, slope, landLabel });
    const backendProj = typeof sp.improvement?.projected_score === "number" ? Math.max(0, Math.min(100, Math.round(sp.improvement.projected_score))) : null;
    const uiBoosted = Math.max(0, Math.min(100, Math.round(score + rec.boostScore)));
    const projected = backendProj ?? uiBoosted;
    const improvementSteps = sp.improvement?.steps?.length > 0 ? sp.improvement.steps : rec.steps;
    const showBoost = improvementSteps.length > 0 && projected > score;
    const afterColor = colorForScore75(projected);
    const confText = showBoost && projected >= 75 ? `✅ With these steps, you can grow ${sp.name} confidently (up to ~${projected}/100).` : showBoost ? `⚠️ With these steps, suitability can improve (up to ~${projected}/100).` : score >= 75 ? `✅ This land already looks good for ${sp.name}.` : `ℹ️ Manage the land to improve results.`;

    return (
        <View style={[S.spiceCard, { borderLeftColor: baseColor }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}><Text style={{ fontSize: 16, fontWeight: '900', color: '#0f172a', flex: 1 }}>{sp.name}</Text><View style={[S.labelPill, { backgroundColor: baseColor + "22" }]}><Text style={[S.labelPillText, { color: baseColor }]}>{sp.label}</Text></View></View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 10 }}><Text style={{ fontSize: 24, fontWeight: '900' }}>{Math.round(score)}</Text><Text style={{ fontSize: 12, fontWeight: '800', color: '#64748b' }}>/100</Text>{typeof sp.confidence === "number" && <Text style={{ fontSize: 11, fontWeight: '800', color: '#64748b', marginLeft: 'auto' }}>Conf. {fmt(sp.confidence, 2)}</Text>}</View>
            <View style={{ marginVertical: 8 }}><View style={S.barBackground}><View style={{ flexDirection: 'row', width: '100%', height: '100%' }}>{seg.left > 0 && <View style={{ flex: seg.left / 100, backgroundColor: '#ef4444' }} />}{seg.mid > 0 && <View style={{ flex: seg.mid / 100, backgroundColor: baseColor }} />}{seg.right > 0 && <View style={{ flex: seg.right / 100, backgroundColor: '#16a34a' }} />}<View style={{ flex: (100 - score) / 100, backgroundColor: '#e5e7eb' }} /></View></View></View>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569', marginTop: 8 }}><Text style={{ fontWeight: '900' }}>Color meaning:</Text> Red = limiting, Current color = suitability, Green = strong base</Text>
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#64748b', marginTop: 8 }}>{seg.note}</Text>
            {(sp.reasons ?? []).length > 0 && <View style={{ marginTop: 10 }}>{(sp.reasons ?? []).slice(0, 3).map((r: string, i: number) => <Text key={i} style={{ fontSize: 12, fontWeight: '700', color: '#475569', lineHeight: 17, marginBottom: 4 }}>• {r}</Text>)}</View>}
            {showBoost ? (
                <View style={{ marginTop: 12 }}>
                    <Pressable style={S.toggleBtn} onPress={() => setShowAfter(v => !v)}>
                        <Text style={S.toggleBtnText}>{showAfter ? "Hide after improvement ▲" : "Show after improvement ▼"}</Text>
                    </Pressable>
                    {showAfter && (
                        <View style={{ marginTop: 12 }}>
                            <Text style={{ fontSize: 13, fontWeight: '800', color: '#475569', marginBottom: 8 }}>After improvement: <Text style={{ color: afterColor, fontWeight: '900' }}>{projected}/100 {projected >= 75 ? "✅" : ""}</Text></Text>
                            <View style={{ marginVertical: 8 }}><View style={S.barBackground}><View style={{ flexDirection: 'row', width: '100%', height: '100%' }}><View style={{ flex: projected / 100, backgroundColor: afterColor }} /><View style={{ flex: 1 - projected / 100, backgroundColor: '#e5e7eb' }} /></View></View></View>
                            <View style={S.recBox}>
                                <Text style={S.recTitle}>🧑‍🌾 Recommendation</Text>
                                <Text style={S.recHeadline}>{confText}</Text>
                                {improvementSteps.length > 0 && <View style={{ marginTop: 10 }}>{improvementSteps.slice(0, 6).map((t: string, i: number) => <Text key={i} style={S.recStep}>• {t}</Text>)}</View>}
                            </View>
                        </View>
                    )}
                </View>
            ) : (
                <View style={S.recBox}>
                    <Text style={S.recTitle}>🧑‍🌾 Recommendation</Text>
                    <Text style={S.recHeadline}>{confText}</Text>
                </View>
            )}
        </View>
    );
}
function PairRow({ pair, isWarning }: { pair: Pair; isWarning?: boolean }) {
    return <View style={[S.pairRow, isWarning && S.pairRowWarn]}><Text style={S.pairTitle}>{pair.a} + {pair.b}</Text><Text style={S.pairWhy}>{pair.why}</Text></View>;
}

// ═══════ STYLES ═══════
const S = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f0f4f8" },
    centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
    loadingText: { color: "#64748b", fontSize: 14 },
    errorText: { color: "#ef4444", fontSize: 15, textAlign: "center", paddingHorizontal: 24, fontWeight: "600" },
    goBackBtn: { backgroundColor: "#3b82f6", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
    goBackBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
    header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e2e8f0", gap: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
    headerBack: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
    headerBackText: { fontSize: 22, color: "#3b82f6", fontWeight: '700' },
    headerTitle: { fontSize: 16, fontWeight: "900", color: "#0f172a" },
    headerCode: { fontSize: 11, color: "#94a3b8", marginTop: 1, fontWeight: '600' },
    headerBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
    headerBadgeText: { fontSize: 11, fontWeight: "800" },
    scroll: { padding: 16, paddingBottom: 50, gap: 16 },
    mapBox: { height: 200, borderRadius: 22, overflow: "hidden", borderWidth: 1, borderColor: "#cbd5e1" },
    map: { flex: 1 },
    card: { backgroundColor: "#fff", borderRadius: 22, padding: 18, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
    cardHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },
    cardTitle: { fontSize: 16, fontWeight: "900", color: "#0f172a", flex: 1 },
    cardTitleBig: { fontSize: 17, fontWeight: "900", color: "#0f172a", marginBottom: 16 },
    cardDesc: { fontSize: 13, color: "#64748b", marginBottom: 14, lineHeight: 18 },
    countPill: { backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    countPillText: { fontSize: 12, fontWeight: '800', color: '#64748b' },
    slideDots: { position: 'absolute', bottom: 10, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 5 },
    slideDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.4)' },
    slideDotActive: { width: 22, backgroundColor: '#3b82f6' },
    thumb: { width: 60, height: 60, borderRadius: 10, backgroundColor: '#e2e8f0' },
    thumbActive: { borderWidth: 2, borderColor: '#3b82f6' },
    docRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#f8fafc", padding: 14, borderRadius: 14, marginBottom: 8, borderWidth: 1, borderColor: "#e2e8f0", gap: 12 },
    docIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#eff6ff", alignItems: "center", justifyContent: "center" },
    docName: { fontSize: 14, color: "#0f172a", fontWeight: "700" },
    docHint: { fontSize: 11, color: "#94a3b8", fontWeight: "500", marginTop: 2 },
    statGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
    descBox: { backgroundColor: "#f8fafc", borderRadius: 12, padding: 14, marginTop: 12, borderLeftWidth: 4, borderLeftColor: "#e2e8f0" },
    descLabel: { fontSize: 12, fontWeight: "700", color: "#64748b", marginBottom: 6 },
    descText: { fontSize: 13, color: "#475569", lineHeight: 20, marginTop: 8 },
    analyticsToggle: { backgroundColor: '#1e293b', borderRadius: 22, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, elevation: 5 },
    analyticsToggleInner: { flexDirection: 'row', alignItems: 'center', padding: 18, gap: 14 },
    atTitle: { fontSize: 17, fontWeight: '900', color: '#f8fafc' },
    atSub: { fontSize: 11, color: '#94a3b8', fontWeight: '500', marginTop: 2 },
    toggleArrow: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#334155', alignItems: 'center', justifyContent: 'center' },
    toggleArrowOpen: { backgroundColor: '#3b82f6' },
    toggleArrowText: { color: '#fff', fontSize: 14, fontWeight: '800' },
    predChip: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 14, marginBottom: 12, alignSelf: 'flex-start' },
    predChipText: { fontSize: 16, fontWeight: '900' },
    confBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    confBadgeText: { fontSize: 11, fontWeight: '700', color: '#64748b' },
    confRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
    confValue: { fontSize: 22, fontWeight: '900', color: '#0f172a', minWidth: 42 },
    confBarBg: { flex: 1, height: 12, backgroundColor: '#e5e7eb', borderRadius: 999, overflow: 'hidden' },
    confBarFill: { height: '100%', borderRadius: 999 },
    smallGray: { fontSize: 12, color: '#64748b', marginBottom: 4, lineHeight: 18 },
    indexHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 12 },
    metricLabel: { fontSize: 14, fontWeight: '800', color: '#1e293b', flex: 1 },
    metricValue: { fontSize: 18, fontWeight: '900', color: '#0f172a', minWidth: 45, textAlign: 'right' },
    barBg: { height: 12, borderRadius: 6, flexDirection: 'row', overflow: 'hidden', marginBottom: 4 },
    barFill: { height: '100%' },
    barBackground: { height: 12, backgroundColor: '#e5e7eb', borderRadius: 999, overflow: 'hidden' },
    statusTitle: { fontSize: 14, fontWeight: '900' },
    statusChip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, marginTop: 8 },
    statusChipText: { fontSize: 12, fontWeight: '800', lineHeight: 17 },
    explainText: { fontSize: 12, fontWeight: '700', color: '#475569', marginTop: 6, lineHeight: 17 },
    tipText: { fontSize: 12, fontWeight: '800', color: '#a16207', marginTop: 6, lineHeight: 17 },
    hintText: { fontSize: 11, fontWeight: '700', color: '#64748b', marginTop: 4 },
    divider: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 14 },
    spiceCard: { backgroundColor: "#f8f9fa", borderRadius: 18, padding: 14, marginBottom: 12, borderLeftWidth: 5 },
    labelPill: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999 },
    labelPillText: { fontSize: 11, fontWeight: '900' },
    toggleBtn: { backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
    toggleBtnText: { fontWeight: '900', color: '#0f172a', fontSize: 13 },
    recBox: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 14, padding: 12, marginTop: 12 },
    recTitle: { fontSize: 13, fontWeight: '900', color: '#14532d' },
    recHeadline: { fontSize: 13, fontWeight: '900', color: '#14532d', marginTop: 6, lineHeight: 18 },
    recStep: { fontSize: 12, fontWeight: '800', color: '#14532d', lineHeight: 17, marginTop: 6 },
    pairSub: { fontSize: 13, fontWeight: '900', color: '#0f172a', marginBottom: 8 },
    pairRow: { paddingVertical: 10, paddingHorizontal: 12, backgroundColor: '#f0fdf4', borderRadius: 12, borderLeftWidth: 4, borderLeftColor: '#16a34a', marginBottom: 8 },
    pairRowWarn: { backgroundColor: '#fef3c7', borderLeftColor: '#ca8a04' },
    pairTitle: { fontSize: 13, fontWeight: '900', color: '#0f172a' },
    pairWhy: { fontSize: 12, fontWeight: '700', color: '#64748b', marginTop: 4, lineHeight: 16 },
    emptyText: { fontSize: 13, fontWeight: '700', color: '#94a3b8', textAlign: 'center', paddingVertical: 16, fontStyle: 'italic' },
    summaryHeadline: { fontSize: 16, fontWeight: '900', color: '#065f46', marginTop: 10, marginBottom: 10, lineHeight: 22 },
    bulletPoint: { fontSize: 13, fontWeight: '700', color: '#374151', lineHeight: 19, marginBottom: 6 },
    summaryTip: { fontSize: 12, fontWeight: '700', color: '#16a34a', marginTop: 12, lineHeight: 17 },
    ownerRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 12 },
    ownerAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#eff6ff", alignItems: "center", justifyContent: "center" },
    ownerName: { fontSize: 17, fontWeight: "800", color: "#0f172a" },
    ownerPhone: { fontSize: 14, color: "#3b82f6", fontWeight: "600", marginTop: 2 },
    ownerEmail: { fontSize: 12, color: "#64748b", fontWeight: "500", marginTop: 1 },
    addressRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "#f8fafc", padding: 12, borderRadius: 12, marginBottom: 12 },
    addressText: { fontSize: 13, color: "#475569", flex: 1 },
    contactBtns: { flexDirection: "row", gap: 10 },
    contactBtn: { flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: "center" },
    contactBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
    modalBg: { flex: 1, backgroundColor: "rgba(15,23,42,0.95)", justifyContent: "center", alignItems: "center" },
    modalImg: { width: "100%", height: "80%" },
    modalClose: { position: "absolute", top: 50, right: 20, width: 44, height: 44, backgroundColor: "#fff", borderRadius: 22, alignItems: "center", justifyContent: "center" },
    modalCloseText: { color: "#1e293b", fontSize: 22, fontWeight: "700" },
    infoBubble: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#e0e7ff", alignItems: "center", justifyContent: "center" },
    infoBubbleText: { fontSize: 12 },
});
