const KEY = "immobot_register_filters_v1";
const VERSION = 3;

export const DEFAULTS = {
  // Step1
  offerTypes: [],          // ["Kauf","Miete"]
  objectClasses: [],
  constructionStatus: [],
  searchString: "",

  // Step2
  coordinate: undefined,   // { lat, lon }
  radiusInKm: 10,

  // Step3
  priceRange: undefined,           // { from: 0, to: number } | undefined
  propertySpaceRange: undefined,   // Grundstücksfläche: { from: 0, to: number } | undefined
  usableSpaceRange: undefined,     // Wohn-/Nutzfläche: { from: 0, to: number } | undefined
  includePriceOnRequest: false,    // nur internes Flag

  __version: VERSION,
};

function hasRangeValue(range) {
  return Boolean(
    range &&
      typeof range === "object" &&
      (range.from != null || range.to != null)
  );
}

function normalizeSpaceRanges(state) {
  const next = { ...(state || {}) };
  const isGrundstueck = next.objectClasses?.includes("Grundstueck");

  if (isGrundstueck && next.objectClasses.length > 1) {
    next.objectClasses = ["Grundstueck"];
  }

  if (isGrundstueck) {
    if (!hasRangeValue(next.propertySpaceRange) && hasRangeValue(next.usableSpaceRange)) {
      next.propertySpaceRange = next.usableSpaceRange;
    }
    next.usableSpaceRange = undefined;
    return next;
  }

  if (!hasRangeValue(next.usableSpaceRange) && hasRangeValue(next.propertySpaceRange)) {
    next.usableSpaceRange = next.propertySpaceRange;
  }
  next.propertySpaceRange = undefined;
  return next;
}

export function getState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return normalizeSpaceRanges({ ...DEFAULTS });
    const parsed = JSON.parse(raw);
    if (parsed.__version !== VERSION) {
      const merged = normalizeSpaceRanges({ ...DEFAULTS, ...parsed, __version: VERSION });
      localStorage.setItem(KEY, JSON.stringify(merged));
      return merged;
    }
    return normalizeSpaceRanges({ ...DEFAULTS, ...parsed });
  } catch {
    return normalizeSpaceRanges({ ...DEFAULTS });
  }
}

export function setState(patch) {
  const next = normalizeSpaceRanges({ ...getState(), ...patch });
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {
    // localStorage kann in restriktiven Browser-Kontexten blockiert sein.
  }
  return next;
}

export function resetState() {
  const next = normalizeSpaceRanges({ ...DEFAULTS });
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {
    // localStorage kann in restriktiven Browser-Kontexten blockiert sein.
  }
  return next;
}

export function getGeomapPayload() {
  const s = getState();
  const payload = {};
  const add = (k) => {
    const v = s[k];
    const isEmptyArr = Array.isArray(v) && v.length === 0;
    if (v === undefined || v === null || v === "" || isEmptyArr) return;
    payload[k] = v;
  };
  [
    "offerTypes",
    "objectClasses",
    "constructionStatus",
    "searchString",
    "coordinate",
    "radiusInKm",
    "priceRange",
    "propertySpaceRange",
    "usableSpaceRange",
    // includePriceOnRequest ist nur intern – NICHT an Geomap senden
  ].forEach(add);
  return payload;
}


export function setOfferType(type) {
  if (!["Kauf", "Miete"].includes(type)) return getState();
  return setState({ offerTypes: [type] });
}
