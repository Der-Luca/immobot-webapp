// src/pages/public/register/storage/saveFilters.js
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../../firebase";
import { getState } from "./index";

/* -------------------- Sanitizer (inline) -------------------- */
function isFiniteNumber(v) {
  if (v === "" || v === null || v === undefined) return false;
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n);
}

function normalizeRange(range) {
  if (!range || typeof range !== "object") return undefined;
  const fromValid = isFiniteNumber(range.from);
  const toValid   = isFiniteNumber(range.to);

  if (!fromValid && !toValid) return undefined;                // komplett weglassen
  if (!fromValid && toValid)   return { from: 0, to: Number(range.to) };
  if (fromValid && !toValid)   return { from: Number(range.from) };
  return { from: Number(range.from), to: Number(range.to) };
}

function sanitizeForFirestore(input) {
  if (input === null) return null;

  if (Array.isArray(input)) {
    return input.map(sanitizeForFirestore).filter(v => v !== undefined);
  }

  if (typeof input === "object") {
    const out = {};
    for (const [k, v] of Object.entries(input)) {
      if (v === undefined) continue;

      if (k.endsWith("Range")) {
        const norm = normalizeRange(v);
        if (norm !== undefined) out[k] = norm;
        continue;
      }

      const sv = sanitizeForFirestore(v);
      if (sv !== undefined) out[k] = sv;
    }
    // leere Objekte vermeiden (optional)
    if (Object.keys(out).length === 0) return undefined;
    return out;
  }

  if (typeof input === "number") {
    return Number.isFinite(input) ? input : undefined;
  }

  // strings/booleans bleiben wie sie sind
  return input;
}
/* ------------------------------------------------------------ */

/**
 * Speichert den aktuellen Filterzustand als JSON beim User.
 * - users/{uid} -> lastSearch
 */
export async function saveCurrentFiltersForUser(uid) {
  const raw = getState();                    // dein zusammengeführtes JSON (Step1–5)
  const filters = sanitizeForFirestore(raw); // 🚿 undefined/kaputte Werte entfernen

  const userDocRef = doc(db, "users", uid);
  await setDoc(
    userDocRef,
    {
      lastSearch: filters,
      lastSearchUpdatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}
