import marketData from "../data/market.json";
import { fetchWithTimeout, API_BASE_URL } from "./apiConfig";

export interface MarketRecord {
  date: string;
  spice: string;
  farmer: string;
  district: string;
  price_per_kg: number;
  quantity: number;
}

let cachedData: MarketRecord[] = [];

export async function loadMarketData(): Promise<MarketRecord[]> {
  if (cachedData.length > 0) return cachedData;

  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/market-prices`, {}, 4000);
    const apiData = await res.json();
    if (Array.isArray(apiData) && apiData.length > 0) {
      cachedData = apiData;
      return cachedData;
    }
  } catch (e) {
    // Silence offline errors to keep Metro clean
  }

  // Fallback to local JSON if backend fails or is empty
  cachedData = marketData as MarketRecord[];
  return cachedData;
}
