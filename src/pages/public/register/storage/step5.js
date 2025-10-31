// step5.js – advanced filters (arrays + ranges)
import { getState, setState } from "./index.js";

/** Array-Feld (Enums) toggeln – z. B. energySources, heatingTypes, energyRatings, energyEfficiencyStandards */
export function toggleInArray(field, value) {
  const s = getState();
  const arr = Array.isArray(s[field]) ? [...s[field]] : [];
  const idx = arr.indexOf(value);
  if (idx >= 0) arr.splice(idx, 1);
  else arr.push(value);
  return setState({ [field]: arr.length ? arr : undefined });
}

/** Range setzen – leere Felder entfernen; numerisch säubern */
export function setRange(field, from, to) {
  const f = numOrUndefined(from);
  const t = numOrUndefined(to);

  if (f == null && t == null) {
    // ganz entfernen, wenn beides leer
    return setState({ [field]: undefined });
  }
  return setState({ [field]: { ...(f != null ? { from: f } : {}), ...(t != null ? { to: t } : {}) } });
}

function numOrUndefined(v) {
  if (v === "" || v == null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/** Für initiales Rendering in Step5. */
export function readStep5State() {
  const s = getState();
  return {
    energySources: s.energySources || [],
    heatingTypes: s.heatingTypes || [],
    energyRatings: s.energyRatings || [],
    energyEfficiencyStandards: s.energyEfficiencyStandards || [],
    pricePerSqmRange: s.pricePerSqmRange,
    yieldRange: s.yieldRange,
    energyConsumptionRange: s.energyConsumptionRange,
    constructionYearRange: s.constructionYearRange,
  };
}
