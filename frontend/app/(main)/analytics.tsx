import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Platform,
  Alert
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets, SafeAreaView } from "react-native-safe-area-context";
import { API_BASE_URL } from "../../src/config";

// ==================== TYPE DEFINITIONS ====================
type Pair = { a: string; b: string; why: string };

type Statistics = {
  mean?: number;
  min?: number;
  max?: number;
  std?: number;
};

type Resp = {
  ok: boolean;
  inside_aoi?: boolean;
  lat?: number;
  lng?: number;
  area_hectares?: number;
  area_acres?: number;
  pixel_count?: number;
  polygon?: number[][];
  features?: Record<string, number>;
  statistics?: Record<string, Statistics>;
  interpretations?: Record<string, { level?: string; meaning?: string }>;
  prediction?: {
    prediction: number;
    label: string;
    probabilities?: {
      idle_land: number;
      vegetation_land: number;
      built_land: number;
    };
    confidence?: number;
  };
  intelligence?: {
    spices?: Array<{
      name: string;
      score: number;
      label: string;
      confidence?: number;
      reasons?: string[];
      tips?: string[];
      improvement?: {
        projected_score?: number;
        projected_good_75?: boolean;
        steps?: string[];
      };
    }>;
    intercropping?: {
      good_pairs?: Pair[];
      avoid_pairs?: Pair[];
      notes?: string[];
    };
    health?: { headline?: string; tags?: string[] };
  };
  composition?: {
    vegetation_pct?: number;
    idle_pct?: number;
    built_pct?: number;
  };
};

