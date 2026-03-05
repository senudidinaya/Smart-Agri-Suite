const HOST_IP = "192.168.1.100"; // Fallback
// Try to grab from Expo runtime, but a hardcoded local IP is safest for Expo Go physical devices
const BASE_URL = `http://172.20.10.3:8000`; // Update this to match your Metro bundler IP if needed

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

// services/api.ts

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

