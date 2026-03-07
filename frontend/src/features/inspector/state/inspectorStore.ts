import { create } from "zustand";
import type { PixelFeatures } from "../data/inspectionRepository.mock";

type State = {
  isOpen: boolean;
  lat: number | null;
  lon: number | null;
  classId: 0 | 1 | 2 | null;
  features: PixelFeatures | null;
  open: (lat: number, lon: number) => void;
  close: () => void;
  setFeatures: (f: PixelFeatures) => void;
  setClassId: (c: 0 | 1 | 2) => void;
};

export const useInspectorStore = create<State>((set) => ({
  isOpen: false,
  lat: null,
  lon: null,
  classId: null,
  features: null,
  open: (lat, lon) => set({ isOpen: true, lat, lon }),
  close: () => set({ isOpen: false }),
  setFeatures: (f) => set({ features: f }),
  setClassId: (c) => set({ classId: c })
}));
