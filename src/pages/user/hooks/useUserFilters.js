import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../../firebase";
import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../../../contexts/AuthContext";

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
          lastSearch = {
            offerTypes: [],
            objectClasses: [],
            priceRange: { to: null },
            propertySpaceRange: { from: null, to: null },
          };

          await setDoc(ref, { lastSearch }, { merge: true });
        }

        // ❗ NICHT normalisieren / NICHT reduzieren
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
          propertySpaceRange: { from: null, to: null },
        };
      }

      // UI sofort
      setFilters(next);
      prevFiltersRef.current = next;

      // 🔥 Firestore MERGE (nicht ersetzen!)
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
