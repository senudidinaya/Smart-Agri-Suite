import { SafeAreaView } from "react-native-safe-area-context";
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator} from "react-native";
import { API_BASE_URL } from "../../src/config";

// ==================== UTILITY FUNCTIONS ====================
function clamp01(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function safeNum(v: any, fb = NaN) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fb;
}

function isArrayNums(x: any): x is number[] {
  return Array.isArray(x) && x.every((v) => typeof v === "number");
}

function computeDominant(veg: number, idle: number, built: number) {
  const m = Math.max(veg, idle, built);
  if (m < 1) return "UNKNOWN";
  if (m === built) return "BUILT-UP";
  if (m === veg) return "VEGETATION";
  return "IDLE";
}

function labelBadge(dominant: string) {
  const u = (dominant || "").toUpperCase();
  if (u.includes("VEG"))
    return { chip: "#dcfce7", fg: "#14532d", text: "🌱 VEGETATION", icon: "🌿" };
  if (u.includes("IDLE"))
    return { chip: "#fef3c7", fg: "#92400e", text: "🟤 IDLE LAND", icon: "🟤" };
  if (u.includes("BUILT"))
    return { chip: "#fee2e2", fg: "#7f1d1d", text: "🏠 BUILT-UP", icon: "🏢" };
  return { chip: "#f1f5f9", fg: "#475569", text: "❓ UNKNOWN", icon: "?" };
}

function histogramDirection(counts: number[]) {
  if (!counts.length) return "unknown";
  const sum = counts.reduce((a, b) => a + b, 0);
  if (sum <= 0) return "unknown";

  const n = counts.length;
  const avg = counts.reduce((acc, c, i) => acc + c * i, 0) / sum;
  const frac = avg / (n - 1);

  if (frac >= 0.62) return "right";
  if (frac <= 0.38) return "left";
  return "middle";
}

function normalizeFromBackend(raw: any) {
  const comp = raw?.composition || {};
  const veg = safeNum(comp.vegetation_pct, 0);
  const idle = safeNum(comp.idle_pct, 0);
  const built = safeNum(comp.built_pct, 0);

  const conf = clamp01(safeNum(raw?.confidence, 0));

  const means = raw?.means || {};
  const ndviMean = safeNum(means.NDVI, NaN);
  const ndwiMean = safeNum(means.NDWI, NaN);
  const elevMean = safeNum(means.ELEV, NaN);
  const slopeMean = safeNum(means.SLOPE, NaN);

  const hist = raw?.hist || {};
  const ndviBins = isArrayNums(hist.ndvi_bins) ? hist.ndvi_bins : [];
  const ndwiBins = isArrayNums(hist.ndwi_bins) ? hist.ndwi_bins : [];

  const dominant = computeDominant(veg, idle, built);

  const confLabel =
    conf >= 0.8 ? "High confidence ✅" : conf >= 0.6 ? "Medium confidence ⚠️" : "Low confidence ⚠️";
  const confMeaning =
    conf >= 0.8
      ? "Most parts look similar — decisions are easier."
      : conf >= 0.6
      ? "Some parts are mixed — field check is recommended."
      : "Area is very mixed — tap multiple points on the map.";

  const next: { emoji: string; text: string }[] = [];
  if (built >= 45)
    next.push({ emoji: "🏠", text: "Built-up is high — focus only on green/idle pockets for farming." });
  else if (idle >= 35)
    next.push({ emoji: "🟤", text: "Idle land is large — start cultivation after clearing + soil improvement." });
  else if (veg >= 45)
    next.push({ emoji: "🌿", text: "Vegetation cover is good — maintain plants and increase soil fertility." });

  if (Number.isFinite(ndviMean)) {
    if (ndviMean >= 0.6) next.push({ emoji: "✅", text: "Vegetation is strong — keep composting and avoid over-clearing." });
    else if (ndviMean >= 0.3) next.push({ emoji: "🌿", text: "Vegetation is moderate — add compost/manure and remove weeds." });
    else next.push({ emoji: "⚠️", text: "Vegetation is low — improve soil first (green manure/cover crops) before planting spices." });
  }

  if (Number.isFinite(ndwiMean)) {
    if (ndwiMean < 0.0) next.push({ emoji: "💧", text: "Dry tendency — use mulch (leaves/straw) and water during dry season." });
    else next.push({ emoji: "💦", text: "Moisture is OK — maintain drainage and avoid waterlogging." });
  }

  const pct = roundPct100(veg, idle, built);

  return {
    ok: !!raw?.ok,
    aoi_name: String(raw?.aoi_name || "Malabe AOI"),
    dominant,
    veg,
    idle,
    built,
    vegD: pct.vegD,
    idleD: pct.idleD,
    builtD: pct.builtD,
    conf,
    confLabel,
    confMeaning,
    means: { ndviMean, ndwiMean, elevMean, slopeMean },
    hist: { ndviBins, ndwiBins },
    next: next.slice(0, 4),
    raw};
}

