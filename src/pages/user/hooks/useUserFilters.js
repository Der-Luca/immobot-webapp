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
      try {
        const ref = doc(db, "users", user.uid, "searchFilters", "default");
        const snap = await getDoc(ref);

        // 👉 Default-Dokument automatisch anlegen
        if (!snap.exists()) {
          const initial = {
            filters: {
              offerTypes: [],
              priceRange: {},
              propertySpaceRange: {},
            },
            createdAt: new Date(),
          };

          await setDoc(ref, initial);
          setFilters(initial.filters);
          return;
        }

        const data = snap.data();
        setFilters(data.filters || {});
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
