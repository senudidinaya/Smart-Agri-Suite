import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import ConfidenceBar from "../../src/ConfidenceBar";

const API_URL =
  Platform.OS === "android" ? "http://10.0.2.2:8000" : "http://localhost:8000";
const INSPECT_URL = `${API_URL}/intelligence/evaluate`;

type Pair = { a: string; b: string; why: string };

type Resp = {
  ok: boolean;
  inside_aoi: boolean;
  lat: number;
  lng: number;
  features?: Record<string, number>;
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
    }>;
    intercropping?: {
      good_pairs?: Pair[];
      avoid_pairs?: Pair[];
      notes?: string[];
    };
    health?: { headline?: string; tags?: string[] };
  };
};

function fmt(n?: number, d = 3) {
  if (typeof n !== "number" || Number.isNaN(n)) return "-";
  return n.toFixed(d);
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const normIndex = (v: number) => clamp01((v + 1) / 2);

function landLabelColor(label?: string) {
  // Map model land class to a clear farmer-facing color
  switch (label) {
    case "VEGETATION_LAND":
      return "#16a34a"; // green
    case "IDLE_LAND":
      return "#ca8a04"; // amber
    case "BUILT_LAND":
      return "#ef4444"; // red
    default:
      return "#111827"; // dark
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
      return "#111827";
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
      farmerTip: "Try another point inside the AOI.",
    };
  }

  if (ndvi >= 0.6) {
    return {
      title: "Good vegetation (healthy green cover)",
      tone: "good",
      explain:
        "High NDVI means the land has strong plant growth (good leaves/green).",
      farmerTip:
        "Good for spices and crops. Keep moisture and nutrients stable.",
    };
  }
  if (ndvi >= 0.3) {
    return {
      title: "Moderate vegetation (patchy / mixed)",
      tone: "moderate",
      explain:
        "Medium NDVI means some plants exist, but the cover is not dense everywhere.",
      farmerTip:
        "Good with management: add compost, improve irrigation/mulch, reduce weeds.",
    };
  }
  return {
    title: "Low vegetation (bare soil / weak plants)",
    tone: "bad",
    explain:
      "Low NDVI means little green growth. It may be bare soil, stressed crops, or built surfaces.",
    farmerTip:
      "Before planting: clear weeds, add organic matter, check water access.",
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
      farmerTip: "Try another point inside the AOI.",
    };
  }

  if (ndwi >= 0.15) {
    return {
      title: "Wet / high moisture",
      tone: "good",
      explain:
        "Higher NDWI usually means more water/moisture around vegetation or surface.",
      farmerTip:
        "Good for moisture-loving crops. Avoid waterlogging; ensure drainage.",
    };
  }
  if (ndwi >= 0.0) {
    return {
      title: "Moderate moisture",
      tone: "moderate",
      explain:
        "NDWI near zero means moisture is present but not strong.",
      farmerTip:
        "Mulch and occasional irrigation can keep moisture stable.",
    };
  }
  return {
    title: "Dry land / low moisture",
    tone: "bad",
    explain:
      "Negative NDWI usually means dry soil / low moisture (often bare or built surfaces).",
    farmerTip:
      "Use mulch + shade + drip irrigation if possible. Improve soil organic matter.",
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
      farmerTip: "Try another point or ensure feature raster has slope band.",
    };
  }
  if (slope <= 8) {
    return {
      status: "OK",
      tone: "good",
      why: "Low slope → easier farming and lower erosion risk.",
      farmerTip: "Normal planting is fine.",
    };
  }
  if (slope <= 20) {
    return {
      status: "OK",
      tone: "moderate",
      why: "Moderate slope → erosion can happen in heavy rain.",
      farmerTip: "Use contour planting, mulch, and drainage lines.",
    };
  }
  return {
    status: "Not OK",
    tone: "bad",
    why: "High slope → strong erosion risk and difficult field operations.",
    farmerTip: "Avoid heavy cultivation; use terraces/contours + ground cover.",
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
  // Sri Lanka lowland spices: elevation not a big “stopper” unless extreme,
  // but give farmers a simple message.
  if (elev < 1200) {
    return {
      status: "OK",
      tone: "good",
      why: "Elevation is suitable for most lowland/midland spice crops.",
    };
  }
  return {
    status: "OK",
    tone: "moderate",
    why: "Higher elevation may change temperature; choose crop varieties carefully.",
  };
}

