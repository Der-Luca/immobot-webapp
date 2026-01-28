import { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/firebase";
import { useAuth } from "@/contexts/AuthContext";
import ResultsMap from "./ResultsMap";
import ResultsList from "./ResultsList";

export default function UserResultsPage() {
  const { user } = useAuth();

  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [highlightedId, setHighlightedId] = useState(null);
  const [selectedMapId, setSelectedMapId] = useState(null);
  const [toast, setToast] = useState(null);

  // Handler wenn Item in der Liste geklickt wird
  const handleItemClick = (docId, hasLocation) => {
    if (hasLocation) {
      setSelectedMapId(docId);
      setHighlightedId(docId);
    } else {
      setToast("Standort nicht öffentlich");
      setTimeout(() => setToast(null), 2500);
    }
  };

  useEffect(() => {
    if (!user?.uid) return;

    async function load() {
      setLoading(true);
      try {
        const q = query(
          collection(db, "offerRedirects"),
          where("uid", "==", user.uid)
        );

        const snap = await getDocs(q);
        
        // Wir holen die Rohdaten. Die Sortierung übernimmt gleich die ResultsList.
        const data = snap.docs.map((d) => ({
          docId: d.id,
          ...d.data(),
        }));

        // Sortierung: Neueste zuerst (wichtig für die Logik)
        data.sort((a, b) => {
          const ta = a.createdAt?.seconds || 0;
          const tb = b.createdAt?.seconds || 0;
          return tb - ta;
        });

        setOffers(data);
      } catch (e) {
        console.error("Fehler beim Laden:", e);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user]);

  return (
   <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 p-6 max-w-[1800px] mx-auto min-h-screen">

      {/* ================= LINKER BEREICH (LISTE) ================= */}
      <div className="order-2 xl:order-1 xl:col-span-1 flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Deine Ergebnisse
          </h1>
          <p className="text-gray-500 mt-1">
            {offers.length} Angebote gefunden
          </p>
        </div>

        {loading && (
          <div className="p-10 text-center text-gray-400 animate-pulse">
            Lade Daten...
          </div>
        )}

        {!loading && (
          <ResultsList
            offers={offers}
            highlightedId={highlightedId}
            onItemClick={handleItemClick}
          />
        )}
      </div>

     {/* ================= RECHTER BEREICH (KARTE) ================= */}
      <div className="order-1 xl:order-2 xl:col-span-2">
     <div className="sticky top-6 lg:mt-32">
       <div className="h-[360px] sm:h-[450px] lg:h-[650px] xl:h-[700px] rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-sm">
            <ResultsMap
              offers={offers}
              onMarkerClick={setHighlightedId}
              selectedId={selectedMapId}
            />
          </div>

          {/* Toast für fehlende Location */}
          {toast && (
            <div className="mt-3 px-4 py-3 bg-gray-800 text-white text-sm font-medium rounded-xl text-center animate-in fade-in slide-in-from-bottom-2 duration-200">
              {toast}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}