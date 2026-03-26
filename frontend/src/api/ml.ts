import { SafeAreaView } from "react-native-safe-area-context";
import { API_BASE_URL } from "../config";

export type ModelInput = {
  NDVI: number;
  EVI: number;
  SAVI: number;
  NDWI: number;
  ELEV: number;
  SLOPE: number;
  ASPECT: number;
  B2: number;
  B3: number;
  B4: number;
  B8: number;
  NDVI_mean_3x3: number;
  NDVI_std_3x3: number;
  NIR_mean_3x3: number;
  NIR_std_3x3: number;
};

export type PredictResponse = {
  prediction: 0 | 1 | 2;
  label?: string;
  probabilities?: Record<string, number>;
};

export async function healthCheck() {
  const res = await fetch(`${API_BASE_URL}/health`);
  if (!res.ok) throw new Error(`Health failed: ${res.status}`);
  return res.json();
}

export async function predict(input: ModelInput): Promise<PredictResponse> {
  const res = await fetch(`${API_BASE_URL}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input })});

  const text = await res.text();
  if (!res.ok) throw new Error(text);
  return JSON.parse(text);
}