// ==================== UTILITY FUNCTIONS ====================
function fmt(n?: number, d = 3) {
  if (typeof n !== "number" || Number.isNaN(n)) return "-";
  return n.toFixed(d);
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const normIndex = (v: number) => clamp01((v + 1) / 2);

function getSafeValue(stat: Statistics | number | undefined): number | undefined {
  if (typeof stat === "number") return stat;
  if (stat && typeof stat === "object" && "mean" in stat) return stat.mean;
  return undefined;
}

function safeParseJson(json?: string): Resp | null {
  if (!json) {
    console.warn("⚠️ safeParseJson: no JSON provided");
    return null;
  }
  try {
    const parsed = JSON.parse(json);
    console.log("✅ Successfully parsed JSON:", {
      ok: parsed.ok,
      area: parsed.area_hectares,
      pixels: parsed.pixel_count,
      prediction: parsed.prediction?.label,
      spices: parsed.intelligence?.spices?.length
    });
    return parsed;
  } catch (e) {
    console.error("❌ JSON parse error:", e);
    console.error("Raw JSON was:", json?.substring(0, 200));
    return null;
  }
}

function landLabelColor(label?: string) {
  switch (label) {
    case "VEGETATION_LAND":
      return "#16a34a";
    case "IDLE_LAND":
      return "#ca8a04";
    case "BUILT_LAND":
      return "#ef4444";
    default:
      return "#111827";
  }
}

function landLabelBgColor(label?: string) {
  switch (label) {
    case "VEGETATION_LAND":
      return "#dcfce7";
    case "IDLE_LAND":
      return "#fef3c7";
    case "BUILT_LAND":
      return "#fee2e2";
    default:
      return "#f3f4f6";
  }
}

type LevelTone = "good" | "moderate" | "bad" | "neutral";

function toneColor(t: LevelTone) {
  switch (t) {
    case "good":
      return "#16a34a";
    case "moderate":
      return "#ca8a04";
    case "bad":
      return "#ef4444";
    default:
      return "#64748b";
  }
}

function toneBgColor(t: LevelTone) {
  switch (t) {
    case "good":
      return "#dcfce7";
    case "moderate":
      return "#fef3c7";
    case "bad":
      return "#fee2e2";
    default:
      return "#f1f5f9";
  }
}

function classifyNDVI(ndvi?: number): {
  title: string;
  tone: LevelTone;
  explain: string;
  farmerTip: string;
} {
  if (typeof ndvi !== "number" || Number.isNaN(ndvi)) {
    return {
      title: "Unknown vegetation",
      tone: "neutral",
      explain: "NDVI value is missing.",
      farmerTip: "Try another point inside the AOI."
    };
  }

  if (ndvi >= 0.6) {
    return {
      title: "Good vegetation (healthy green cover)",
      tone: "good",
      explain:
        "High NDVI means the land has strong plant growth (good leaves/green).",
      farmerTip:
        "Good for spices and crops. Keep moisture and nutrients stable."
    };
  }
  if (ndvi >= 0.3) {
    return {
      title: "Moderate vegetation (patchy / mixed)",
      tone: "moderate",
      explain:
        "Medium NDVI means some plants exist, but the cover is not dense everywhere.",
      farmerTip:
        "Good with management: add compost, improve irrigation/mulch, reduce weeds."
    };
  }
  return {
    title: "Low vegetation (bare soil / weak plants)",
    tone: "bad",
    explain:
      "Low NDVI means little green growth. It may be bare soil, stressed crops, or built surfaces.",
    farmerTip:
      "Before planting: clear weeds, add organic matter, check water access."
  };
}

function classifyNDWI(ndwi?: number): {
  title: string;
  tone: LevelTone;
  explain: string;
  farmerTip: string;
} {
  if (typeof ndwi !== "number" || Number.isNaN(ndwi)) {
    return {
      title: "Unknown moisture",
      tone: "neutral",
      explain: "NDWI value is missing.",
      farmerTip: "Try another point inside the AOI."
    };
  }

  if (ndwi >= 0.15) {
    return {
      title: "Wet / high moisture",
      tone: "good",
      explain:
        "Higher NDWI usually means more water/moisture around vegetation or surface.",
      farmerTip:
        "Good for moisture-loving crops. Avoid waterlogging; ensure drainage."
    };
  }
  if (ndwi >= 0.0) {
    return {
      title: "Moderate moisture",
      tone: "moderate",
      explain: "NDWI near zero means moisture is present but not strong.",
      farmerTip: "Mulch and occasional irrigation can keep moisture stable."
    };
  }
  return {
    title: "Dry land / low moisture",
    tone: "bad",
    explain:
      "Negative NDWI usually means dry soil / low moisture (often bare or built surfaces).",
    farmerTip:
      "Use mulch + shade + drip irrigation if possible. Improve soil organic matter."
  };
}

function classifyEVI(evi?: number): {
  title: string;
  tone: LevelTone;
  explain: string;
  farmerTip: string;
} {
  if (typeof evi !== "number" || Number.isNaN(evi)) {
    return { title: "Unknown", tone: "neutral", explain: "EVI not available.", farmerTip: "" };
  }
  if (evi >= 0.5) {
    return {
      title: "Dense, healthy canopy",
      tone: "good",
      explain: "High EVI means dense, actively photosynthesizing plant cover with strong canopy.",
      farmerTip: "Excellent for shade-loving spices. Maintain canopy health."
    };
  }
  if (evi >= 0.2) {
    return {
      title: "Moderate canopy cover",
      tone: "moderate",
      explain: "Medium EVI indicates partial canopy — some vegetation but not dense.",
      farmerTip: "Plant more cover crops or shade trees to improve canopy density."
    };
  }
  return {
    title: "Sparse / bare vegetation",
    tone: "bad",
    explain: "Low EVI means very little active plant canopy — likely bare soil or stressed vegetation.",
    farmerTip: "Add organic matter and establish ground cover before planting crops."
  };
}

function classifySAVI(savi?: number): {
  title: string;
  tone: LevelTone;
  explain: string;
  farmerTip: string;
} {
  if (typeof savi !== "number" || Number.isNaN(savi)) {
    return { title: "Unknown", tone: "neutral", explain: "SAVI not available.", farmerTip: "" };
  }
  if (savi >= 0.5) {
    return {
      title: "Good soil-adjusted greenness",
      tone: "good",
      explain: "High SAVI means good vegetation even after accounting for exposed soil brightness.",
      farmerTip: "Soil and vegetation balance is healthy. Maintain with mulch."
    };
  }
  if (savi >= 0.2) {
    return {
      title: "Moderate soil-vegetation mix",
      tone: "moderate",
      explain: "Medium SAVI — some bare soil is visible between plants.",
      farmerTip: "Add ground cover crops or mulch to protect exposed soil."
    };
  }
  return {
    title: "Exposed soil dominates",
    tone: "bad",
    explain: "Low SAVI means mostly bare/exposed soil with very little plant cover.",
    farmerTip: "Apply compost, establish cover crops, and reduce soil exposure."
  };
}

function slopeCheck(slope?: number): {
  status: "OK" | "Not OK" | "Unknown";
  tone: LevelTone;
  why: string;
  farmerTip: string;
} {
  if (typeof slope !== "number" || Number.isNaN(slope)) {
    return {
      status: "Unknown",
      tone: "neutral",
      why: "Slope value not available.",
      farmerTip: "Try another point or ensure feature raster has slope band."
    };
  }
  if (slope <= 8) {
    return {
      status: "OK",
      tone: "good",
      why: "Low slope → easier farming and lower erosion risk.",
      farmerTip: "Normal planting is fine."
    };
  }
  if (slope <= 20) {
    return {
      status: "OK",
      tone: "moderate",
      why: "Moderate slope → erosion can happen in heavy rain.",
      farmerTip: "Use contour planting, mulch, and drainage lines."
    };
  }
  return {
    status: "Not OK",
    tone: "bad",
    why: "High slope → strong erosion risk and difficult field operations.",
    farmerTip: "Avoid heavy cultivation; use terraces/contours + ground cover."
  };
}

function elevationCheck(elev?: number): {
  status: "OK" | "Not OK" | "Unknown";
  tone: LevelTone;
  why: string;
} {
  if (typeof elev !== "number" || Number.isNaN(elev)) {
    return { status: "Unknown", tone: "neutral", why: "Elevation not available." };
  }

  if (elev < 1200) {
    return {
      status: "OK",
      tone: "good",
      why: "Elevation is suitable for most lowland/midland spice crops."
    };
  }
  return {
    status: "OK",
    tone: "moderate",
    why: "Higher elevation may change temperature; choose crop varieties carefully."
  };
}

function aspectExplain(aspect?: number): {
  status: string;
  tone: LevelTone;
  why: string;
  farmerTip: string;
} {
  if (typeof aspect !== "number" || Number.isNaN(aspect)) {
    return { status: "Unknown", tone: "neutral", why: "Aspect not available.", farmerTip: "" };
  }
  // Determine cardinal direction
  let dir = "North";
  if (aspect >= 45 && aspect < 135) dir = "East";
  else if (aspect >= 135 && aspect < 225) dir = "South";
  else if (aspect >= 225 && aspect < 315) dir = "West";

  const isSunny = dir === "South" || dir === "West";
  return {
    status: `${dir}-facing`,
    tone: isSunny ? "moderate" : "good",
    why: `This slope faces ${dir} (${aspect.toFixed(0)}°). ${isSunny ? "South/West slopes get more sun and can be hotter and drier." : "North/East slopes tend to be cooler and retain more moisture."}`,
    farmerTip: isSunny
      ? "Consider shade trees and extra irrigation for sun-sensitive crops."
      : "Good for moisture-loving crops. Less sun stress on plants."
  };
}

function makeFarmerSummary(args: {
  landLabel?: string;
  ndvi?: number;
  ndwi?: number;
  slope?: number;
}): { headline: string; bullets: string[] } {
  const ndviC = classifyNDVI(args.ndvi);
  const ndwiC = classifyNDWI(args.ndwi);
  const slC = slopeCheck(args.slope);

  const land = args.landLabel ?? "UNKNOWN";

  const bullets: string[] = [];
  bullets.push(`Vegetation: ${ndviC.title}`);
  bullets.push(`Moisture: ${ndwiC.title}`);
  bullets.push(`Slope: ${slC.status} (${slC.why})`);

  let headline = "This land has mixed signals.";
  if (land === "BUILT_LAND") {
    headline =
      "This place looks built-up. Farming potential is very limited here.";
  } else if (ndviC.tone === "good" && ndwiC.tone !== "bad" && slC.tone !== "bad") {
    headline =
      "Good conditions for farming: healthy vegetation, moisture is acceptable, and terrain is manageable.";
  } else if (ndwiC.tone === "bad") {
    headline =
      "Plants may struggle here because the land looks dry. Moisture management is important.";
  } else if (ndviC.tone === "bad") {
    headline =
      "Vegetation is weak here. Soil improvement and land preparation are needed before planting.";
  } else if (slC.tone === "bad") {
    headline =
      "Slope is steep here. Erosion control is required, and some crops may not be suitable.";
  }

  return { headline, bullets };
}

function recommendedStepsForSpice(args: {
  spiceName: string;
  ndvi?: number;
  ndwi?: number;
  slope?: number;
  landLabel?: string;
}): { steps: string[]; canBeConfident: boolean; boostScore: number } {
  const steps: string[] = [];
  const ndvi = args.ndvi;
  const ndwi = args.ndwi;
  const slope = args.slope;

  let boost = 0;

  if (typeof ndwi === "number" && !Number.isNaN(ndwi) && ndwi < 0) {
    steps.push("💧 Use mulch (leaves/straw) to keep soil moisture.");
    steps.push("🌳 Add shade trees / support plants to reduce drying.");
    steps.push("🚿 Use drip irrigation in dry season if possible.");
    boost += args.spiceName === "Cinnamon" ? 14
      : args.spiceName === "Pepper" || args.spiceName === "Cardamom" || args.spiceName === "Nutmeg" ? 12
        : 10;
  }

  // Nutmeg-specific: even marginal moisture (ndwi < 0.05) warrants a canopy tip
  if (
    args.spiceName === "Nutmeg" &&
    typeof ndwi === "number" &&
    !Number.isNaN(ndwi) &&
    ndwi < 0.05
  ) {
    steps.push("🌿 Nutmeg needs consistent humidity — establish dense canopy cover and windbreaks.");
  }

  if (typeof ndvi === "number" && !Number.isNaN(ndvi) && ndvi < 0.6) {
    steps.push("🌿 Add compost/manure and remove weeds to improve plant cover.");
    boost += 8;
  }

  if (typeof slope === "number" && !Number.isNaN(slope) && slope > 20) {
    steps.push("⛰️ Use contour planting/terraces to reduce erosion.");
    boost -= 6;
  } else if (typeof slope === "number" && !Number.isNaN(slope) && slope > 8) {
    steps.push("🧱 Use contour lines + mulch to reduce erosion in rains.");
    boost -= 2;
  }

  if (args.landLabel === "BUILT_LAND") {
    steps.unshift("🏠 Built-up area is high — focus only on green pockets.");
    boost -= 20;
  }

  const canConfident = boost >= 10;

  return { steps: steps.slice(0, 5), canBeConfident: canConfident, boostScore: boost };
}

function scoreBarSegments(args: {
  score: number;
  ndvi?: number;
  ndwi?: number;
}): { left: number; mid: number; right: number; note: string } {
  const score = Math.max(0, Math.min(100, args.score));

  let left = 0;
  let mid = score;
  let right = 0;
  let note = "Balanced suitability signals.";

  if (typeof args.ndwi === "number" && !Number.isNaN(args.ndwi) && args.ndwi < 0) {
    const penaltyChunk = Math.min(30, Math.max(12, Math.round(score * 0.25)));
    left = penaltyChunk;
    mid = Math.max(0, score - left);
    note = "Moisture looks low — improving water retention can raise suitability.";
  }

  if (typeof args.ndvi === "number" && !Number.isNaN(args.ndvi) && args.ndvi >= 0.6) {
    const strongChunk = Math.min(25, Math.max(10, Math.round(score * 0.22)));
    right = Math.min(strongChunk, mid);
    mid = Math.max(0, mid - right);
    note = note.includes("Moisture")
      ? "Good vegetation, but moisture is limiting — fix moisture to grow more confidently."
      : "Good vegetation signal — strong base for spice growth.";
  }

  const sum = left + mid + right;
  if (sum > score) {
    const extra = sum - score;
    mid = Math.max(0, mid - extra);
  }

  return { left, mid, right, note };
}

function colorForScore75(score: number): string {
  if (score >= 75) return "#16a34a";
  if (score >= 55) return "#ca8a04";
  if (score >= 30) return "#ea580c";
  return "#dc2626";
}

// ==================== MAIN SCREEN ====================
export default function AnalyticsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    lat?: string;
    lng?: string;
    result?: string;
    type?: string;
  }>();

  console.log("🎯 AnalyticsScreen mounted with params:", {
    type: params.type,
    hasResult: !!params.result,
    resultLength: params.result?.length,
    lat: params.lat,
    lng: params.lng
  });

  // Determine analysis type
  const analysisType = params.type as "point" | "polygon" | "gee_point" | undefined;
  const isPolygonAnalysis = analysisType === "polygon";
  const isGeePoint = analysisType === "gee_point";

  const lat = (analysisType === "point" || isGeePoint) ? Number(params.lat) : null;
  const lng = (analysisType === "point" || isGeePoint) ? Number(params.lng) : null;

  // Parse polygon data immediately from params
  const polygonData = useMemo(() => {
    if (!isPolygonAnalysis) return null;
    const parsed = safeParseJson(params.result);
    console.log("📐 Polygon data memoized:", {
      parsed: !!parsed,
      ok: parsed?.ok,
      area: parsed?.area_hectares,
      prediction: parsed?.prediction?.label
    });
    return parsed;
  }, [isPolygonAnalysis, params.result]);

  const [loading, setLoading] = useState(!isPolygonAnalysis);
  const [data, setData] = useState<Resp | null>(polygonData);
  const [err, setErr] = useState<string | null>(null);

  // Update data when polygonData changes (polygon analysis)
  useEffect(() => {
    if (isPolygonAnalysis && polygonData) {
      console.log("✅ Setting polygon data from memo:", {
        area: polygonData.area_hectares,
        prediction: polygonData.prediction?.label
      });
      setData(polygonData);
      setLoading(false);
      setErr(null);
    }
  }, [isPolygonAnalysis, polygonData]);

  // For point analysis, construct URL
  const url = useMemo(() => {
    if (isPolygonAnalysis) return null;
    if (!Number.isFinite(lat!) || !Number.isFinite(lng!)) return null;
    if (isGeePoint) {
      return `${API_BASE_URL}/api/analysis/point?lat=${encodeURIComponent(
        String(lat)
      )}&lng=${encodeURIComponent(String(lng))}`;
    }
    return `${API_BASE_URL}/intelligence/evaluate?lat=${encodeURIComponent(
      String(lat)
    )}&lng=${encodeURIComponent(String(lng))}`;
  }, [lat, lng, isPolygonAnalysis, isGeePoint]);

  // Fetch for point analysis
  useEffect(() => {
    if (isPolygonAnalysis) {
      console.log("🔄 Skipping fetch - polygon analysis");
      return;
    }

    let alive = true;
    (async () => {
      if (!url) {
        console.log("ℹ️ No URL for point analysis, likely initial load without coords.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setErr(null);
        console.log("📍 Fetching point analysis from:", url);
        const res = await fetch(url);
        if (!res.ok) throw new Error(await res.text());
        const json = (await res.json()) as Resp;
        if (!alive) return;
        console.log("✅ Point analysis loaded successfully");
        setData(json);
      } catch (e: any) {
        if (!alive) return;
        console.error("❌ Point analysis error:", e);
        setErr(e?.message ?? "Failed to load analytics.");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [url, isPolygonAnalysis]);

  // @ts-ignore
  const goToMap = () => router.replace("/map");

  // Log render state
  console.log("🎨 Rendering with state:", {
    loading,
    hasData: !!data,
    analysisType,
    error: err,
    dataArea: data?.area_hectares,
    dataPrediction: data?.prediction?.label
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#16a34a" />
        <Text style={styles.loadingText}>
          Loading {isPolygonAnalysis ? "polygon" : "point"} analytics…
        </Text>
      </SafeAreaView>
    );
  }

  if (err) {
    console.error("❌ Render error state:", { err });
    return (
      <SafeAreaView style={styles.centerContainer}>
        <View style={[styles.card, styles.errorCard]}>
          <Text style={styles.errorTitle}>⚠️ Analytics Error</Text>
          <Text style={styles.errorText}>{err}</Text>
          <Pressable style={styles.primaryBtn} onPress={goToMap}>
            <Text style={styles.primaryBtnText}>← Back to Map</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <View style={[styles.card, { borderColor: "#3b82f6", backgroundColor: "#f0f9ff" }]}>
          <Text style={[styles.errorTitle, { color: "#1d4ed8", textAlign: "center", marginBottom: 8 }]}>🧭 Select a Location</Text>
          <Text style={[styles.errorText, { color: "#1e3a8a", textAlign: "center", marginBottom: 16 }]}>
            Go back to the map and tap a location inside the blue AOI boundary to analyze land potential.
          </Text>
          <Pressable style={[styles.primaryBtn, { backgroundColor: "#2563eb", shadowColor: "#2563eb" }]} onPress={goToMap}>
            <Text style={styles.primaryBtnText}>Go to Map</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (!isPolygonAnalysis && !isGeePoint && !data.inside_aoi) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <View style={[styles.card, styles.warningCard]}>
          <Text style={styles.warningTitle}>📍 Outside AOI</Text>
          <Text style={styles.warningText}>
            Please tap inside the blue AOI boundary to analyze land.
          </Text>
          <Pressable style={styles.primaryBtn} onPress={goToMap}>
            <Text style={styles.primaryBtnText}>← Back to Map</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Use features or statistics based on analysis type
  const f = data.features ?? {};
  const stats = data.statistics ?? {};

  // Get values safely from either format
  const ndviVal = getSafeValue(f.NDVI ?? stats.NDVI);
  const ndwiVal = getSafeValue(f.NDWI ?? stats.NDWI);
  const slopeVal = getSafeValue(f.SLOPE ?? stats.SLOPE);
  const elevVal = getSafeValue(f.ELEV ?? stats.ELEV);
  const aspectVal = getSafeValue(f.ASPECT ?? stats.ASPECT);

  const pred = data.prediction;
  const intel = data.intelligence ?? {};
  const spices = intel.spices ?? [];
  const goodPairs = intel.intercropping?.good_pairs ?? [];
  const avoidPairs = intel.intercropping?.avoid_pairs ?? [];

  const confidence =
    pred?.confidence ??
    (pred?.probabilities
      ? Math.max(
        pred.probabilities.idle_land ?? 0,
        pred.probabilities.vegetation_land ?? 0,
        pred.probabilities.built_land ?? 0
      )
      : 0);

  const ndviC = classifyNDVI(ndviVal);
  const ndwiC = classifyNDWI(ndwiVal);
  const slopeC = slopeCheck(slopeVal);
  const elevC = elevationCheck(elevVal);
  const aspectC = aspectExplain(aspectVal);

  const summary = makeFarmerSummary({
    landLabel: pred?.label,
    ndvi: ndviVal,
    ndwi: ndwiVal,
    slope: slopeVal
  });

  const pageTitle = isPolygonAnalysis ? "📐 Polygon Land Analytics" : isGeePoint ? "🔬 GEE Point Analytics (XGBoost)" : "🌍 Point Land Analytics";
  const pageSubtitle = isPolygonAnalysis
    ? `Area: ${(data.area_hectares ?? 0).toFixed(2)} ha • ${data.pixel_count ?? 0} pixels`
    : `Lat ${fmt(data.lat, 6)} • Lng ${fmt(data.lng, 6)}`;

  console.log("✅ Rendering main content:", {
    type: isPolygonAnalysis ? "polygon" : "point",
    ndvi: ndviVal,
    ndwi: ndwiVal,
    spices: spices.length
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* ==================== HEADER ====================*/}
        <View style={styles.headerSection}>
          <Text style={styles.pageTitle}>{pageTitle}</Text>
          <Text style={styles.pageSubtitle}>{pageSubtitle}</Text>
        </View>

        {/* ==================== CARD: MODEL PREDICTION ====================*/}
        <View style={[styles.card, { borderLeftColor: landLabelColor(pred?.label) }]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>🤖 Model Prediction</Text>
            <Text style={styles.cardBadge}>Confidence</Text>
          </View>

          <View style={styles.predictionBox}>
            <View
              style={[
                styles.landLabelChip,
                { backgroundColor: landLabelBgColor(pred?.label) },
              ]}
            >
              <Text
                style={[
                  styles.landLabelText,
                  { color: landLabelColor(pred?.label) },
                ]}
                numberOfLines={1}
              >
                {pred?.label ?? "UNKNOWN"}
              </Text>
            </View>

            <View style={styles.confidenceRow}>
              <Text style={styles.confidenceValue}>
                {((confidence ?? 0) * 100).toFixed(0)}%
              </Text>
              <View style={styles.confidenceBar}>
                <View
                  style={[
                    styles.confidenceFill,
                    {
                      width: `${(confidence ?? 0) * 100}%`,
                      backgroundColor:
                        confidence >= 0.75
                          ? "#16a34a"
                          : confidence >= 0.6
                            ? "#ca8a04"
                            : "#ef4444"
                    },
                  ]}
                />
              </View>
            </View>
          </View>

          {pred?.probabilities && (
            <Text style={styles.smallText}>
              🟢 Vegetation: {fmt(pred.probabilities.vegetation_land, 2)} | 🟤 Idle:{" "}
              {fmt(pred.probabilities.idle_land, 2)} | 🏠 Built:{" "}
              {fmt(pred.probabilities.built_land, 2)}
            </Text>
          )}

          <Text style={styles.descriptionText}>
            The model identifies land type (Vegetation, Idle, or Built-up) from satellite data.
            Higher confidence means the prediction is more reliable.
          </Text>
        </View>

        {/* ==================== CARD: VEGETATION & WATER ====================*/}
        <View style={[styles.card, { borderLeftColor: "#2563eb" }]}>
          <Text style={styles.cardTitle}>🌱 Vegetation & Water Health</Text>

          <IndexBlock
            name="NDVI (Greenness)"
            value={ndviVal}
            normalized={typeof ndviVal === "number" ? normIndex(ndviVal) : null}
            title={ndviC.title}
            titleTone={ndviC.tone}
            explain={ndviC.explain}
            tip={ndviC.farmerTip}
            info="NDVI (Normalized Difference Vegetation Index) measures how green and healthy vegetation is using satellite red and near-infrared light. Values range from -1 to +1. Higher values (>0.6) = dense healthy plants. Lower values (<0.3) = bare soil or stressed plants."
          />

          <View style={styles.divider} />

          <IndexBlock
            name="NDWI (Soil Moisture)"
            value={ndwiVal}
            normalized={typeof ndwiVal === "number" ? normIndex(ndwiVal) : null}
            title={ndwiC.title}
            titleTone={ndwiC.tone}
            explain={ndwiC.explain}
            tip={ndwiC.farmerTip}
            info="NDWI (Normalized Difference Water Index) detects water content in vegetation and soil. Values range from -1 to +1. Positive values = moist conditions. Negative values = dry soil. It helps identify irrigation needs."
          />

          <View style={styles.divider} />

          <IndexBlock
            name="EVI (Enhanced Vegetation)"
            value={getSafeValue(f.EVI ?? stats.EVI)}
            normalized={
              typeof getSafeValue(f.EVI ?? stats.EVI) === "number"
                ? normIndex(getSafeValue(f.EVI ?? stats.EVI)!)
                : null
            }
            title={classifyEVI(getSafeValue(f.EVI ?? stats.EVI)).title}
            titleTone={classifyEVI(getSafeValue(f.EVI ?? stats.EVI)).tone}
            explain={classifyEVI(getSafeValue(f.EVI ?? stats.EVI)).explain}
            tip={classifyEVI(getSafeValue(f.EVI ?? stats.EVI)).farmerTip}
            info="EVI (Enhanced Vegetation Index) is an improved version of NDVI that corrects for atmospheric and soil background effects. It is more sensitive in dense canopy areas. Values range from -1 to +1. Higher values = denser, healthier plant canopy."
          />

          <View style={styles.divider} />

          <IndexBlock
            name="SAVI (Soil-Adjusted)"
            value={getSafeValue(f.SAVI ?? stats.SAVI)}
            normalized={
              typeof getSafeValue(f.SAVI ?? stats.SAVI) === "number"
                ? normIndex(getSafeValue(f.SAVI ?? stats.SAVI)!)
                : null
            }
            title={classifySAVI(getSafeValue(f.SAVI ?? stats.SAVI)).title}
            titleTone={classifySAVI(getSafeValue(f.SAVI ?? stats.SAVI)).tone}
            explain={classifySAVI(getSafeValue(f.SAVI ?? stats.SAVI)).explain}
            tip={classifySAVI(getSafeValue(f.SAVI ?? stats.SAVI)).farmerTip}
            info="SAVI (Soil-Adjusted Vegetation Index) adjusts NDVI to minimize the effect of exposed soil. It's most useful when vegetation is sparse. Values range from -1 to +1. Low values indicate bare/exposed soil dominating the area."
          />
        </View>

        {/* ==================== CARD: TERRAIN ====================*/}
        <View style={[styles.card, { borderLeftColor: "#ca8a04" }]}>
          <Text style={styles.cardTitle}>⛰️ Terrain Assessment</Text>

          <TerrainCheckRow
            name="Elevation"
            value={elevVal}
            unit="m"
            status={elevC.status}
            tone={elevC.tone}
            why={elevC.why}
            info="Elevation is the height above sea level in meters. It affects temperature, rainfall patterns, and which crops can grow. Lower elevations (<1200m) suit most spice crops."
          />

          <View style={styles.divider} />

          <TerrainCheckRow
            name="Slope"
            value={slopeVal}
            unit="°"
            status={slopeC.status}
            tone={slopeC.tone}
            why={slopeC.why}
            tip={slopeC.farmerTip}
            info="Slope measures how steep the land is in degrees. Flat land (0-8°) is easiest to farm. Moderate slopes (8-20°) need erosion control. Steep slopes (>20°) are difficult for crops."
          />

          <View style={styles.divider} />

          <TerrainCheckRow
            name="Aspect"
            value={aspectVal}
            unit="°"
            status={aspectC.status}
            tone={aspectC.tone}
            why={aspectC.why}
            tip={aspectC.farmerTip}
            info="Aspect is the compass direction a slope faces (0°=North, 90°=East, 180°=South, 270°=West). It determines how much sunlight and wind the land receives. South/West slopes are hotter, North/East slopes are cooler and wetter."
          />
        </View>

        {/* ==================== CARD: SPICE SUITABILITY ====================*/}
        <View style={[styles.card, { borderLeftColor: "#ea580c" }]}>
          <Text style={styles.cardTitle}>🌶️ Spice Suitability</Text>
          <Text style={styles.cardDescription}>
            Scores (0–100) based on vegetation, moisture, terrain & land class.
          </Text>

          {spices.length > 0 ? (
            spices.map((s) => (
              <SpiceCard
                key={s.name}
                name={s.name}
                score={s.score ?? 0}
                label={s.label ?? "-"}
                confidence={typeof s.confidence === "number" ? s.confidence : null}
                reasons={(s.reasons ?? []).slice(0, 3)}
                ndvi={ndviVal}
                ndwi={ndwiVal}
                slope={slopeVal}
                landLabel={pred?.label}
                improvement={s.improvement}
              />
            ))
          ) : (
            <Text style={styles.emptyText}>No spice data available</Text>
          )}
        </View>

        {/* ==================== CARD: INTERCROPPING ====================*/}
        <View style={[styles.card, { borderLeftColor: "#14532d" }]}>
          <Text style={styles.cardTitle}>🌾 Intercropping Recommendations</Text>

          {goodPairs.length > 0 && (
            <>
              <Text style={styles.pairSubtitle}>✅ Can Grow Together</Text>
              {goodPairs.map((p, i) => (
                <PairRow key={`g-${i}`} pair={p} />
              ))}
            </>
          )}

          {avoidPairs.length > 0 && (
            <>
              <Text style={[styles.pairSubtitle, { marginTop: 12 }]}>⚠️ Avoid Together</Text>
              {avoidPairs.map((p, i) => (
                <PairRow key={`a-${i}`} pair={p} isWarning />
              ))}
            </>
          )}

          {goodPairs.length === 0 && avoidPairs.length === 0 && (
            <Text style={styles.emptyText}>
              No intercropping pairs detected.
            </Text>
          )}
        </View>

        {/* ==================== CARD: FARMER SUMMARY ====================*/}
        <View style={[styles.card, { borderLeftColor: "#16a34a" }]}>
          <Text style={styles.cardTitle}>👨‍🌾 Farmer-Friendly Summary</Text>
          <Text style={styles.summaryHeadline}>{summary.headline}</Text>

          {summary.bullets.map((b, i) => (
            <Text key={i} style={styles.bulletPoint}>
              • {b}
            </Text>
          ))}

          <Text style={styles.summaryTip}>
            💡 Tip: Good farming areas have <Text style={styles.bold}>healthy vegetation</Text>,{" "}
            <Text style={styles.bold}>adequate moisture</Text>, and{" "}
            <Text style={styles.bold}>gentle slopes</Text>.
          </Text>
        </View>

        {/* ==================== CTA BUTTON ====================*/}
        <Pressable style={styles.primaryBtn} onPress={goToMap}>
          <Text style={styles.primaryBtnText}>← Back to Map</Text>
        </Pressable>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ==================== REUSABLE SUB-COMPONENTS ====================

function InfoBubble({ text }: { text: string }) {
  return (
    <Pressable
      onPress={() => Alert.alert("ℹ️ What is this?", text, [{ text: "Got it" }])}
      style={styles.infoBubble}
    >
      <Text style={styles.infoBubbleText}>❓</Text>
    </Pressable>
  );
}

function IndexBlock(props: {
  name: string;
  value?: number;
  normalized: number | null;
  title: string;
  titleTone: LevelTone;
  explain: string;
  tip: string;
  info?: string;
}) {
  const fillFlex = props.normalized === null ? 0 : props.normalized;
  const restFlex = 1 - fillFlex;
  const color = toneColor(props.titleTone);

  return (
    <View style={styles.indexBlock}>
      <View style={styles.indexHeader}>
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1, gap: 6 }}>
          <Text style={styles.metricLabel} numberOfLines={2}>
            {props.name}
          </Text>
          {props.info && <InfoBubble text={props.info} />}
        </View>
        <Text style={[styles.metricValue, { color }]}>
          {fmt(props.value, 3)}
        </Text>
      </View>

      {props.normalized !== null && (
        <View style={styles.barContainer}>
          <View style={styles.barBackground}>
            <View
              style={{
                flexDirection: "row",
                width: "100%",
                height: "100%"
              }}
            >
              <View
                style={{
                  flex: fillFlex,
                  backgroundColor: color
                }}
              />
              <View
                style={{
                  flex: restFlex,
                  backgroundColor: "#e5e7eb"
                }}
              />
            </View>
          </View>
        </View>
      )}

      <Text
        style={[styles.statusTitle, { color, marginTop: 10 }]}
        numberOfLines={2}
      >
        {props.title}
      </Text>
      <Text style={styles.explainText}>{props.explain}</Text>
      {props.tip ? <Text style={styles.tipText}>💡 {props.tip}</Text> : null}
    </View>
  );
}

function TerrainCheckRow(props: {
  name: string;
  value?: number;
  unit?: string;
  status: string;
  tone: LevelTone;
  why: string;
  tip?: string;
  info?: string;
}) {
  const color = toneColor(props.tone);
  const bgColor = toneBgColor(props.tone);

  return (
    <View style={styles.terrainRow}>
      <View style={styles.indexHeader}>
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1, gap: 6 }}>
          <Text style={styles.metricLabel}>{props.name}</Text>
          {props.info && <InfoBubble text={props.info} />}
        </View>
        <Text style={[styles.metricValue, { color }]}>
          {fmt(props.value, 2)}
          {props.unit && <Text style={styles.unitText}> {props.unit}</Text>}
        </Text>
      </View>

      <View style={[styles.statusChip, { backgroundColor: bgColor }]}>
        <Text style={[styles.statusChipText, { color }]} numberOfLines={2}>
          {props.status} — {props.why}
        </Text>
      </View>

      {props.tip && (
        <Text style={styles.tipText}>💡 {props.tip}</Text>
      )}
    </View>
  );
}

function SpiceCard(props: {
  name: string;
  score: number;
  label: string;
  confidence: number | null;
  reasons: string[];
  ndvi?: number;
  ndwi?: number;
  slope?: number;
  landLabel?: string;
  improvement?: {
    projected_score?: number;
    projected_good_75?: boolean;
    steps?: string[];
  };
}) {
  const [showAfter, setShowAfter] = useState(false);

  const score = Math.max(0, Math.min(100, props.score));
  const fillFlex = score / 100;
  const restFlex = 1 - fillFlex;

  const baseColor =
    props.label === "Good"
      ? "#16a34a"
      : props.label === "Moderate"
        ? "#ca8a04"
        : props.label === "Poor"
          ? "#ea580c"
          : "#dc2626";

  const seg = scoreBarSegments({ score, ndvi: props.ndvi, ndwi: props.ndwi });
  const leftFlex = seg.left / 100;
  const midFlex = seg.mid / 100;
  const rightFlex = seg.right / 100;

  const rec = recommendedStepsForSpice({
    spiceName: props.name,
    ndvi: props.ndvi,
    ndwi: props.ndwi,
    slope: props.slope,
    landLabel: props.landLabel
  });

  const backendProjected =
    typeof props.improvement?.projected_score === "number"
      ? Math.max(0, Math.min(100, Math.round(props.improvement.projected_score)))
      : null;

  const uiBoosted = Math.max(0, Math.min(100, Math.round(score + rec.boostScore)));
  const projected = backendProjected !== null ? backendProjected : uiBoosted;

  const improvementSteps =
    props.improvement?.steps && props.improvement.steps.length > 0
      ? props.improvement.steps
      : rec.steps;

  const showBoost = improvementSteps.length > 0 && projected > score;
  const afterColor = colorForScore75(projected);

  const confidentText =
    showBoost && projected >= 75
      ? `✅ With these steps, you can grow ${props.name} confidently (up to ~${projected}/100).`
      : showBoost
        ? `⚠️ With these steps, suitability can improve (up to ~${projected}/100).`
        : score >= 75
          ? `✅ This land already looks good for ${props.name}.`
          : `ℹ️ Manage the land to improve results.`;

  return (
    <View style={[styles.spiceCardWrapper, { borderLeftColor: baseColor }]}>
      <View style={styles.spiceCardHeader}>
        <Text style={styles.spiceName}>{props.name}</Text>
        <View style={[styles.labelPill, { backgroundColor: baseColor + "22" }]}>
          <Text style={[styles.labelPillText, { color: baseColor }]}>
            {props.label}
          </Text>
        </View>
      </View>

      <View style={styles.scoreRow}>
        <Text style={styles.scoreNum}>{Math.round(score)}</Text>
        <Text style={styles.scoreOutOf}>/100</Text>
        {props.confidence !== null && (
          <Text style={styles.ruleConf}>Conf. {fmt(props.confidence, 2)}</Text>
        )}
      </View>

      <View style={styles.barContainer}>
        <View style={styles.barBackground}>
          <View style={{ flexDirection: "row", width: "100%", height: "100%" }}>
            {seg.left > 0 && (
              <View style={{ flex: leftFlex, backgroundColor: "#ef4444" }} />
            )}
            {seg.mid > 0 && (
              <View style={{ flex: midFlex, backgroundColor: baseColor }} />
            )}
            {seg.right > 0 && (
              <View style={{ flex: rightFlex, backgroundColor: "#16a34a" }} />
            )}
            <View
              style={{
                flex: restFlex,
                backgroundColor: "#e5e7eb"
              }}
            />
          </View>
        </View>
      </View>

      <Text style={styles.barExplain}>
        <Text style={styles.bold}>Color meaning:</Text> Red = limiting, Current color = suitability, Green = strong base
      </Text>

      <Text style={styles.spiceNote}>{seg.note}</Text>

      {props.reasons.length > 0 && (
        <View style={{ marginTop: 10 }}>
          {props.reasons.map((r, i) => (
            <Text key={i} style={styles.reasonText}>
              • {r}
            </Text>
          ))}
        </View>
      )}

      {showBoost && (
        <View style={{ marginTop: 12 }}>
          <Pressable
            style={styles.toggleBtn}
            onPress={() => setShowAfter((v) => !v)}
          >
            <Text style={styles.toggleBtnText}>
              {showAfter ? "Hide after improvement ▲" : "Show after improvement ▼"}
            </Text>
          </Pressable>

          {showAfter && (
            <View style={{ marginTop: 12 }}>
              <Text style={styles.afterTitle}>
                After improvement:{" "}
                <Text style={{ color: afterColor, fontWeight: "900" }}>
                  {projected}/100 {projected >= 75 ? "✅" : ""}
                </Text>
              </Text>

              <View style={styles.barContainer}>
                <View style={styles.barBackground}>
                  <View
                    style={{
                      flexDirection: "row",
                      width: "100%",
                      height: "100%"
                    }}
                  >
                    <View
                      style={{
                        flex: projected / 100,
                        backgroundColor: afterColor
                      }}
                    />
                    <View
                      style={{
                        flex: 1 - projected / 100,
                        backgroundColor: "#e5e7eb"
                      }}
                    />
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>
      )}

      {(!showBoost || showAfter) && (
        <View style={styles.recommendationBox}>
          <Text style={styles.recTitle}>🧑‍🌾 Recommendation</Text>
          <Text style={styles.recHeadline}>{confidentText}</Text>

          {improvementSteps.length > 0 && (
            <View style={{ marginTop: 10 }}>
              {improvementSteps.slice(0, 6).map((t, i) => (
                <Text key={i} style={styles.recStep}>
                  • {t}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

function PairRow({ pair, isWarning }: { pair: Pair; isWarning?: boolean }) {
  return (
    <View style={[styles.pairRow, isWarning && styles.pairRowWarning]}>
      <Text style={styles.pairTitle}>
        {pair.a} + {pair.b}
      </Text>
      <Text style={styles.pairWhy}>{pair.why}</Text>
    </View>
  );
}

// ==================== STYLES ====================
const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
    padding: 20
  },

  scrollContainer: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 32,
    backgroundColor: "#f8fafc"
  },

  headerSection: {
    marginBottom: 20
  },

  pageTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#0f172a",
    letterSpacing: 0.3
  },

  pageSubtitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748b",
    marginTop: 4
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    borderLeftWidth: 6,
    borderLeftColor: "#cbd5e1",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14
  },

  cardTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#0f172a",
    flex: 1
  },

  cardBadge: {
    fontSize: 11,
    fontWeight: "800",
    backgroundColor: "#f0f0f0",
    color: "#64748b",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999
  },

  cardDescription: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748b",
    marginTop: 4,
    marginBottom: 14
  },

  errorCard: {
    backgroundColor: "#fef2f2",
    borderLeftColor: "#dc2626"
  },

  errorTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#dc2626",
    marginBottom: 8
  },

  errorText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#991b1b",
    marginBottom: 16,
    lineHeight: 20
  },

  warningCard: {
    backgroundColor: "#fffbeb",
    borderLeftColor: "#ca8a04"
  },

  warningTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#ca8a04",
    marginBottom: 8
  },

  warningText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#92400e",
    marginBottom: 16,
    lineHeight: 20
  },

  loadingText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#64748b",
    marginTop: 12
  },

  predictionBox: {
    marginBottom: 12
  },

  landLabelChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 12,
    alignSelf: "flex-start",
    minWidth: 100
  },

  landLabelText: {
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center"
  },

  confidenceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 4
  },

  confidenceValue: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0f172a",
    minWidth: 50
  },

  confidenceBar: {
    flex: 1,
    height: 12,
    backgroundColor: "#e5e7eb",
    borderRadius: 999,
    overflow: "hidden"
  },

  confidenceFill: {
    height: "100%",
    borderRadius: 999
  },

  smallText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
    marginTop: 10,
    lineHeight: 18
  },

  descriptionText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
    marginTop: 12,
    lineHeight: 18
  },

  divider: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginVertical: 14
  },

  indexBlock: {
    marginBottom: 10
  },

  indexHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    gap: 12
  },

  metricLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1e293b",
    flex: 1
  },

  metricValue: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0f172a",
    minWidth: 45,
    textAlign: "right"
  },

  unitText: {
    fontSize: 12,
    fontWeight: "600"
  },

  barContainer: {
    marginVertical: 8
  },

  barBackground: {
    height: 12,
    backgroundColor: "#e5e7eb",
    borderRadius: 999,
    overflow: "hidden"
  },

  statusTitle: {
    fontSize: 14,
    fontWeight: "900",
    marginTop: 10,
    marginBottom: 6
  },

  statusChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginVertical: 8
  },

  statusChipText: {
    fontSize: 12,
    fontWeight: "800"
  },

  explainText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    marginTop: 6,
    lineHeight: 17
  },

  tipText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#a16207",
    marginTop: 6,
    lineHeight: 17
  },

  hintText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
    marginTop: 4
  },

  terrainRow: {
    marginVertical: 8
  },

  spiceCardWrapper: {
    backgroundColor: "#f8f9fa",
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 5,
    borderLeftColor: "#cbd5e1"
  },

  spiceCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    gap: 8
  },

  spiceName: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0f172a",
    flex: 1
  },

  labelPill: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    alignSelf: "flex-start"
  },

  labelPillText: {
    fontSize: 11,
    fontWeight: "900"
  },

  scoreRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    marginBottom: 10
  },

  scoreNum: {
    fontSize: 24,
    fontWeight: "900",
    color: "#0f172a"
  },

  scoreOutOf: {
    fontSize: 12,
    fontWeight: "800",
    color: "#64748b"
  },

  ruleConf: {
    fontSize: 11,
    fontWeight: "800",
    color: "#64748b",
    marginLeft: "auto"
  },

  barExplain: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
    marginTop: 8,
    lineHeight: 16
  },

  bold: {
    fontWeight: "900"
  },

  spiceNote: {
    fontSize: 12,
    fontWeight: "800",
    color: "#64748b",
    marginTop: 8
  },

  reasonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    lineHeight: 17,
    marginBottom: 4
  },

  toggleBtn: {
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center"
  },

  toggleBtnText: {
    fontWeight: "900",
    color: "#0f172a",
    fontSize: 13
  },

  afterTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#475569",
    marginBottom: 8
  },

  recommendationBox: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: 14,
    padding: 12,
    marginTop: 12
  },

  recTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#14532d"
  },

  recHeadline: {
    fontSize: 13,
    fontWeight: "900",
    color: "#14532d",
    marginTop: 6,
    lineHeight: 18
  },

  recStep: {
    fontSize: 12,
    fontWeight: "800",
    color: "#14532d",
    lineHeight: 17,
    marginTop: 6
  },

  pairSubtitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#0f172a",
    marginBottom: 8
  },

  pairRow: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#f0fdf4",
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#16a34a",
    marginBottom: 8
  },

  pairRowWarning: {
    backgroundColor: "#fef3c7",
    borderLeftColor: "#ca8a04"
  },

  pairTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#0f172a"
  },

  pairWhy: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
    marginTop: 4,
    lineHeight: 16
  },

  emptyText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#94a3b8",
    textAlign: "center",
    paddingVertical: 16,
    fontStyle: "italic"
  },

  summaryHeadline: {
    fontSize: 16,
    fontWeight: "900",
    color: "#065f46",
    marginTop: 10,
    marginBottom: 10,
    lineHeight: 22
  },

  bulletPoint: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
    lineHeight: 19,
    marginBottom: 6
  },

  summaryTip: {
    fontSize: 12,
    fontWeight: "700",
    color: "#16a34a",
    marginTop: 12,
    lineHeight: 17
  },

  primaryBtn: {
    backgroundColor: "#16a34a",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    shadowColor: "#16a34a",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2
  },

  primaryBtnText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 16,
    letterSpacing: 0.2
  },

  infoBubble: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#e0e7ff",
    alignItems: "center",
    justifyContent: "center",
  },

  infoBubbleText: {
    fontSize: 12,
  }
});