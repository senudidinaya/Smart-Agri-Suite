import { seeded } from "@/shared/utils/seed";
import type { FeatureKey } from "../domain/featureSchema";

export type PixelFeatures = Record<FeatureKey, number>;

const R: Record<FeatureKey, { min: number; max: number; d: number }> = {
  NDVI: { min: 0.11, max: 0.82, d: 3 },
  SAVI: { min: 0.07, max: 0.55, d: 3 },
  EVI: { min: 0.11, max: 0.59, d: 3 },
  NDWI: { min: -0.71, max: -0.14, d: 3 },
  ELEVATION: { min: 3, max: 37, d: 1 },
  SLOPE: { min: 0, max: 2.1, d: 2 },
  ASPECT: { min: 0, max: 360, d: 0 },
  B2: { min: 0.006, max: 0.057, d: 4 },
  B3: { min: 0.005, max: 0.069, d: 4 },
  B4: { min: 0.001, max: 0.062, d: 4 },
  B8: { min: 0.015, max: 0.238, d: 4 },
  NDVI_MEAN: { min: 0.11, max: 0.81, d: 3 },
  NDVI_STD: { min: 0.02, max: 0.10, d: 3 },
  NIR_MEAN: { min: 0.015, max: 0.237, d: 4 },
  NIR_STD: { min: 0.009, max: 0.024, d: 4 }
};

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const round = (n: number, d: number) => Math.round(n * Math.pow(10, d)) / Math.pow(10, d);

export async function inspectPixel(lat: number, lon: number): Promise<PixelFeatures> {
  const base = seeded(`${lat.toFixed(5)}|${lon.toFixed(5)}`);
  const out = {} as PixelFeatures;
  (Object.keys(R) as FeatureKey[]).forEach((k, i) => {
    const r = R[k];
    const u = base(i);
    let v = r.min + (r.max - r.min) * u;
    if (k === "NDVI" || k === "SAVI" || k === "EVI") {
      const nir = R.B8.min + (R.B8.max - R.B8.min) * base(99);
      v = clamp(v * 0.7 + nir * 0.3, r.min, r.max);
    }
    out[k] = round(v, r.d);
  });
  return out;
}
