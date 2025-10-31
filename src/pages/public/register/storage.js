// Lokaler Storage-Key
const KEY = "immobot_register_filters_v1";

// Nur Geomap-Keys, so wie die API sie erwartet
const DEFAULTS = {
  offerTypes: [],            // ["Kauf","Miete"]
  objectClasses: [],         // z. B. ["Wohnung","Haus"] (max 2 in der UI)
  constructionStatus: [],    // wenn Bauprojekt aktiv -> ["InPlanung","ImBauInSanierung"]
  searchString: "",          // wenn Zwangsversteigerung aktiv -> "Zwangsversteigerung"
};

// --- Core get/set ---
export function getFilters() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

export function setFilters(partial) {
  const current = getFilters();
  const next = { ...current, ...partial };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
  return next;
}

export function resetFilters() {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...DEFAULTS }));
  } catch {}
  return { ...DEFAULTS };
}

// --- Actions (nur Geomap-Keys) ---

export function toggleOfferType(type) {
  if (!["Kauf", "Miete"].includes(type)) return getFilters();
  const cur = getFilters();
  const set = new Set(cur.offerTypes);
  set.has(type) ? set.delete(type) : set.add(type);
  return setFilters({ offerTypes: Array.from(set) });
}

export function setBauprojekt(enabled) {
  // mappt UI-Button "Bauprojekt" auf constructionStatus
  return setFilters({
    constructionStatus: enabled ? ["InPlanung", "ImBauInSanierung"] : [],
  });
}

export function setZwangsversteigerung(enabled) {
  // Button "Zwangsversteigerung" -> searchString
  return setFilters({ searchString: enabled ? "Zwangsversteigerung" : "" });
}

export function toggleObjectClass(value) {
  const ALLOWED = new Set([
    "BüroPraxis", "Einzelhandel", "Ferienobjekt", "Gastronomie",
    "Gewerbeeinheit", "Grundstueck", "HalleLagerProduktion",
    "Haus", "Hotel", "LandForst", "Microapartements",
    "PflegeAlter", "Sonstige", "StellplatzGarage",
    "Studenten", "Wohnung"
  ]);
  if (!ALLOWED.has(value)) return getFilters();

  const cur = getFilters();
  const set = new Set(cur.objectClasses);

  if (set.has(value)) set.delete(value);
  else {
    if (set.size >= 2) return cur; // max. zwei
    set.add(value);
  }
  return setFilters({ objectClasses: Array.from(set) });
}

// Optional: Payload-Vorschau
export function getGeomapPayload() {
  const { offerTypes, objectClasses, constructionStatus, searchString } = getFilters();
  const payload = {};
  if (offerTypes?.length) payload.offerTypes = offerTypes;
  if (objectClasses?.length) payload.objectClasses = objectClasses;
  if (constructionStatus?.length) payload.constructionStatus = constructionStatus;
  if (searchString) payload.searchString = searchString;
  return payload;
}
