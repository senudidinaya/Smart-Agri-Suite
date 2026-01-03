import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, FlatList, SafeAreaView, Text, TouchableOpacity, View, ActivityIndicator } from "react-native";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";
import AsyncStorage from "@react-native-async-storage/async-storage";

type AnalysisResult = {
  transcript?: string;
  risk?: "LOW" | "MEDIUM" | "HIGH";
  score?: number; // 0..1
  reasons?: string[];
};

type HistoryItem = {
  id: string;
  createdAt: string;
  localUri: string;
  result: AnalysisResult;
};

const HISTORY_KEY = "smartagri_voice_history_v1";

// IMPORTANT: On real phone, 127.0.0.1 means the phone itself.
// Put your PC LAN IP here later like: http://192.168.1.9:8000
// const API_BASE_URL = "http://127.0.0.1:8000";
const API_BASE_URL = "http://192.168.1.9:8000";


export default function App() {
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    (async () => {
      const perm = await Audio.requestPermissionsAsync();
      setPermissionGranted(perm.granted);
      await loadHistory();
    })();
  }, []);

  async function loadHistory() {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    if (!raw) return;
    try {
      setHistory(JSON.parse(raw));
    } catch {
      // ignore
    }
  }

  async function saveHistory(items: HistoryItem[]) {
    setHistory(items);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(items));
  }

  async function startRecording() {
    if (!permissionGranted) {
      Alert.alert("Mic permission not granted", "Allow microphone permission and try again.");
      return;
    }

    try {
      setResult(null);
      setAudioUri(null);

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      setRecording(rec);
    } catch (e: any) {
      Alert.alert("Recording failed", String(e?.message ?? e));
    }
  }

  async function stopRecording() {
    if (!recording) return;
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);

      if (!uri) {
        Alert.alert("No file", "Recording URI not found.");
        return;
      }

      // Move to app cache with a stable name
      const out = FileSystem.cacheDirectory + `call_${Date.now()}.m4a`;
      await FileSystem.copyAsync({ from: uri, to: out });

      setAudioUri(out);
    } catch (e: any) {
      Alert.alert("Stop failed", String(e?.message ?? e));
    }
  }

  async function analyze() {
  if (!audioUri) {
    Alert.alert("No audio", "Record something first.");
    return;
  }

  setIsAnalyzing(true);

  try {
    const form = new FormData();
    form.append("file", {
      uri: audioUri,
      name: "call.m4a",
      type: "audio/mp4",
    } as any);

    const resp = await fetch(`${API_BASE_URL}/calls/analyze`, {
      method: "POST",
      body: form,
    });

    const text = await resp.text(); // raw body first
    console.log("status:", resp.status);
    console.log("raw:", text);

    if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${text}`);

    const data: AnalysisResult = JSON.parse(text);
    setResult(data);

    const item: HistoryItem = {
      id: String(Date.now()),
      createdAt: new Date().toISOString(),
      localUri: audioUri,
      result: data ?? {},
    };

    const next = [item, ...history].slice(0, 20);
    await saveHistory(next);
  } catch (e: any) {
    setResult(null);
    Alert.alert("Analyze failed", String(e?.message ?? e));
  } finally {
    setIsAnalyzing(false);
  }
}

  async function clearHistory() {
    await AsyncStorage.removeItem(HISTORY_KEY);
    setHistory([]);
  }

  const recordBtnText = useMemo(() => (recording ? "Recording..." : "Start Recording"), [recording]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0b1220" }}>
      <View style={{ padding: 16, gap: 12 }}>
        <Text style={{ color: "white", fontSize: 22, fontWeight: "700" }}>SmartAgri Voice Triage</Text>
        <Text style={{ color: "#b9c2d0" }}>
          Record a short call snippet → analyze → get a triage risk (LOW/MED/HIGH).
        </Text>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <TouchableOpacity
            onPress={recording ? stopRecording : startRecording}
            style={{
              flex: 1,
              padding: 14,
              borderRadius: 12,
              backgroundColor: recording ? "#b91c1c" : "#2563eb",
              alignItems: "center",
            }}
          >
            <Text style={{ color: "white", fontWeight: "700" }}>{recording ? "Stop Recording" : recordBtnText}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={analyze}
            disabled={!audioUri || isAnalyzing}
            style={{
              flex: 1,
              padding: 14,
              borderRadius: 12,
              backgroundColor: !audioUri || isAnalyzing ? "#334155" : "#16a34a",
              alignItems: "center",
            }}
          >
            {isAnalyzing ? <ActivityIndicator /> : <Text style={{ color: "white", fontWeight: "700" }}>Analyze</Text>}
          </TouchableOpacity>
        </View>

        <View style={{ padding: 14, borderRadius: 12, backgroundColor: "#111a2e", gap: 6 }}>
          <Text style={{ color: "white", fontWeight: "700" }}>Latest Result</Text>
          <Text style={{ color: "#b9c2d0" }}>Audio: {audioUri ? "✅ recorded" : "—"}</Text>
          <Text style={{ color: "#b9c2d0" }}>Risk: {result?.risk ?? "—"}</Text>
          <Text style={{ color: "#b9c2d0" }}>Score: {result?.score != null ? result.score.toFixed(2) : "—"}</Text>
          <Text style={{ color: "#b9c2d0" }}>Transcript: {result?.transcript ?? "—"}</Text>

          {!!result?.reasons?.length && (
            <View style={{ marginTop: 6 }}>
              {result.reasons.slice(0, 5).map((r, i) => (
                <Text key={i} style={{ color: "#dbe4ff" }}>
                  • {r}
                </Text>
              ))}
            </View>
          )}
        </View>

        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
          <Text style={{ color: "white", fontWeight: "700" }}>History (last {history.length})</Text>
          <TouchableOpacity onPress={clearHistory}>
            <Text style={{ color: "#93c5fd" }}>Clear</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={history}
          keyExtractor={(x) => x.id}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => (
            <View style={{ padding: 12, borderRadius: 12, backgroundColor: "#111a2e" }}>
              <Text style={{ color: "white", fontWeight: "700" }}>
                {new Date(item.createdAt).toLocaleString()}
              </Text>
              <Text style={{ color: "#b9c2d0" }}>Risk: {item.result.risk ?? "—"} | Score: {item.result.score?.toFixed(2) ?? "—"}</Text>
              <Text style={{ color: "#b9c2d0" }} numberOfLines={2}>
                {item.result.transcript ?? "—"}
              </Text>
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
}
