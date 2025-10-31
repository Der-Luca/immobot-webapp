// components/filters/context/FiltersContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEY = "immobot.filters.v1";
const STORAGE_TTL_DAYS = 30;
const DEFAULTS = { radiusInKm: 10, size: 100, sortField: "DATUM", sortOrder: "AB" };

// kleine Helper:
const now = () => Date.now();
const days = (n) => n * 24 * 60 * 60 * 1000;

// 🔹 Laden aus localStorage
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const { savedAt, data } = JSON.parse(raw);
    if (!savedAt || !data) return null;
    if (now() - savedAt > days(STORAGE_TTL_DAYS)) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

// 🔹 Speichern in localStorage
function saveToStorage(data) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ savedAt: now(), data })
    );
  } catch {}
}

// Context anlegen
const FiltersContext = createContext(null);

// Provider
export function FiltersProvider({ children, initial }) {
  const [filters, setFilters] = useState(() => initial || loadFromStorage() || DEFAULTS);

  // Autosave mit kleinem Delay
  const tRef = useRef(null);
  useEffect(() => {
    if (tRef.current) clearTimeout(tRef.current);
    tRef.current = setTimeout(() => saveToStorage(filters), 300);
    return () => clearTimeout(tRef.current);
  }, [filters]);

  const api = useMemo(
    () => ({
      value: filters,
      set: (patch) => setFilters((prev) => ({ ...prev, ...patch })),
      reset: () => setFilters(DEFAULTS),
    }),
    [filters]
  );

  return (
    <FiltersContext.Provider value={api}>
      {children}
    </FiltersContext.Provider>
  );
}

// Hook zum Verwenden
export function useFilters() {
  const ctx = useContext(FiltersContext);
  if (!ctx) throw new Error("useFilters must be used inside FiltersProvider");
  return ctx;
}
