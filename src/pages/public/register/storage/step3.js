// src/pages/public/register/storage/step3.js
import { getState, setState } from "./index.js";

// ---------------------------------------
// HELFER: Bereich speichern {from, to}
// ---------------------------------------
export function setSpacePreset(preset) {
  const s = getState();
  const isGrundstueck = s.objectClasses?.includes("Grundstueck");
  const field = isGrundstueck ? "propertySpaceRange" : "usableSpaceRange";
  const otherField = isGrundstueck ? "usableSpaceRange" : "propertySpaceRange";

  if (preset === null) {
    // beliebig
    return setState({ [field]: undefined, [otherField]: undefined });
  }

  if (preset.type === "max") {
    // bis X
    return setState({
      [field]: { from: 0, to: preset.value },
      [otherField]: undefined,
    });
  }

  if (preset.type === "min") {
    // ab X
    return setState({
      [field]: { from: preset.value, to: 9999999 },
      [otherField]: undefined,
    });
  }
}

// ---------------------------------------
// PREISE (wie du es vorher hattest)
// ---------------------------------------
export function setPriceUpper(toValue) {
  if (toValue == null) {
    return setState({ priceRange: undefined });
  }
  const to = Number(toValue);
  if (!Number.isFinite(to) || to <= 0) return getState();
  return setState({ priceRange: { from: 0, to } });
}

export function getPricePresets() {
  const s = getState();
  const isRentOnly =
    s.offerTypes.includes("Miete") &&
    !s.offerTypes.includes("Kauf");

  // Miete
  if (isRentOnly) {
    return [300, 500, 700, 900, 1200, 1500, 1800, null];
  }

  // Kauf & Grundstück
  return [150000, 250000, 400000, 600000, 800000, 1000000, 1500000, null];
}

// ---------------------------------------
// FLÄCHE PRESETS (NEU!)
// ---------------------------------------
export function getSpacePresets() {
  const s = getState();
  const isGrundstueck = s.objectClasses?.includes("Grundstueck");

  // Grundstück gewinnt → Haus/Wohnung ignorieren
  if (isGrundstueck) {
    return [
      { type: "max", value: 500 },     // bis 500
      { type: "min", value: 500 },     // ab 500
      null                             // beliebig
    ];
  }

  // Haus/Wohnung
  return [
    { type: "max", value: 100 },       // bis 100
    { type: "min", value: 100 },       // ab 100
    null                               // beliebig
  ];
}
