/**
 * priceApi.ts
 * Reusable helper for calling the Smart Agri ML price prediction service.
 * Always falls back to the local formula if the backend is unreachable,
 * so the UI never breaks when the Python service is offline.
 */

import { ML_BASE_URL } from '../config';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SpiceType  = 'Cinnamon' | 'Pepper' | 'Cardamom' | 'Clove' | 'Nutmeg';
export type RegionType = 'Galle' | 'Kandy' | 'Matale' | 'Kurunegala' | 'Matara' | 'Kegalle';

export type PriceResult = {
  price: number;             // LKR per kg
  fromModel: boolean;        // true = real model, false = local fallback
  moistureAdjustment?: number; // % adjustment applied for moisture quality
};

// ─── Local Fallback (mirrors the logic trained in the model, simplified) ──────
// Used when the ML service is offline so the UI still gets a reasonable number.
const BASE_PRICES: Record<SpiceType, number> = {
  Cinnamon: 2400, Pepper: 1500, Cardamom: 3800, Clove: 2950, Nutmeg: 2550,
};
const REGION_FACTORS: Record<string, number> = {
  Galle: 1.08, Kandy: 1.10, Matale: 1.15, Kurunegala: 1.05, Matara: 1.06, Kegalle: 1.03,
};

function localFallback(spice: string, region: string, moisturePct: number): number {
  const base   = BASE_PRICES[spice as SpiceType]   ?? 1500;
  const factor = REGION_FACTORS[region] ?? 1.0;
  const moistureAdj = 1 + (12 - moisturePct) * 0.008; // lower moisture = better quality
  return Math.round(base * factor * moistureAdj);
}

// ─── Map any district string to a valid model region ─────────────────────────
const VALID_REGIONS: RegionType[] = ['Galle', 'Kandy', 'Matale', 'Kurunegala', 'Matara', 'Kegalle'];
const REGION_MAP: Record<string, RegionType> = {
  // exact matches
  Galle: 'Galle', Kandy: 'Kandy', Matale: 'Matale',
  Kurunegala: 'Kurunegala', Matara: 'Matara', Kegalle: 'Kegalle',
  // partial/alias mappings
  Colombo: 'Kandy', Kalutara: 'Galle', Ratnapura: 'Kegalle',
  'Nuwara Eliya': 'Kandy', Badulla: 'Matale', Hambantota: 'Matara',
  Gampaha: 'Kurunegala', Puttalam: 'Kurunegala', Ampara: 'Matara',
  Trincomalee: 'Matale', Batticaloa: 'Matara', Jaffna: 'Kurunegala',
};

function normaliseRegion(rawRegion: string): RegionType {
  if (!rawRegion) return 'Kandy';
  // Try exact match first
  const direct = REGION_MAP[rawRegion];
  if (direct) return direct;
  // Try partial match
  for (const [key, val] of Object.entries(REGION_MAP)) {
    if (rawRegion.toLowerCase().includes(key.toLowerCase())) return val;
  }
  return 'Kandy'; // safe default
}

// ─── Main API Call ────────────────────────────────────────────────────────────

/**
 * Fetch a model-predicted price per kg from the ML service.
 * Falls back gracefully to a local formula if the service is unavailable.
 *
 * @param spice       One of: Cinnamon | Pepper | Cardamom | Clove | Nutmeg
 * @param region      Farmer's district (will be normalised to a valid model region)
 * @param moisturePct Moisture content % of the harvest (default 12 = optimal)
 * @param month       Month number 1-12 (defaults to current month)
 */
export async function predictPrice(
  spice: string,
  region: string,
  moisturePct: number = 12,
  month?: number
): Promise<PriceResult> {
  const modelRegion = normaliseRegion(region);
  const modelMonth  = month ?? new Date().getMonth() + 1;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5 s timeout

    const res = await fetch(`${ML_BASE_URL}/predict/simple`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spice,
        region: modelRegion,
        moisture_pct: moisturePct,
        month: modelMonth,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    return {
      price: Math.round(data.predicted_price_LKR),
      fromModel: true,
      moistureAdjustment: data.moisture_adjustment,
    };
  } catch {
    // Backend offline or timed out — use the local formula
    return {
      price: localFallback(spice, region, moisturePct),
      fromModel: false,
    };
  }
}

export async function predictYield(spice: string, region: string, temp_c: number, rainfall_mm: number, month?: number) {
    try {
        const payload = {
            spice,
            region: normaliseRegion(region),
            temp_c,
            rainfall_mm,
            month: month || new Date().getMonth() + 1
        };
        const response = await fetch(`${ML_BASE_URL}/predict/yield`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error("Yield Prediction failed");
        const data = await response.json();
        return { yield_kg: data.predicted_yield_kg, fromModel: true };
    } catch (error) {
        console.error("Yield API failed:", error);
        return { yield_kg: 500, fromModel: false }; // fallback yield
    }
}

export async function getProfitProjection(spice: string, region: string, start_month?: number, cost_factor: number = 0.42) {
    try {
        const payload = {
            spice,
            region: normaliseRegion(region),
            start_month: start_month || new Date().getMonth() + 1,
            cost_factor
        };
        const response = await fetch(`${ML_BASE_URL}/analytics/profit-projection`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error("Profit Projection failed");
        const data = await response.json();
        return { projection: data.projection, fromModel: true };
    } catch (error) {
        console.error("Profit projection failed:", error);
        return { projection: [], fromModel: false };
    }
}

export async function getCustomerTrends() {
    try {
        const response = await fetch(`${ML_BASE_URL}/analytics/customer-trends`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) throw new Error("Trends API failed");
        const data = await response.json();
        return { trends: data.trends, fromModel: true };
    } catch (error) {
        console.error("Trends API failed:", error);
        return { trends: {}, fromModel: false };
    }
}
