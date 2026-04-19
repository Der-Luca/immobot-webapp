import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../../firebase";
import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../../../contexts/AuthContext";

function hasRangeValue(range) {
  return Boolean(
    range &&
      typeof range === "object" &&
      (range.from != null || range.to != null)
  );
}

function normalizeSpaceRanges(search) {
  const next = { ...(search || {}) };
  const isGrundstueck = next.objectClasses?.includes("Grundstueck") || false;

  if (isGrundstueck && next.objectClasses.length > 1) {
    next.objectClasses = ["Grundstueck"];
  }

  if (isGrundstueck) {
    if (!hasRangeValue(next.propertySpaceRange) && hasRangeValue(next.usableSpaceRange)) {
      next.propertySpaceRange = next.usableSpaceRange;
    }
    next.usableSpaceRange = null;
    return next;
  }

  if (!hasRangeValue(next.usableSpaceRange) && hasRangeValue(next.propertySpaceRange)) {
    next.usableSpaceRange = next.propertySpaceRange;
  }
  next.propertySpaceRange = null;
  return next;
}

export default function useUserFilters() {
  const { user } = useAuth();

  const [filters, setFilters] = useState(null);
  const [loading, setLoading] = useState(true);

  const prevFiltersRef = useRef(null);

  /* ---------------- LOAD ---------------- */

  useEffect(() => {
    if (!user?.uid) return;

    async function load() {
      setLoading(true);

      try {
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);

        let lastSearch = snap.exists() ? snap.data()?.lastSearch : null;

        if (!lastSearch) {
          // ✅ WICHTIG: objectCategories DEFAULT ergänzen
          lastSearch = {
            offerTypes: [],
            objectClasses: [],
            objectCategories: [],
            priceRange: { to: null },
            propertySpaceRange: null,
            usableSpaceRange: null,
          };

          await setDoc(ref, { lastSearch }, { merge: true });
        } else {
          // 🛡️ Safety für Bestandsuser
          lastSearch.objectCategories = lastSearch.objectCategories || [];
          const normalized = normalizeSpaceRanges(lastSearch);
          const needsFilterMigration =
            normalized.objectClasses?.join("|") !== lastSearch.objectClasses?.join("|") ||
            normalized.propertySpaceRange !== lastSearch.propertySpaceRange ||
            normalized.usableSpaceRange !== lastSearch.usableSpaceRange;

          lastSearch = normalized;

          if (needsFilterMigration) {
            await setDoc(ref, { lastSearch }, { merge: true });
          }
        }

        setFilters(lastSearch);
        prevFiltersRef.current = lastSearch;
      } catch (err) {
        console.error("Fehler beim Laden der Filters:", err);
        setFilters({});
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user?.uid]);

  /* ---------------- UPDATE ---------------- */

  const updateFilters = useCallback(
    async (patch) => {
      if (!user?.uid) return;

      const prev = prevFiltersRef.current || {};
      let next = {
        ...prev,
        ...patch,
      };

      // 🛡️ Safety: nie undefined
      next.objectCategories = next.objectCategories || [];
      next.objectClasses = next.objectClasses || [];

      /* 🔁 Reset-Logiken */

      // Miete ↔ Kauf
      const prevOffer = prev.offerTypes?.[0] ?? null;
      const nextOffer = next.offerTypes?.[0] ?? null;

      if (prevOffer && nextOffer && prevOffer !== nextOffer) {
        next = {
          ...next,
          priceRange: { ...(next.priceRange || {}), to: null },
        };
      }

      // Wohnung ↔ Grundstück
      const prevIsPlot = prev.objectClasses?.includes("Grundstueck") || false;
      const nextIsPlot = next.objectClasses?.includes("Grundstueck") || false;

      if (prevIsPlot !== nextIsPlot) {
        next = {
          ...next,
          propertySpaceRange: null,
          usableSpaceRange: null,
        };
      }

      next = normalizeSpaceRanges(next);

      // UI sofort aktualisieren
      setFilters(next);
      prevFiltersRef.current = next;

      // 🔥 Firestore MERGE
      await setDoc(
        doc(db, "users", user.uid),
        { lastSearch: next },
        { merge: true }
      );
    },
    [user?.uid]
  );

  return {
    filters,
    updateFilters,
    loading,
  };
}
