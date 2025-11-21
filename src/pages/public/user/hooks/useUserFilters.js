import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../../firebase";
import { useState, useEffect } from "react";
import { useAuth } from "../../../../contexts/AuthContext"

export default function useUserFilters() {
  const { user } = useAuth();
  const [filters, setFilters] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ❗ Erst laden wenn user existiert
    if (!user?.uid) return;

    async function load() {
      try {
        const ref = doc(db, "users", user.uid, "searchFilters", "default");
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          console.warn("useUserFilters → kein 'default' Document!");
          setFilters({});
          return;
        }

        const data = snap.data();

        // Falls deine Dokumente flach gespeichert sind oder unter filters
        setFilters(data.filters || data || {});
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
