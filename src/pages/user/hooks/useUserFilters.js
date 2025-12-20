import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../../firebase";
import { useState, useEffect } from "react";
import { useAuth } from "../../../contexts/AuthContext";

export default function useUserFilters() {
  const { user } = useAuth();
  const [filters, setFilters] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;

    async function load() {
      setLoading(true);

      try {
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);

        const data = snap.exists() ? snap.data() : {};
        const lastSearch = data?.lastSearch ?? null;

        // 👉 Default anlegen, aber NUR in users/{uid}.lastSearch
        if (!lastSearch) {
          const initialLastSearch = {
            offerTypes: [],
            priceRange: {},
            propertySpaceRange: {},
          };

          await setDoc(
            ref,
            { lastSearch: initialLastSearch },
            { merge: true }
          );

          setFilters(initialLastSearch);
          return;
        }

        setFilters(lastSearch);
      } catch (err) {
        console.error("Fehler beim Laden der Filters:", err);
        setFilters({});
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user?.uid]);

  return { filters, loading };
}
