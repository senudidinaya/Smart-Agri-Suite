export type LandStatusLabel = "IDLE_LAND" | "VEGETATION_LAND" | "BUILT_LAND";

export type PredictResponse = {
  prediction: 0 | 1 | 2;
  label: LandStatusLabel;
  probabilities: {
    idle_land: number;
    vegetation_land: number;
    built_land: number;
  };
  feature_count: number;
};

export type LandPoint = {
  id: string;
  title: string;
  latitude: number;
  longitude: number;

  // your model feature vector in correct order (15)
  features: number[];
};
