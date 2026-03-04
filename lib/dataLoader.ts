import marketData from "../data/market.json";

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

  cachedData = marketData as MarketRecord[];

  return cachedData;
}
