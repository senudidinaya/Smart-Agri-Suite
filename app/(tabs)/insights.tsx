import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Dimensions,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Switch } from "react-native";
import { LineChart } from "react-native-chart-kit";

import { colors } from "@/constants/colors";
import InsightCard from "@/components/InsightCard";

type Region = "Galle" | "Kandy" | "Kegalle" | "Kurunegala" | "Matale" | "Matara";
type Spice = "Cardamom" | "Cinnamon" | "Clove" | "Nutmeg" | "Pepper";

const REGIONS: Region[] = ["Galle", "Kandy", "Kegalle", "Kurunegala", "Matale", "Matara"];
const SPICES: Spice[] = ["Cardamom", "Cinnamon", "Clove", "Nutmeg", "Pepper"];

// Android emulator -> 10.0.2.2
const API_URL = "http://10.0.2.2:5000/predict";
// For real phone (same Wi-Fi) use your PC IP:
// const API_URL = "http://192.168.1.20:5000/predict";

type PredictResponse = {
  date: string;
  region: string;
  spice: string;
  is_festival: boolean;
  predicted_qty_kg: number;
  predicted_price_LKR_per_kg: number;
  festival_effect_message: string;
};

type RangePoint = {
  dateStr: string;
  qtyKg: number;
  price: number;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function toYMD(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function formatPretty(d: Date) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}
function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}
function isAfter(a: Date, b: Date) {
  return a.getTime() > b.getTime();
}
function clampRange(start: Date, end: Date) {
  if (isAfter(start, end)) return { start: end, end: start };
  return { start, end };
}

function buildWeeklyDates(start: Date, end: Date) {
  const { start: s, end: e } = clampRange(start, end);
  const dates: Date[] = [];
  let cur = new Date(s);
  while (!isAfter(cur, e)) {
    dates.push(new Date(cur));
    cur = addDays(cur, 7);
  }

  const last = dates[dates.length - 1];
  if (last && toYMD(last) !== toYMD(e)) dates.push(new Date(e));
  if (!last) dates.push(new Date(e));
  return dates;
}

