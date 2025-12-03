// src/pages/public/register/storage/step1.js
import { getState, setState } from "./index";

// Objektklassen — bereinigt
const ALLOWED_CLASSES = new Set([
  "Haus",
  "Wohnung",
  "Grundstueck",
  "StellplatzGarage",
  "BüroPraxis",
  "Ferienobjekt",
  "Gastronomie",
  "Gewerbeeinheit",
  "HalleLagerProduktion",
  "Hotel",
  "LandForst",
  "Sonstige",
  "Studenten"
]);

export function toggleObjectClass(value) {
  if (!ALLOWED_CLASSES.has(value)) return getState();
  const s = getState();
  const set = new Set(s.objectClasses);

  if (set.has(value)) set.delete(value);
  else {
    if (set.size >= 2) return s; // max 2
    set.add(value);
  }

  return setState({ objectClasses: Array.from(set) });
}
