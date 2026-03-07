export type FeatureKey =
  | "NDVI" | "SAVI" | "EVI" | "NDWI"
  | "ELEVATION" | "SLOPE" | "ASPECT"
  | "B2" | "B3" | "B4" | "B8"
  | "NDVI_MEAN" | "NDVI_STD" | "NIR_MEAN" | "NIR_STD";

export const FEATURE_GROUPS = [
  { title: "Vegetation Indices", items: [
    { key: "NDVI", label: "NDVI", hint: "Vegetation intensity indicator" },
    { key: "SAVI", label: "SAVI", hint: "Adjusted for soil brightness" },
    { key: "EVI", label: "EVI", hint: "Enhanced vegetation index" },
    { key: "NDWI", label: "NDWI", hint: "Moisture / water signal" }
  ]},
  { title: "Terrain", items: [
    { key: "ELEVATION", label: "Elevation", hint: "Height above sea level", unit: "m" },
    { key: "SLOPE", label: "Slope", hint: "Steepness of terrain", unit: "°" },
    { key: "ASPECT", label: "Aspect", hint: "Direction slope faces", unit: "°" }
  ]},
  { title: "Spectral Bands (Sentinel‑2)", items: [
    { key: "B2", label: "B2 (Blue)", hint: "Visible blue reflectance" },
    { key: "B3", label: "B3 (Green)", hint: "Visible green reflectance" },
    { key: "B4", label: "B4 (Red)", hint: "Visible red reflectance" },
    { key: "B8", label: "B8 (NIR)", hint: "Near‑infrared reflectance" }
  ]},
  { title: "Texture (3×3 neighborhood)", items: [
    { key: "NDVI_MEAN", label: "NDVI mean", hint: "Local average NDVI" },
    { key: "NDVI_STD", label: "NDVI std", hint: "Local NDVI variability" },
    { key: "NIR_MEAN", label: "NIR mean", hint: "Local average NIR" },
    { key: "NIR_STD", label: "NIR std", hint: "Local NIR variability" }
  ]}
] as const;
