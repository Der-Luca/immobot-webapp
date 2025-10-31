import { getState, setState } from "./index.js";

// Preis: { from: 0, to }
export function setPriceUpper(toValue) {
  if (toValue == null) {
    // „beliebig“ → keine Einschränkung
    return setState({ priceRange: undefined });
  }
  const to = Number(toValue);
  if (!Number.isFinite(to) || to <= 0) return getState();
  return setState({ priceRange: { from: 0, to } });
}

// Fläche: { from: 0, to }
export function setSpaceUpper(toValue) {
  if (toValue == null) {
    return setState({ propertySpaceRange: undefined });
  }
  const to = Number(toValue);
  if (!Number.isFinite(to) || to <= 0) return getState();
  return setState({ propertySpaceRange: { from: 0, to } });
}

// „Auf Anfrage“-Angebote einbeziehen (intern)
export function setIncludePriceOnRequest(enabled) {
  return setState({ includePriceOnRequest: !!enabled });
}

// Helfer für Presets abhängig von Angebotstyp
export function getPricePresets() {
  const s = getState();
  const isMieteOnly = s.offerTypes.includes("Miete") && !s.offerTypes.includes("Kauf");
  if (isMieteOnly) {
    return [300, 500, 700, 900, 1200, 1500, 1800, null]; // null = „beliebig“
  }
  // Default: Kauf
  return [100000, 200000, 300000, 400000, 500000, 750000, 1000000, 1500000, 2000000, null];
}

export function getSpacePresets() {
  return [25, 50, 75, 100, 125, 150, 200, null]; // null = „beliebig“
}