function roundPct100(veg: number, idle: number, built: number) {
  const rVeg = Math.round(veg);
  const rIdle = Math.round(idle);
  const rBuilt = Math.round(built);

  const total = veg + idle + built;
  const dominant = computeDominant(veg, idle, built);

  let a = rVeg, b = rIdle, c = rBuilt;
  let sum = a + b + c;

  if (!Number.isFinite(total) || total <= 0) {
    return { vegD: 0, idleD: 0, builtD: 0 };
  }

  if (sum !== 100) {
    const diff = 100 - sum;
    if (dominant.includes("VEG")) a += diff;
    else if (dominant.includes("IDLE")) b += diff;
    else c += diff;
  }

  a = Math.max(0, a);
  b = Math.max(0, b);
  c = Math.max(0, c);

  const s2 = a + b + c;
  if (s2 !== 100) {
    c += 100 - s2;
  }

  return { vegD: a, idleD: b, builtD: c };
}

// ==================== PROGRESS BAR COMPONENT ====================
function ProgressBar({ value01, color }: { value01: number; color: string }) {
  const clampedValue = clamp01(value01);
  return (
    <View style={styles.progressTrack}>
      <View
        style={[
          styles.progressFill,
          {
            width: `${clampedValue * 100}%`,
            backgroundColor: color},
        ]}
      />
    </View>
  );
}

// ==================== SEGMENT BAR COMPONENT ====================
function SegmentBar({
  veg,
  idle,
  built}: {
  veg: number;
  idle: number;
  built: number;
}) {
  const total = Math.max(veg + idle + built, 0.0001);
  const vegPct = (veg / total) * 100;
  const idlePct = (idle / total) * 100;
  const builtPct = (built / total) * 100;

  return (
    <View style={styles.segmentTrack}>
      {vegPct > 0 && (
        <View
          style={[
            styles.segment,
            { width: `${vegPct}%`, backgroundColor: "#16a34a" },
          ]}
        />
      )}
      {idlePct > 0 && (
        <View
          style={[
            styles.segment,
            { width: `${idlePct}%`, backgroundColor: "#ca8a04" },
          ]}
        />
      )}
      {builtPct > 0 && (
        <View
          style={[
            styles.segment,
            { width: `${builtPct}%`, backgroundColor: "#6b7280" },
          ]}
        />
      )}
    </View>
  );
}

// ==================== HISTOGRAM COMPONENT ====================
function HistogramBars({ title, counts }: { title: string; counts: number[] }) {
  const maxC = Math.max(1, ...counts);
  const n = counts.length || 10;
  const dir = histogramDirection(counts);

  const directionText =
    dir === "right"
      ? "RIGHT ✅ (good plant cover)"
      : dir === "left"
      ? "LEFT ⚠️ (bare/weak land)"
      : "MIXED ℹ️ (balanced)";

  return (
    <View style={styles.histogramSection}>
      <Text style={styles.histogramTitle}>{title}</Text>

      <View style={styles.histogramBox}>
        <View style={styles.histogramRow}>
          {Array.from({ length: n }).map((_, i) => {
            const c = counts[i] ?? 0;
            const h = Math.max(8, Math.round((c / maxC) * 64));
            return (
              <View
                key={i}
                style={[
                  styles.histogramBar,
                  {
                    height: h},
                ]}
              />
            );
          })}
        </View>
      </View>

      <View style={styles.translationBox}>
        <Text style={styles.translationTitle}>👨‍🌾 What this means</Text>
        <Text style={styles.translationText}>
          • Bars mostly on <Text style={styles.bold}>RIGHT</Text> → Good vegetation
        </Text>
        <Text style={styles.translationText}>
          • Bars mostly on <Text style={styles.bold}>LEFT</Text> → Bare/weak vegetation
        </Text>
        {dir !== "unknown" && (
          <Text style={[styles.directionHint, { color: dir === "right" ? "#16a34a" : dir === "left" ? "#dc2626" : "#ca8a04" }]}>
            This area: <Text style={styles.bold}>{directionText}</Text>
          </Text>
        )}
      </View>
    </View>
  );
}

