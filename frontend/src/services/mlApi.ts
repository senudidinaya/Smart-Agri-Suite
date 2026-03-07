import { SafeAreaView } from "react-native-safe-area-context";
import { API_BASE_URL } from "../config";

export type PredictResponse = {
  prediction: number;        // 0/1/2
  class_name: string;        // IDLE_LAND / VEGETATION_LAND / BUILT_LAND
  probabilities?: number[];  // optional if backend returns it
};

export async function predictLand(input: Record<string, number>): Promise<PredictResponse> {
  const res = await fetch(`${API_BASE_URL}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input })});

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || "Prediction failed");
  }

  return res.json();
}
