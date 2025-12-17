import { useEffect, useMemo, useState } from "react";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/firebase.js";
import RenderValue from "./RenderValue";

// Hilfsfunktion zum Zusammenfassen des Such-Objekts für die Vorschau
function summarizeSearch(obj) {
  if (!obj || typeof obj !== "object") return "";

  const offerTypes = Array.isArray(obj.offerTypes) ? obj.offerTypes.join(", ") : "";
  const objectClasses = Array.isArray(obj.objectClasses) ? obj.objectClasses.join(", ") : "";

  const radius = obj.radiusInKm ?? obj.radius ?? "";
  const priceFrom = obj?.priceRange?.from ?? "";
  const priceTo = obj?.priceRange?.to ?? "";

  const parts = [];
  if (objectClasses) parts.push(objectClasses);
  if (offerTypes) parts.push(offerTypes);
  if (radius !== "") parts.push(`Radius: ${radius} km`);
  if (priceFrom !== "" || priceTo !== "") parts.push(`Preis: ${priceFrom || "0"}–${priceTo || "∞"}`);

  return parts.join(" · ");
}

export default function UserSearchHistory({ uid }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openById, setOpenById] = useState({}); // { [id]: boolean }

  useEffect(() => {
    if (!uid) return;

    const load = async () => {
      try {
        const q = query(
          collection(db, "searchEvents"),
          where("uid", "==", uid),
          orderBy("createdAt", "desc")
        );

        const snap = await getDocs(q);
        const data = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          createdAtDate: d.data().createdAt?.toDate ? d.data().createdAt.toDate() : null,
        }));

        setEvents(data);
        
        // Standard: alle geschlossen
        const initial = {};
        data.forEach((ev) => (initial[ev.id] = false));
        setOpenById(initial);

      } catch (err) {
        console.error("Error loading search history:", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [uid]);

  const setAll = (value) => {
    const next = {};
    events.forEach((ev) => (next[ev.id] = value));
    setOpenById(next);
  };

  if (loading) {
    return <div className="p-4 text-sm text-gray-500 animate-pulse">Lade Such-Verlauf…</div>;
  }

  if (!events.length) {
    return (
      <div className="p-6 text-center border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-sm">
        Keine Such-Historie vorhanden
      </div>
    );
  }

  return (
    <div className="space-y-4">
      
      {/* HEADER CONTROLS */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">
          {events.length} {events.length === 1 ? 'Eintrag' : 'Einträge'}
        </span>
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => setAll(true)}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            Alle öffnen
          </button>
          <button
            type="button"
            onClick={() => setAll(false)}
            className="text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
          >
            Alle schließen
          </button>
        </div>
      </div>

      {/* LIST CONTAINER */}
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
        <div className="max-h-[500px] overflow-y-auto custom-scrollbar divide-y divide-gray-100">
          
          {events.map((ev) => {
            let parsed = null;
            try {
              parsed = ev.search ? JSON.parse(ev.search) : null;
            } catch (e) {
              parsed = { raw: ev.search };
            }

            const isOpen = !!openById[ev.id];
            const summary = summarizeSearch(parsed);

            return (
              <div key={ev.id} className="group bg-white transition-colors">
                
                {/* ACCORDION HEADER */}
                <button
                  type="button"
                  onClick={() => setOpenById((prev) => ({ ...prev, [ev.id]: !prev[ev.id] }))}
                  className={`w-full text-left px-4 py-3 flex items-center gap-4 hover:bg-gray-50 transition-colors ${isOpen ? 'bg-gray-50' : ''}`}
                >
                  {/* Icon / Chevron */}
                  <div className={`p-1.5 rounded-md text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-90 text-indigo-600 bg-indigo-50' : 'group-hover:text-gray-600'}`}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>

                  {/* Content Summary */}
                  <div className="flex-1 min-w-0">
                     <div className="flex items-baseline gap-2 mb-0.5">
                        <span className="text-xs font-bold text-gray-900">
                          {ev.createdAtDate?.toLocaleTimeString("de-DE", {hour: '2-digit', minute:'2-digit'}) || "—"}
                        </span>
                        <span className="text-[10px] text-gray-400">
                           {ev.createdAtDate?.toLocaleDateString("de-DE") || ""}
                        </span>
                     </div>
                    
                    <div className="text-sm text-gray-600 truncate pr-4">
                       {summary || <span className="italic text-gray-400">Leere Suche / Filter reset</span>}
                    </div>
                  </div>

                  {/* ID Badge */}
                  <div className="hidden sm:block">
                     <span className="text-[10px] font-mono text-gray-300 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 group-hover:border-gray-200 group-hover:text-gray-400 transition-colors">
                        {ev.id.slice(0, 6)}
                     </span>
                  </div>
                </button>

                {/* ACCORDION BODY */}
                {isOpen && (
                  <div className="px-4 pb-4 pl-[3.25rem] bg-gray-50 border-t border-gray-100">
                    <div className="mt-3 text-sm bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                      {parsed ? (
                        <RenderValue value={parsed} />
                      ) : (
                        <div className="text-gray-400 italic">Keine validen Daten gefunden.</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* SCROLLBAR CSS */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
      `}</style>
    </div>
  );
}