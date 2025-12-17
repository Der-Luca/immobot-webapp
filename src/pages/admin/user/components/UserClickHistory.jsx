import { useEffect, useState, Fragment } from "react";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "../../../../firebase"; // Pfad ggf. anpassen
import RenderValue from "./RenderValue";

// Hilfsfunktion: Fasst die Suche für die Vorschau zusammen
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
  if (radius !== "") parts.push(`Rad: ${radius} km`);
  if (priceFrom !== "" || priceTo !== "") parts.push(`€ ${priceFrom}–${priceTo}`);

  return parts.join(" · ");
}

export default function UserSearchHistory({ uid }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

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
      } catch (err) {
        console.error("Error loading search history:", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [uid]);

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
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      {/* Scroll-Container mit fester Höhe */}
      <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
        <table className="w-full text-left text-sm whitespace-nowrap">
          
          {/* Sticky Header */}
          <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wider w-32">Zeitpunkt</th>
              <th className="px-4 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wider">Such-Parameter (Vorschau)</th>
              <th className="px-4 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wider text-right w-16">Details</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {events.map((ev) => (
              <SearchRow key={ev.id} ev={ev} />
            ))}
          </tbody>
        </table>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f9fafb; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </div>
  );
}

// Separate Komponente für die Zeile (wegen State für Auf/Zuklappen)
function SearchRow({ ev }) {
  const [isOpen, setIsOpen] = useState(false);

  // JSON Parsen
  let parsed = null;
  try {
    parsed = ev.search ? JSON.parse(ev.search) : null;
  } catch (e) {
    parsed = { raw: ev.search };
  }

  const summary = summarizeSearch(parsed);

  return (
    <Fragment>
      <tr 
        onClick={() => setIsOpen(!isOpen)} 
        className={`cursor-pointer transition-colors ${isOpen ? 'bg-indigo-50/50' : 'hover:bg-gray-50'}`}
      >
        {/* ZEITPUNKT */}
        <td className="px-4 py-3 font-mono text-xs text-gray-700 align-top">
          {ev.createdAtDate ? (
            <div className="flex flex-col">
              <span className="font-bold text-gray-900">
                {ev.createdAtDate.toLocaleTimeString("de-DE", { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className="text-[10px] text-gray-400">
                {ev.createdAtDate.toLocaleDateString("de-DE", { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </span>
            </div>
          ) : (
            <span className="text-gray-400">—</span>
          )}
        </td>

        {/* SUMMARY */}
        <td className="px-4 py-3 align-middle">
          <div className="text-sm text-gray-700 truncate max-w-md">
            {summary || <span className="text-gray-400 italic">Filter zurückgesetzt / Leer</span>}
          </div>
        </td>

        {/* CHEVRON */}
        <td className="px-4 py-3 text-right align-middle">
          <button className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-indigo-600' : ''}`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </td>
      </tr>

      {/* DETAIL ROW (wird eingeblendet) */}
      {isOpen && (
        <tr className="bg-gray-50 shadow-inner">
          <td colSpan="3" className="px-4 py-4 border-b border-gray-100">
            <div className="bg-white border border-gray-200 rounded-lg p-4 text-xs">
              <h4 className="font-bold text-gray-500 uppercase tracking-wider mb-2 text-[10px]">Vollständige Suchdaten</h4>
              {parsed ? (
                <RenderValue value={parsed} />
              ) : (
                <span className="text-gray-400">Keine Daten verfügbar</span>
              )}
            </div>
          </td>
        </tr>
      )}
    </Fragment>
  );
}