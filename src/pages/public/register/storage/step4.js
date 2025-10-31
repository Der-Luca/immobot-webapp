// src/pages/public/register/storage/step4.js
import { getState, setState } from "./index.js";

// Alle Bool-Keys, die Step4 verwaltet (Geomap-Namen!)
const AMENITY_KEYS = [
  "balconyTerrace",
  "garden",
  "parkingSpace",
  "cellar",
  "bathroomWithWindow",
  "builtInKitchen",
  "elevator",
  "underfloorHeating",
  "fireplace",
  "furnished",
  "firstTimeUse",
  "refurbished",
  "leased",
  "freeOfCommission",
  "preservationOrder",
  "divisible",
  "barrierFree",
  "airConditioningVentilation",
];

/** Liefert nur die für Step4 relevanten Booleans aus dem globalen State. */
export function readStep4State() {
  const s = getState() || {};
  const out = {};
  for (const k of AMENITY_KEYS) out[k] = !!s[k];
  return out;
}

/** Setzt einen Boolean gezielt (optional – falls du’s brauchst). */
export function setBool(key, value) {
  if (!AMENITY_KEYS.includes(key)) return getState();
  const cur = getState() || {};
  return setState({ ...cur, [key]: !!value });
}

/** Toggle für einen Boolean (wird in Step4Optional.jsx benutzt). */
export function toggleBool(key) {
  if (!AMENITY_KEYS.includes(key)) return getState();
  const cur = getState() || {};
  const next = !cur[key];
  return setState({ ...cur, [key]: next });
}

/** Optional: mehrere auf einmal setzen. */
export function setManyBools(partial) {
  const cur = getState() || {};
  const patch = {};
  for (const k of AMENITY_KEYS) {
    if (k in partial) patch[k] = !!partial[k];
  }
  return setState({ ...cur, ...patch });
}
