const KEY = "immobot_register_filters_v1";
const VERSION = 2;

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
  propertySpaceRange: undefined,   // { from: 0, to: number } | undefined
  includePriceOnRequest: false,    // nur internes Flag

  __version: VERSION,
};

export function getState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    if (parsed.__version !== VERSION) {
      const merged = { ...DEFAULTS, ...parsed, __version: VERSION };
      localStorage.setItem(KEY, JSON.stringify(merged));
      return merged;
    }
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

export function setState(patch) {
  const next = { ...getState(), ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  return next;
}

export function resetState() {
  try { localStorage.setItem(KEY, JSON.stringify({ ...DEFAULTS })); } catch {}
  return { ...DEFAULTS };
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
    // includePriceOnRequest ist nur intern – NICHT an Geomap senden
  ].forEach(add);
  return payload;
}


export function setOfferType(type) {
  if (!["Kauf", "Miete"].includes(type)) return getState();
  return setState({ offerTypes: [type] });
}
