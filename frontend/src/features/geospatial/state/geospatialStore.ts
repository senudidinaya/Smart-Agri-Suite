import { create } from "zustand";
type Basemap = "google" | "default";
type Point = { latitude: number; longitude: number };

type State = {
  overlayEnabled: boolean;
  basemap: Basemap;
  selectedPoint: Point | null;
  setOverlayEnabled: (v: boolean) => void;
  setBasemap: (b: Basemap) => void;
  setSelectedPoint: (p: Point | null) => void;
};

export const useGeospatialStore = create<State>((set) => ({
  overlayEnabled: true,
  basemap: "google",
  selectedPoint: null,
  setOverlayEnabled: (v) => set({ overlayEnabled: v }),
  setBasemap: (b) => set({ basemap: b }),
  setSelectedPoint: (p) => set({ selectedPoint: p })
}));