function aspectExplain(aspect?: number): {
  status: "Info" | "Unknown";
  tone: LevelTone;
  why: string;
} {
  if (typeof aspect !== "number" || Number.isNaN(aspect)) {
    return { status: "Unknown", tone: "neutral", why: "Aspect not available." };
  }
  return {
    status: "Info",
    tone: "neutral",
    why:
      "Aspect is slope direction. It affects sunlight and drying. South/west-facing slopes can be hotter and drier.",
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

export default function AnalyticsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ lat?: string; lng?: string }>();
  const lat = Number(params.lat);
  const lng = Number(params.lng);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const url = useMemo(() => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return `${INSPECT_URL}?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(
      String(lng)
    )}`;
  }, [lat, lng]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!url) {
        setErr("Invalid coordinates.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setErr(null);
        const res = await fetch(url);
        if (!res.ok) throw new Error(await res.text());
        const json = (await res.json()) as Resp;
        if (!alive) return;
        setData(json);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message ?? "Failed to load analytics.");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [url]);

  const goToMap = () => router.replace("/map");

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={{ marginTop: 10, fontWeight: "900" }}>Loading analytics…</Text>
      </View>
    );
  }

  if (err || !data) {
    return (
      <View style={styles.center}>
        <Text style={{ fontWeight: "900", marginBottom: 6 }}>Analytics Error</Text>
        <Text style={{ opacity: 0.8, textAlign: "center" }}>{err ?? "No data"}</Text>
        <Pressable style={styles.backBtn} onPress={goToMap}>
          <Text style={styles.backBtnText}>Back to Map</Text>
        </Pressable>
      </View>
    );
  }

  if (!data.inside_aoi) {
    return (
      <View style={styles.center}>
        <Text style={{ fontWeight: "900", marginBottom: 6 }}>Outside AOI</Text>
        <Text style={{ opacity: 0.8, textAlign: "center" }}>Tap inside the AOI boundary.</Text>
        <Pressable style={styles.backBtn} onPress={goToMap}>
          <Text style={styles.backBtnText}>Back to Map</Text>
        </Pressable>
      </View>
    );
  }

  const f = data.features ?? {};
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

  const ndviC = classifyNDVI(f.NDVI);
  const ndwiC = classifyNDWI(f.NDWI);
  const slopeC = slopeCheck(f.SLOPE);
  const elevC = elevationCheck(f.ELEV);
  const aspectC = aspectExplain(f.ASPECT);

  const summary = makeFarmerSummary({
    landLabel: pred?.label,
    ndvi: f.NDVI,
    ndwi: f.NDWI,
    slope: f.SLOPE,
  });

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.title}>Land Analytics</Text>
      <Text style={styles.sub}>Lat {fmt(data.lat, 6)} • Lng {fmt(data.lng, 6)}</Text>

      {/* ✅ 1) CONFIDENCE FIRST */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Confidence & Model Prediction</Text>

        <Text
          style={[
            styles.bigLabel,
            { color: landLabelColor(pred?.label) },
          ]}
        >
          {pred?.label ?? "UNKNOWN"}
        </Text>

        <ConfidenceBar label="Confidence" confidence={confidence ?? 0} />

        {pred?.probabilities && (
          <Text style={styles.small}>
            Built: {fmt(pred.probabilities.built_land, 3)} • Vegetation:{" "}
            {fmt(pred.probabilities.vegetation_land, 3)} • Idle:{" "}
            {fmt(pred.probabilities.idle_land, 3)}
          </Text>
        )}

        <Text style={[styles.farmerText, { marginTop: 10 }]}>
          This “prediction” tells what the land mostly looks like from satellite:{" "}
          <Text style={{ fontWeight: "900" }}>idle/bare</Text>,{" "}
          <Text style={{ fontWeight: "900" }}>vegetation</Text>, or{" "}
          <Text style={{ fontWeight: "900" }}>built-up</Text>. Higher confidence means the model is more sure.
        </Text>
      </View>

      {/* ✅ 2) INDICES with farmer-friendly meaning + color */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Vegetation & Water (Farmer View)</Text>

        <IndexBlock
          name="NDVI (Greenness)"
          value={f.NDVI}
          normalized={typeof f.NDVI === "number" ? normIndex(f.NDVI) : null}
          title={ndviC.title}
          titleTone={ndviC.tone}
          explain={ndviC.explain}
          tip={ndviC.farmerTip}
        />

        <IndexBlock
          name="NDWI (Moisture)"
          value={f.NDWI}
          normalized={typeof f.NDWI === "number" ? normIndex(f.NDWI) : null}
          title={ndwiC.title}
          titleTone={ndwiC.tone}
          explain={ndwiC.explain}
          tip={ndwiC.farmerTip}
        />

        {/* Keep EVI & SAVI (simple, still useful) */}
        <SimpleIndexRow name="EVI" value={f.EVI} normalized={typeof f.EVI === "number" ? normIndex(f.EVI) : null} />
        <Text style={styles.small}>EVI helps in dense vegetation and is less affected by atmosphere.</Text>

        <SimpleIndexRow name="SAVI" value={f.SAVI} normalized={typeof f.SAVI === "number" ? normIndex(f.SAVI) : null} />
        <Text style={styles.small}>SAVI is useful when soil is visible (early crops / bare patches).</Text>
      </View>

      {/* ✅ 3) Terrain features with OK/Not OK + why */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Terrain Check (Is it OK?)</Text>

        <TerrainCheckRow
          name="Elevation (m)"
          value={f.ELEV}
          status={elevC.status}
          tone={elevC.tone}
          why={elevC.why}
        />

        <TerrainCheckRow
          name="Slope (°)"
          value={f.SLOPE}
          status={slopeC.status}
          tone={slopeC.tone}
          why={slopeC.why}
          tip={slopeC.farmerTip}
        />

        <TerrainCheckRow
          name="Aspect (°)"
          value={f.ASPECT}
          status={aspectC.status}
          tone={aspectC.tone}
          why={aspectC.why}
        />
      </View>

      {/* ✅ 4) Spice suitability (kept, still farmer-friendly) */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Spice Suitability</Text>
        <Text style={styles.small}>
          Scores (0–100) are rule-based using vegetation + moisture + terrain + land class.
        </Text>

        <View style={{ marginTop: 10 }}>
          {spices.map((s) => (
            <SpiceCard
              key={s.name}
              name={s.name}
              score={s.score ?? 0}
              label={s.label ?? "-"}
              confidence={typeof s.confidence === "number" ? s.confidence : null}
              reasons={(s.reasons ?? []).slice(0, 3)}
            />
          ))}
        </View>
      </View>

      {/* ✅ 5) Intercropping (two columns) */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Intercropping Recommendations</Text>
        <Text style={styles.small}>Pairs are suggested using moisture + vegetation + slope rules.</Text>

        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={styles.colTitle}>✅ Can Grow Together</Text>
            {goodPairs.length === 0 ? (
              <Text style={styles.empty}>No strong pairs detected.</Text>
            ) : (
              goodPairs.map((p, i) => <PairRow key={`g-${i}`} pair={p} />)
            )}
          </View>

          <View style={styles.col}>
            <Text style={styles.colTitle}>⚠️ Avoid Together</Text>
            {avoidPairs.length === 0 ? (
              <Text style={styles.empty}>No avoid-pairs detected.</Text>
            ) : (
              avoidPairs.map((p, i) => <PairRow key={`a-${i}`} pair={p} />)
            )}
          </View>
        </View>
      </View>

      {/* ✅ 6) USER FRIENDLY LAND SUMMARY */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Simple Land Summary (For Farmers)</Text>
        <Text style={styles.summaryHeadline}>{summary.headline}</Text>

        <View style={{ marginTop: 10 }}>
          {summary.bullets.map((b, i) => (
            <Text key={i} style={styles.bullet}>• {b}</Text>
          ))}
        </View>

        <Text style={[styles.farmerText, { marginTop: 12 }]}>
          Tip: A good farming area usually has{" "}
          <Text style={{ fontWeight: "900", color: "#16a34a" }}>good vegetation</Text>,{" "}
          <Text style={{ fontWeight: "900", color: "#16a34a" }}>enough moisture</Text>, and{" "}
          <Text style={{ fontWeight: "900", color: "#16a34a" }}>low slope</Text>.
        </Text>
      </View>

      <Pressable style={styles.backBtn} onPress={goToMap}>
        <Text style={styles.backBtnText}>Back to Map</Text>
      </Pressable>
    </ScrollView>
  );
}

function PairRow({ pair }: { pair: Pair }) {
  return (
    <View style={styles.pairRow}>
      <Text style={styles.pairTitle}>
        {pair.a} + {pair.b}
      </Text>
      <Text style={styles.pairWhy}>{pair.why}</Text>
    </View>
  );
}

function SimpleIndexRow(props: {
  name: string;
  value?: number;
  normalized: number | null;
}) {
  const fillFlex = props.normalized === null ? 0 : props.normalized;
  const restFlex = 1 - fillFlex;

  return (
    <View style={{ marginTop: 14 }}>
      <View style={styles.metricTop}>
        <Text style={styles.metricName}>{props.name}</Text>
        <Text style={styles.metricValue}>{fmt(props.value, 3)}</Text>
      </View>

      {props.normalized !== null && (
        <View style={styles.barBg}>
          <View style={{ flexDirection: "row", width: "100%", height: "100%" }}>
            <View style={{ flex: fillFlex, backgroundColor: "#2563eb" }} />
            <View style={{ flex: restFlex, backgroundColor: "transparent" }} />
          </View>
        </View>
      )}
    </View>
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
}) {
  const fillFlex = props.normalized === null ? 0 : props.normalized;
  const restFlex = 1 - fillFlex;

  return (
    <View style={{ marginTop: 10 }}>
      <View style={styles.metricTop}>
        <Text style={styles.metricName}>{props.name}</Text>
        <Text style={styles.metricValue}>{fmt(props.value, 3)}</Text>
      </View>

      {props.normalized !== null && (
        <View style={styles.barBg}>
          <View style={{ flexDirection: "row", width: "100%", height: "100%" }}>
            <View style={{ flex: fillFlex, backgroundColor: "#2563eb" }} />
            <View style={{ flex: restFlex, backgroundColor: "transparent" }} />
          </View>
        </View>
      )}

      <Text style={[styles.levelTitle, { color: toneColor(props.titleTone) }]}>
        {props.title}
      </Text>
      <Text style={styles.farmerText}>{props.explain}</Text>
      <Text style={styles.tipText}>Tip: {props.tip}</Text>
    </View>
  );
}

function TerrainCheckRow(props: {
  name: string;
  value?: number;
  status: string;
  tone: LevelTone;
  why: string;
  tip?: string;
}) {
  return (
    <View style={styles.terrainRow}>
      <View style={styles.terrainTop}>
        <Text style={styles.metricName}>{props.name}</Text>
        <Text style={styles.metricValue}>{fmt(props.value, 2)}</Text>
      </View>

      <Text style={[styles.terrainStatus, { color: toneColor(props.tone) }]}>
        {props.status} — {props.why}
      </Text>

      {!!props.tip && <Text style={styles.tipText}>Tip: {props.tip}</Text>}
    </View>
  );
}

function SpiceCard(props: {
  name: string;
  score: number;
  label: string;
  confidence: number | null;
  reasons: string[];
}) {
  const score = Math.max(0, Math.min(100, props.score));
  const fillFlex = score / 100;
  const restFlex = 1 - fillFlex;

  const color =
    props.label === "Good"
      ? "#16a34a"
      : props.label === "Moderate"
      ? "#ca8a04"
      : props.label === "Poor"
      ? "#ea580c"
      : "#dc2626";

  return (
    <View style={styles.spiceCard}>
      <View style={styles.spiceTop}>
        <Text style={styles.spiceName}>{props.name}</Text>
        <View style={[styles.pill, { backgroundColor: "#f3f4f6" }]}>
          <Text style={[styles.pillText, { color }]}>{props.label}</Text>
        </View>
      </View>

      <View style={styles.scoreRow}>
        <Text style={styles.scoreNum}>{Math.round(score)}</Text>
        <Text style={styles.scoreOutOf}>/100</Text>
        {props.confidence !== null && (
          <Text style={styles.ruleConf}>Rule conf. {fmt(props.confidence, 2)}</Text>
        )}
      </View>

      <View style={styles.barBg}>
        <View style={{ flexDirection: "row", width: "100%", height: "100%" }}>
          <View style={{ flex: fillFlex, backgroundColor: color }} />
          <View style={{ flex: restFlex, backgroundColor: "transparent" }} />
        </View>
      </View>

      {!!props.reasons.length && (
        <View style={{ marginTop: 10 }}>
          {props.reasons.map((r, i) => (
            <Text key={i} style={styles.bullet}>• {r}</Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { padding: 14, paddingBottom: 30 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },

  title: { fontSize: 20, fontWeight: "900" },
  sub: { marginTop: 4, marginBottom: 12, opacity: 0.8, fontWeight: "700" },

  card: {
    backgroundColor: "white",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 12,
  },
  cardTitle: { fontSize: 13, fontWeight: "900", marginBottom: 10 },

  bigLabel: { fontSize: 16, fontWeight: "900", marginBottom: 6 },

  barBg: {
    marginTop: 8,
    height: 10,
    borderRadius: 999,
    backgroundColor: "#e5e7eb",
    overflow: "hidden",
  },

  small: { fontSize: 12, opacity: 0.85, fontWeight: "700", marginTop: 8 },

  farmerText: { fontSize: 12, opacity: 0.9, fontWeight: "700", lineHeight: 16 },
  tipText: { fontSize: 12, fontWeight: "800", opacity: 0.9, marginTop: 6 },

  metricTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  metricName: { fontSize: 13, fontWeight: "900" },
  metricValue: { fontSize: 13, fontWeight: "900", opacity: 0.85 },

  levelTitle: { marginTop: 10, fontSize: 13, fontWeight: "900" },

  terrainRow: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#f3f4f6" },
  terrainTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  terrainStatus: { marginTop: 6, fontWeight: "900" },

  twoCol: { flexDirection: "row", marginTop: 10 },
  col: { flex: 1 },
  colTitle: { fontWeight: "900", marginBottom: 8 },
  empty: { opacity: 0.7, fontWeight: "700" },

  pairRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  pairTitle: { fontWeight: "900" },
  pairWhy: { marginTop: 4, opacity: 0.8, fontWeight: "700", fontSize: 12 },

  spiceCard: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 14, padding: 12, marginBottom: 10 },
  spiceTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  spiceName: { fontSize: 14, fontWeight: "900" },
  pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  pillText: { fontSize: 11, fontWeight: "900" },

  scoreRow: { flexDirection: "row", alignItems: "baseline", marginTop: 6 },
  scoreNum: { fontSize: 22, fontWeight: "900" },
  scoreOutOf: { fontSize: 12, opacity: 0.7, fontWeight: "900", marginLeft: 6 },
  ruleConf: { marginLeft: "auto", fontSize: 11, opacity: 0.75, fontWeight: "800" },

  bullet: { marginTop: 6, opacity: 0.9, fontWeight: "700" },

  summaryHeadline: { fontSize: 14, fontWeight: "900", lineHeight: 18 },

  backBtn: { marginTop: 6, backgroundColor: "#111827", paddingVertical: 12, borderRadius: 14, alignItems: "center" },
  backBtnText: { color: "white", fontWeight: "900" },
});
