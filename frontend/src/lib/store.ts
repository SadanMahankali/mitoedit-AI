"use client";
import { create } from "zustand";
import type { Design, Dose, OptResult, Prediction, Region, SimResult } from "./api";

export type Phase = "idle" | "loading" | "ready" | "error";

interface AppState {
  regions: Region[];
  selectedRegion: string | null;
  design: Design | null;
  prediction: Prediction | null;
  doses: Dose[];
  duration: number;
  heteroplasmy: number;
  sim: SimResult | null;
  opt: OptResult | null;
  phase: Phase;
  error: string | null;
  setRegions: (r: Region[]) => void;
  setSelectedRegion: (n: string) => void;
  setDesign: (d: Design) => void;
  setPrediction: (p: Prediction) => void;
  setDoses: (d: Dose[]) => void;
  addDose: (d: Dose) => void;
  removeDose: (idx: number) => void;
  setDuration: (h: number) => void;
  setHeteroplasmy: (h: number) => void;
  setSim: (s: SimResult | null) => void;
  setOpt: (o: OptResult | null) => void;
  setPhase: (p: Phase) => void;
  setError: (e: string | null) => void;
}

export const useApp = create<AppState>((set) => ({
  regions: [],
  selectedRegion: null,
  design: null,
  prediction: null,
  doses: [
    { time: 0, amount: 1.5 },
    { time: 24, amount: 1.5 },
    { time: 48, amount: 1.5 },
  ],
  duration: 96,
  heteroplasmy: 0.8,
  sim: null,
  opt: null,
  phase: "idle",
  error: null,
  setRegions: (r) => set({ regions: r }),
  setSelectedRegion: (n) => set({ selectedRegion: n }),
  setDesign: (d) => set({ design: d }),
  setPrediction: (p) => set({ prediction: p }),
  setDoses: (d) => set({ doses: d }),
  addDose: (d) => set((s) => ({ doses: [...s.doses, d].sort((a, b) => a.time - b.time) })),
  removeDose: (idx) => set((s) => ({ doses: s.doses.filter((_, i) => i !== idx) })),
  setDuration: (h) => set({ duration: h }),
  setHeteroplasmy: (h) => set({ heteroplasmy: h }),
  setSim: (s) => set({ sim: s }),
  setOpt: (o) => set({ opt: o }),
  setPhase: (p) => set({ phase: p }),
  setError: (e) => set({ error: e }),
}));
