import { getState, setState } from "./index";

// Angebotsart
export function toggleOfferType(type) {
  if (!["Kauf", "Miete"].includes(type)) return getState();
  const s = getState();
  const set = new Set(s.offerTypes);
  set.has(type) ? set.delete(type) : set.add(type);
  return setState({ offerTypes: Array.from(set) });
}

// Bauprojekt → constructionStatus
export function setBauprojekt(enabled) {
  return setState({
    constructionStatus: enabled ? ["InPlanung", "ImBauInSanierung"] : [],
  });
}

// Zwangsversteigerung → searchString
export function setZwangsversteigerung(enabled) {
  return setState({ searchString: enabled ? "Zwangsversteigerung" : "" });
}

// Objektklassen (max 2)
const ALLOWED_CLASSES = new Set([
  "BüroPraxis","Einzelhandel","Ferienobjekt","Gastronomie","Gewerbeeinheit",
  "Grundstueck","HalleLagerProduktion","Haus","Hotel","LandForst",
  "Microapartements","PflegeAlter","Sonstige","StellplatzGarage","Studenten","Wohnung"
]);

export function toggleObjectClass(value) {
  if (!ALLOWED_CLASSES.has(value)) return getState();
  const s = getState();
  const set = new Set(s.objectClasses);
  if (set.has(value)) set.delete(value);
  else {
    if (set.size >= 2) return s; // Limit
    set.add(value);
  }
  return setState({ objectClasses: Array.from(set) });
}
