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
  const prevIsGrundstueck = s.objectClasses?.includes("Grundstueck");
  const set = new Set(s.objectClasses);

  if (set.has(value)) {
    set.delete(value);
  } else if (value === "Grundstueck") {
    set.clear();
    set.add(value);
  } else {
    set.delete("Grundstueck");
    if (set.size >= 2) return s; // max 2
    set.add(value);
  }

  const nextClasses = Array.from(set);
  const nextIsGrundstueck = nextClasses.includes("Grundstueck");
  const patch = { objectClasses: nextClasses };

  if (prevIsGrundstueck !== nextIsGrundstueck) {
    patch.propertySpaceRange = undefined;
    patch.usableSpaceRange = undefined;
  }

  return setState(patch);
}
