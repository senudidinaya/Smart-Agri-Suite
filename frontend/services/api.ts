import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Dynamic API endpoint for the Smart Pricing & Logistics backend (Node.js on port 5000).
 * Uses dynamic IP detection so it works on both physical devices and emulators.
 */
const getPricingAPIEndpoint = () => {
  let hostIP = "172.20.10.14"; // Fallback IP

  try {
    const hostUri = Constants.expoConfig?.hostUri || Constants.experienceUrl;

    if (hostUri) {
      const rawUrl = (hostUri as string).replace('exp://', '');
      hostIP = rawUrl.split(':')[0];
    } else if (__DEV__ && Platform.OS === 'android') {
      hostIP = "10.0.2.2";
    } else if (__DEV__ && Platform.OS === 'ios') {
      hostIP = "localhost";
    }
  } catch (e) {
    console.warn("Failed to extract dynamic IP for pricing API, using fallback", e);
  }

  return `http://${hostIP}:5000`;
};

const BASE_URL = getPricingAPIEndpoint();

export type PredictionPayload = {
  month: number;
  region: string;
  spice: string;
  qty_sold_kg: number;
  temp_c: number;
  rainfall_mm: number;
  humidity_pct: number;
  monsoon_sw_flag: number;
  monsoon_ne_flag: number;
  qty_sold_kg_4w_ma: number;
  market_price_LKR_4w_ma: number;
  rainfall_mm_4w_ma: number;
  temp_c_4w_ma: number;
};

export async function predictPrice(payload: PredictionPayload) {
  const response = await fetch(`${BASE_URL}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Prediction failed");
  }

  return response.json();
}

export type WeatherData = {
  temp: number;
  humidity: number;
  rainfall?: number;
  source: string;
};


export async function fetchWeather(
  latitude: number,
  longitude: number
) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,precipitation`;

    const response = await fetch(url);

    if (!response.ok) {
      const text = await response.text();
      console.error("Weather API error:", text);
      throw new Error("Weather API request failed");
    }

    return await response.json();
  } catch (error) {
    console.error("fetchWeather failed:", error);
    throw error;
  }
}
