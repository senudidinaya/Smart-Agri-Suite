import { SafeAreaView } from "react-native-safe-area-context";
import { API_BASE_URL } from "./config";
import { PredictResponse } from "./types";

export async function healthCheck() {
  const res = await fetch(`${API_BASE_URL}/health`);
  if (!res.ok) throw new Error("Health check failed");
  return res.json();
}

export async function predict(features: number[]): Promise<PredictResponse> {
  const res = await fetch(`${API_BASE_URL}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ features })});
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Predict failed");
  }
  return res.json();
}