export default function Insights() {
  const screenW = Dimensions.get("window").width;

  const [region, setRegion] = useState<Region>("Kandy");
  const [spice, setSpice] = useState<Spice>("Cinnamon");
  const [isFestival, setIsFestival] = useState(true);


  const [dateObj, setDateObj] = useState<Date>(new Date("2025-05-10"));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const dateStr = useMemo(() => toYMD(dateObj), [dateObj]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PredictResponse | null>(null);


  const [rangeStart, setRangeStart] = useState<Date>(new Date("2025-05-01"));
  const [rangeEnd, setRangeEnd] = useState<Date>(new Date("2025-06-30"));
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const [rangeLoading, setRangeLoading] = useState(false);
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [rangePoints, setRangePoints] = useState<RangePoint[]>([]);

  async function callPredict(dStr: string): Promise<PredictResponse> {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: dStr,
        region,
        spice,
        is_festival: isFestival,
      }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
    return data as PredictResponse;
  }

  async function fetchPrediction() {
    setLoading(true);
    setError(null);

    try {
      const data = await callPredict(dateStr);
      setResult(data);
    } catch (e: any) {
      setResult(null);
      setError(e?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function generateRangeForecast() {
    setRangeLoading(true);
    setRangeError(null);
    setRangePoints([]);

    try {
      const dates = buildWeeklyDates(rangeStart, rangeEnd);

      const points: RangePoint[] = [];
      for (const d of dates) {
        const dStr = toYMD(d);
        const r = await callPredict(dStr);
        points.push({
          dateStr: r.date,
          qtyKg: Number(r.predicted_qty_kg ?? 0),
          price: Number(r.predicted_price_LKR_per_kg ?? 0),
        });
      }
      setRangePoints(points);
    } catch (e: any) {
      setRangeError(e?.message || "Range forecast failed");
    } finally {
      setRangeLoading(false);
    }
  }


  useEffect(() => {
    fetchPrediction();

}, [region, spice, isFestival, dateStr]);

  const demandGrams = useMemo(() => {
    const kg = result?.predicted_qty_kg ?? 0;
    return Math.round(kg * 1000);
  }, [result]);

  const onDateChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") setShowDatePicker(false);
    if (selected) setDateObj(selected);
  };

  const onStartChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") setShowStartPicker(false);
    if (selected) setRangeStart(selected);
  };

  const onEndChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") setShowEndPicker(false);
    if (selected) setRangeEnd(selected);
  };


  const rangeLabels = useMemo(() => {

    return rangePoints.map((p) => {
      const [y, m, d] = p.dateStr.split("-");
      return `${m}/${d}`;
    });
  }, [rangePoints]);

  const qtySeries = useMemo(() => rangePoints.map((p) => Math.round(p.qtyKg)), [rangePoints]);
  const priceSeries = useMemo(() => rangePoints.map((p) => Math.round(p.price)), [rangePoints]);


  const labelEvery = useMemo(() => {
    const n = rangeLabels.length;
    if (n <= 6) return 1;
    if (n <= 10) return 2;
    if (n <= 14) return 3;
    return 4;
  }, [rangeLabels.length]);

  const chartW = Math.max(screenW - 32, 320);

  const chartConfig = {
    backgroundGradientFrom: colors.card,
    backgroundGradientTo: colors.card,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
    propsForDots: { r: "3" },
    propsForBackgroundLines: { stroke: colors.border },
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
      <Text style={styles.title}>AI Insights</Text>
      <Text style={styles.subtitle}>Forecast demand & price using your Flask model</Text>


      <View style={styles.panel}>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Date</Text>

            <TouchableOpacity style={styles.inputLike} activeOpacity={0.85} onPress={() => setShowDatePicker(true)}>
              <Text style={styles.inputText}>{formatPretty(dateObj)}</Text>
              <Text style={styles.chev}>▾</Text>
            </TouchableOpacity>

            <Text style={styles.helper}>API sends: {dateStr}</Text>
          </View>
        </View>


        <View style={[styles.row, { marginTop: 12 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Region</Text>
            <View style={styles.pickerWrap}>
              <Picker selectedValue={region} onValueChange={(v) => setRegion(v)} style={styles.picker}>
                {REGIONS.map((r) => (
                  <Picker.Item key={r} label={r} value={r} />
                ))}
              </Picker>
            </View>
          </View>
        </View>


        <View style={[styles.row, { marginTop: 12 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Spice</Text>
            <View style={styles.pickerWrap}>
              <Picker selectedValue={spice} onValueChange={(v) => setSpice(v)} style={styles.picker}>
                {SPICES.map((s) => (
                  <Picker.Item key={s} label={s} value={s} />
                ))}
              </Picker>
            </View>
          </View>
        </View>


        <View style={[styles.rowBetween, { marginTop: 12 }]}>
          <View>
            <Text style={styles.label}>Festival Week</Text>
            <Text style={styles.helper}>Toggle to compare festival effect</Text>
          </View>
          <Switch value={isFestival} onValueChange={setIsFestival} />
        </View>


        <TouchableOpacity style={styles.refreshBtn} onPress={fetchPrediction} activeOpacity={0.85}>
          <Text style={styles.refreshText}>Refresh Prediction</Text>
        </TouchableOpacity>
      </View>


      {showDatePicker && (
        <DateTimePicker
          value={dateObj}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={onDateChange}
        />
      )}


      {loading && (
        <View style={styles.centerBox}>
          <ActivityIndicator />
          <Text style={styles.mutedText}>Fetching forecast…</Text>
        </View>
      )}

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>API Error</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={[styles.errorText, { marginTop: 6 }]}>Android emulator needs 10.0.2.2 (not localhost).</Text>
        </View>
      )}


      {!loading && !error && (
        <>
          <View style={{ marginTop: 14 }}>
            <InsightCard title="Predicted Demand" value={demandGrams.toLocaleString()} unit="g" />
          </View>

          <View style={{ marginTop: 14 }}>
            <InsightCard
              title="Predicted Price"
              value={(result?.predicted_price_LKR_per_kg ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              unit="LKR/kg"
            />
          </View>

          {!!result?.festival_effect_message && (
            <View style={[styles.panel, { marginTop: 14 }]}>
              <Text style={styles.panelTitle}>Festival Effect</Text>
              <Text style={styles.panelBody}>{result.festival_effect_message}</Text>
            </View>
          )}
        </>
      )}


      <View style={[styles.panel, { marginTop: 18 }]}>
        <Text style={styles.panelTitle}>Range Forecast</Text>
        <Text style={[styles.helper, { marginTop: 4 }]}>
          Select a start & end date. We will generate weekly predictions (step = 7 days).
        </Text>

        {/* Range pickers */}
        <View style={{ marginTop: 12 }}>
          <Text style={styles.label}>Start Date</Text>
          <TouchableOpacity style={styles.inputLike} activeOpacity={0.85} onPress={() => setShowStartPicker(true)}>
            <Text style={styles.inputText}>{formatPretty(rangeStart)}</Text>
            <Text style={styles.chev}>▾</Text>
          </TouchableOpacity>
        </View>

        <View style={{ marginTop: 12 }}>
          <Text style={styles.label}>End Date</Text>
          <TouchableOpacity style={styles.inputLike} activeOpacity={0.85} onPress={() => setShowEndPicker(true)}>
            <Text style={styles.inputText}>{formatPretty(rangeEnd)}</Text>
            <Text style={styles.chev}>▾</Text>
          </TouchableOpacity>
        </View>

        {showStartPicker && (
          <DateTimePicker
            value={rangeStart}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={onStartChange}
          />
        )}

        {showEndPicker && (
          <DateTimePicker
            value={rangeEnd}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={onEndChange}
          />
        )}

        <TouchableOpacity
          style={[styles.refreshBtn, { marginTop: 14 }]}
          onPress={generateRangeForecast}
          activeOpacity={0.85}
        >
          <Text style={styles.refreshText}>Generate Range Forecast</Text>
        </TouchableOpacity>

        {rangeLoading && (
          <View style={styles.centerBox}>
            <ActivityIndicator />
            <Text style={styles.mutedText}>Generating range forecast…</Text>
          </View>
        )}

        {rangeError && (
          <View style={[styles.errorBox, { marginTop: 12 }]}>
            <Text style={styles.errorTitle}>Range Forecast Error</Text>
            <Text style={styles.errorText}>{rangeError}</Text>
          </View>
        )}

        {/* Charts */}
        {!rangeLoading && !rangeError && rangePoints.length > 1 && (
          <>
            <View style={{ marginTop: 16 }}>
              <Text style={styles.chartTitle}>Predicted Quantity (kg)</Text>
              <LineChart
                data={{
                  labels: rangeLabels.map((l, i) => (i % labelEvery === 0 ? l : "")),
                  datasets: [{ data: qtySeries }],
                }}
                width={chartW}
                height={220}
                yAxisSuffix=""
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
              />
            </View>

            <View style={{ marginTop: 16 }}>
              <Text style={styles.chartTitle}>Predicted Price (LKR/kg)</Text>
              <LineChart
                data={{
                  labels: rangeLabels.map((l, i) => (i % labelEvery === 0 ? l : "")),
                  datasets: [{ data: priceSeries }],
                }}
                width={chartW}
                height={220}
                yAxisSuffix=""
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
              />
            </View>

            <Text style={[styles.helper, { marginTop: 10 }]}>
              Points: {rangePoints.length} (weekly + end-date included)
            </Text>
          </>
        )}

        {!rangeLoading && !rangeError && rangePoints.length === 1 && (
          <Text style={[styles.helper, { marginTop: 12 }]}>
            Range too small — pick a wider range to show a line chart.
          </Text>
        )}
      </View>

      <View style={{ height: 28 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 28 },

  title: { fontSize: 22, fontWeight: "900", color: colors.text },
  subtitle: { marginTop: 6, color: colors.muted, fontWeight: "700" },

  panel: {
    marginTop: 14,
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },

  row: { flexDirection: "row", alignItems: "center" },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },

  label: { color: colors.text, fontWeight: "900", marginBottom: 8 },
  helper: { marginTop: 6, color: colors.muted, fontWeight: "700", fontSize: 12 },

  inputLike: {
    minHeight: 44,
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  inputText: { color: colors.text, fontWeight: "800" },
  chev: { color: colors.muted, fontWeight: "900" },

  pickerWrap: {
    minHeight: Platform.OS === "android" ? 56 : 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    backgroundColor: colors.bg,
    justifyContent: "center",
  },
  picker: {
    height: Platform.OS === "android" ? 56 : 44,
    width: "100%",
    ...(Platform.OS === "android" ? { paddingVertical: 6 } : {}),
  },

  refreshBtn: {
    marginTop: 14,
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
  },
  refreshText: { color: "white", fontWeight: "900" },

  centerBox: { marginTop: 16, alignItems: "center" },
  mutedText: { marginTop: 8, color: colors.muted, fontWeight: "700" },

  errorBox: {
    marginTop: 14,
    backgroundColor: "#FEE2E2",
    borderRadius: 16,
    padding: 14,
    borderLeftWidth: 5,
    borderLeftColor: "#EF4444",
  },
  errorTitle: { fontWeight: "900", color: "#991B1B" },
  errorText: { marginTop: 6, color: "#991B1B", lineHeight: 18 },

  panelTitle: { fontSize: 14, fontWeight: "900", color: colors.text },
  panelBody: { marginTop: 8, color: colors.muted, lineHeight: 18, fontWeight: "700" },

  chartTitle: { fontSize: 13, fontWeight: "900", color: colors.text, marginBottom: 8 },
  chart: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
