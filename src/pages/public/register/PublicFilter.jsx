// src/stores/publicFilters.js
import { create } from "zustand";
import { persist } from "zustand/middleware";

export const usePublicFilters = create(
  persist(
    (set, get) => ({
      // === Geomap API keys ===
      coordinate: undefined,   // { lat: number, lon: number }
      radiusInKm: 10,          // 0..50

      // actions
      setCoordinate: (c) => set({ coordinate: c }),
      setRadiusInKm: (r) => set({ radiusInKm: r }),

      // reset (wir erweitern später um weitere API-Felder)
      reset: () =>
        set({
          coordinate: undefined,
          radiusInKm: 10,
        }),
    }),
    { name: "immobot_public_filters_geomap_v1" }
  )
);