// ==================== MAIN SCREEN ====================
export default function ModelScreen() {
  const [raw, setRaw] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  const data = useMemo(() => (raw ? normalizeFromBackend(raw) : null), [raw]);

  const fetchSummary = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`${API_BASE_URL}/aoi/summary`);
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setRaw(json);
    } catch (e: any) {
      setErr(e?.message || "Failed to load /aoi/summary");
      setRaw(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const badge = labelBadge(data?.dominant || "UNKNOWN");

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* ==================== HERO SECTION ====================*/}
        <View style={[styles.card, styles.heroCard]}>
          <Text style={styles.heroTitle}>🌍 Area Analytics</Text>
          <Text style={styles.heroSubtitle}>
            {data?.aoi_name || "Malabe AOI"} • Summary for entire area
          </Text>

          <View style={[styles.domainChip, { backgroundColor: badge.chip }]}>
            <Text style={[styles.domainChipText, { color: badge.fg }]}>
              {badge.icon} {badge.text}
            </Text>
          </View>
        </View>

        {/* ==================== LOADING STATE ====================*/}
        {loading && (
          <View style={[styles.card, styles.centerCard]}>
            <ActivityIndicator size="large" color="#16a34a" />
            <Text style={styles.loadingText}>Loading area summary…</Text>
          </View>
        )}

        {/* ==================== ERROR STATE ====================*/}
        {err && !loading && (
          <View style={[styles.card, styles.errorCard]}>
            <Text style={styles.errorTitle}>⚠️ Unable to Load Data</Text>
            <Text style={styles.errorText}>{err}</Text>
            <Pressable style={styles.retryBtn} onPress={fetchSummary}>
              <Text style={styles.retryBtnText}>🔄 Retry</Text>
            </Pressable>
          </View>
        )}

        {/* ==================== CONTENT ====================*/}
        {data && !loading && !err && (
          <>
            {/* CARD: CONFIDENCE */}
            <View style={[styles.card, { borderLeftColor: "#2563eb" }]}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>🔍 Area Confidence</Text>
                <View
                  style={[
                    styles.confidenceBadge,
                    {
                      backgroundColor:
                        data.conf >= 0.8
                          ? "#dcfce7"
                          : data.conf >= 0.6
                          ? "#fef3c7"
                          : "#fee2e2"},
                  ]}
                >
                  <Text
                    style={[
                      styles.confidenceBadgeText,
                      {
                        color:
                          data.conf >= 0.8
                            ? "#16a34a"
                            : data.conf >= 0.6
                            ? "#ca8a04"
                            : "#dc2626"},
                    ]}
                  >
                    {data.confLabel}
                  </Text>
                </View>
              </View>

              <View style={styles.confidenceDisplay}>
                <Text style={styles.bigNumber}>
                  {(data.conf * 100).toFixed(0)}%
                </Text>
                <ProgressBar
                  value01={data.conf}
                  color={
                    data.conf >= 0.8
                      ? "#16a34a"
                      : data.conf >= 0.6
                      ? "#ca8a04"
                      : "#dc2626"
                  }
                />
              </View>

              <Text style={styles.meaningText}>{data.confMeaning}</Text>
            </View>

            {/* CARD: LAND COMPOSITION */}
            <View style={[styles.card, { borderLeftColor: "#ca8a04" }]}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>📊 Land Composition</Text>
                <Text style={styles.cardBadge}>Area split (%)</Text>
              </View>

              <SegmentBar veg={data.veg} idle={data.idle} built={data.built} />

              <View style={styles.legendContainer}>
                <View style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendDot,
                      { backgroundColor: "#16a34a" },
                    ]}
                  />
                  <Text style={styles.legendLabel}>
                    Vegetation <Text style={styles.bold}>{data.vegD}%</Text>
                  </Text>
                </View>

                <View style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendDot,
                      { backgroundColor: "#ca8a04" },
                    ]}
                  />
                  <Text style={styles.legendLabel}>
                    Idle <Text style={styles.bold}>{data.idleD}%</Text>
                  </Text>
                </View>

                <View style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendDot,
                      { backgroundColor: "#6b7280" },
                    ]}
                  />
                  <Text style={styles.legendLabel}>
                    Built <Text style={styles.bold}>{data.builtD}%</Text>
                  </Text>
                </View>
              </View>

              <Text style={styles.footnoteText}>
                Values are adjusted to always total 100%.
              </Text>
            </View>

            {/* CARD: INDEX SNAPSHOT */}
            <View style={[styles.card, { borderLeftColor: "#6366f1" }]}>
              <Text style={styles.cardTitle}>📈 Index Distribution</Text>

              {data.hist.ndviBins.length > 0 && (
                <HistogramBars
                  title="NDVI (Vegetation)"
                  counts={data.hist.ndviBins}
                />
              )}

              {data.hist.ndwiBins.length > 0 && (
                <HistogramBars
                  title="NDWI (Moisture)"
                  counts={data.hist.ndwiBins}
                />
              )}

              {/* MEANS */}
              <View style={styles.meansGrid}>
                <View style={styles.meanChip}>
                  <Text style={styles.meanChipLabel}>NDVI Mean</Text>
                  <Text style={styles.meanChipValue}>
                    {Number.isFinite(data.means.ndviMean)
                      ? data.means.ndviMean.toFixed(3)
                      : "—"}
                  </Text>
                  <Text style={styles.meanChipHint}>Greenness</Text>
                </View>

                <View style={styles.meanChip}>
                  <Text style={styles.meanChipLabel}>NDWI Mean</Text>
                  <Text style={styles.meanChipValue}>
                    {Number.isFinite(data.means.ndwiMean)
                      ? data.means.ndwiMean.toFixed(3)
                      : "—"}
                  </Text>
                  <Text style={styles.meanChipHint}>Moisture</Text>
                </View>

                <View style={styles.meanChip}>
                  <Text style={styles.meanChipLabel}>Elevation</Text>
                  <Text style={styles.meanChipValue}>
                    {Number.isFinite(data.means.elevMean)
                      ? `${data.means.elevMean.toFixed(0)} m`
                      : "—"}
                  </Text>
                  <Text style={styles.meanChipHint}>Height</Text>
                </View>

                <View style={styles.meanChip}>
                  <Text style={styles.meanChipLabel}>Slope</Text>
                  <Text style={styles.meanChipValue}>
                    {Number.isFinite(data.means.slopeMean)
                      ? `${data.means.slopeMean.toFixed(1)}°`
                      : "—"}
                  </Text>
                  <Text style={styles.meanChipHint}>Steepness</Text>
                </View>
              </View>
            </View>

            {/* CARD: NEXT STEPS */}
            <View style={[styles.card, styles.nextStepsCard]}>
              <Text style={styles.cardTitle}>✅ What to Do Next</Text>
              <Text style={styles.cardDescription}>
                Based on entire area composition, vegetation & moisture
              </Text>

              {data.next.length > 0 ? (
                <View style={{ gap: 10, marginTop: 12 }}>
                  {data.next.map((s, idx) => (
                    <View key={idx} style={styles.stepRow}>
                      <Text style={styles.stepEmoji}>{s.emoji}</Text>
                      <Text style={styles.stepText}>{s.text}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyText}>
                  No specific recommendations available.
                </Text>
              )}
            </View>

            {/* RAW JSON TOGGLE */}
            <Pressable
              onPress={() => setShowRaw((v) => !v)}
              style={styles.toggleBtn}
            >
              <Text style={styles.toggleBtnText}>
                {showRaw ? "▲ Hide Raw Data" : "▼ Show Raw JSON"}
              </Text>
            </Pressable>

            {showRaw && (
              <View style={styles.rawBox}>
                <Text style={styles.rawText}>
                  {JSON.stringify(data.raw, null, 2)}
                </Text>
              </View>
            )}

            <View style={{ height: 24 }} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ==================== STYLES ====================
const styles = StyleSheet.create({
  scrollContainer: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 32,
    backgroundColor: "#f8fafc"},

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
    elevation: 2},

  heroCard: {
    backgroundColor: "#d1fae5",
    borderLeftColor: "#16a34a",
    borderWidth: 1,
    borderColor: "#a7f3d0"},

  heroTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#065f46",
    letterSpacing: 0.3,
    marginBottom: 6},

  heroSubtitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#166534",
    lineHeight: 20,
    marginBottom: 12},

  domainChip: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    marginTop: 6},

  domainChipText: {
    fontSize: 14,
    fontWeight: "900"},

  centerCard: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 30},

  errorCard: {
    backgroundColor: "#fef2f2",
    borderLeftColor: "#dc2626"},

  errorTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#dc2626",
    marginBottom: 8},

  errorText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#991b1b",
    marginBottom: 16,
    lineHeight: 20},

  loadingText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#64748b",
    marginTop: 12},

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
    gap: 10},

  cardTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#0f172a",
    flex: 1},

  cardBadge: {
    fontSize: 11,
    fontWeight: "800",
    backgroundColor: "#f0f0f0",
    color: "#64748b",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999},

  cardDescription: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748b",
    marginTop: 4},

  confidenceBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    alignSelf: "flex-start"},

  confidenceBadgeText: {
    fontSize: 12,
    fontWeight: "900"},

  confidenceDisplay: {
    marginVertical: 12},

  bigNumber: {
    fontSize: 42,
    fontWeight: "900",
    color: "#0f172a",
    marginBottom: 12},

  progressTrack: {
    height: 12,
    backgroundColor: "#e5e7eb",
    borderRadius: 999,
    overflow: "hidden"},

  progressFill: {
    height: "100%",
    borderRadius: 999},

  meaningText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
    marginTop: 12,
    lineHeight: 18},

  segmentTrack: {
    height: 14,
    backgroundColor: "#e5e7eb",
    borderRadius: 999,
    overflow: "hidden",
    flexDirection: "row",
    marginVertical: 12},

  segment: {
    height: "100%"},

  legendContainer: {
    marginTop: 14,
    gap: 8},

  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10},

  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6},

  legendLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1e293b",
    flex: 1},

  bold: {
    fontWeight: "900"},

  footnoteText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
    marginTop: 10,
    fontStyle: "italic"},

  histogramSection: {
    marginTop: 14,
    marginBottom: 14},

  histogramTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0f172a",
    marginBottom: 10},

  histogramBox: {
    backgroundColor: "#f3f4f6",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 10},

  histogramRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 78,
    width: "100%",
    gap: 5},

  histogramBar: {
    flex: 1,
    borderRadius: 6,
    backgroundColor: "#2563eb"},

  translationBox: {
    marginTop: 10,
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#a7f3d0",
    borderRadius: 14,
    padding: 12},

  translationTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#065f46",
    marginBottom: 8},

  translationText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#166534",
    lineHeight: 17,
    marginBottom: 4},

  directionHint: {
    fontSize: 13,
    fontWeight: "900",
    marginTop: 6,
    lineHeight: 18},

  meansGrid: {
    marginTop: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10},

  meanChip: {
    flex: 1,
    minWidth: 140,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 14,
    padding: 12,
    alignItems: "center"},

  meanChipLabel: {
    fontSize: 11,
    fontWeight: "900",
    color: "#64748b",
    marginBottom: 6},

  meanChipValue: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0f172a",
    marginBottom: 4,
    textAlign: "center"},

  meanChipHint: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94a3b8",
    textAlign: "center"},

  nextStepsCard: {
    backgroundColor: "#f0fdf4",
    borderLeftColor: "#16a34a"},

  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10},

  stepEmoji: {
    fontSize: 20,
    marginTop: 2},

  stepText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    color: "#14532d",
    lineHeight: 19},

  emptyText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#94a3b8",
    textAlign: "center",
    marginVertical: 12,
    fontStyle: "italic"},

  toggleBtn: {
    backgroundColor: "#111827",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2},

  toggleBtnText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 15},

  rawBox: {
    backgroundColor: "#0b1020",
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    marginBottom: 12},

  rawText: {
    color: "#e5e7eb",
    fontFamily: "monospace",
    fontSize: 11,
    lineHeight: 16},

  retryBtn: {
    marginTop: 12,
    backgroundColor: "#111827",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center"},

  retryBtnText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 14}});