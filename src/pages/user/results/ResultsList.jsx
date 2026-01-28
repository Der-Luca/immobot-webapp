import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { trackAndRedirect } from "./trackAndRedirect";

/* --- HELPER: Datum prüfen --- */
const isToday = (dateObj) => {
  if (!dateObj) return false;
  const d = dateObj.toDate ? dateObj.toDate() : new Date(dateObj);
  const t = new Date();
  return (
    d.getDate() === t.getDate() &&
    d.getMonth() === t.getMonth() &&
    d.getFullYear() === t.getFullYear()
  );
};

/* --- HELPER: Preis formatieren --- */
const formatPrice = (price) => {
  if (!price) return "Preis a. A.";
  const num = parseFloat(String(price).replace(/[^0-9.,-]/g, ""));
  if (isNaN(num)) return price;
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(num);
};

export default function ResultsList({ offers = [], highlightedId, onItemClick }) {
  const { user } = useAuth();
  const itemRefs = useRef({});
  
  // State fürs Aufklappen der alten Ergebnisse
  const [showOlder, setShowOlder] = useState(false);

  // 1. Hier trennen wir die Spreu vom Weizen (Heute vs. Alt)
  const todayOffers = offers.filter(o => o.createdAt && isToday(o.createdAt));
  const olderOffers = offers.filter(o => !o.createdAt || !isToday(o.createdAt));

  // Auto-Scroll Logik
  useEffect(() => {
    if (highlightedId && itemRefs.current[highlightedId]) {
      itemRefs.current[highlightedId].scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      // Wenn wir auf der Map einen alten Marker klicken, Liste automatisch aufklappen
      const isOlder = olderOffers.find(o => o.docId === highlightedId);
      if (isOlder) setShowOlder(true);
    }
  }, [highlightedId, olderOffers]);

  return (
    <div className="space-y-6">

      {/* 🔥 SZENARIO: HEUTE LEER, ABER ALTE SACHEN DA 🔥 */}
      {todayOffers.length === 0 && olderOffers.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 text-center shadow-sm">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white text-gray-400 mb-2 border border-gray-100">
             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
             </svg>
          </div>
          <h3 className="text-gray-900 font-bold text-sm">Heute noch nichts Neues</h3>
          <p className="text-gray-500 text-xs mt-1">
            Wir scannen den Markt weiter für dich. Hier sind deine {olderOffers.length} gespeicherten Ergebnisse.
          </p>
        </div>
      )}

      {/* --- LISTE: HEUTE (Nur anzeigen wenn > 0) --- */}
      {todayOffers.length > 0 && (
        <div className="space-y-4">
           <div className="flex items-center gap-2 px-1">
             <span className="relative flex h-2 w-2">
               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
               <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
             </span>
             <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
               Neu eingetroffen
             </span>
           </div>
           
           {todayOffers.map((o) => (
             <ResultItem
               key={o.docId}
               o={o}
               user={user}
               isActive={o.docId === highlightedId}
               setRef={(el) => (itemRefs.current[o.docId] = el)}
               onItemClick={onItemClick}
             />
           ))}
        </div>
      )}

      {/* --- LISTE: ÄLTERE (Aufklappbar) --- */}
      {olderOffers.length > 0 && (
        <div className="space-y-4 pt-2">
          <button
            onClick={() => setShowOlder(!showOlder)}
            className="flex items-center justify-between w-full text-sm font-bold text-gray-500 hover:text-blue-600 transition-colors py-2 group"
          >
            <div className="flex items-center gap-2">
              <span>{showOlder ? "Ältere verbergen" : "Ältere anzeigen"}</span>
              <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                {olderOffers.length}
              </span>
            </div>
            <svg 
              className={`w-4 h-4 transition-transform duration-200 ${showOlder ? 'rotate-180' : ''}`} 
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showOlder && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
              {olderOffers.map((o) => (
                <ResultItem
                  key={o.docId}
                  o={o}
                  user={user}
                  isActive={o.docId === highlightedId}
                  setRef={(el) => (itemRefs.current[o.docId] = el)}
                  onItemClick={onItemClick}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- SZENARIO: ABSOLUT GAR NICHTS --- */}
      {offers.length === 0 && (
        <div className="p-10 text-center border border-dashed border-gray-300 rounded-2xl bg-gray-50">
          <p className="text-gray-500 font-medium">Keine Angebote gefunden.</p>
        </div>
      )}
    </div>
  );
}

/* --- ITEM COMPONENT (Für sauberen Code) --- */
function ResultItem({ o, user, isActive, setRef, onItemClick }) {
  const hasLocation = typeof o.latitude === "number" && typeof o.longitude === "number";

  const handleCardClick = (e) => {
    // Nicht auslösen wenn der Button geklickt wurde
    if (e.target.closest("button")) return;
    onItemClick?.(o.docId, hasLocation);
  };

  return (
    <div
      ref={setRef}
      onClick={handleCardClick}
      className={`
        rounded-2xl p-5 transition-all duration-200 cursor-pointer
        ${
          isActive
            ? "border-2 border-blue-500 bg-blue-50 shadow-lg scale-[1.02]"
            : "border border-gray-200 bg-white hover:border-blue-200 hover:shadow-md"
        }
      `}
    >
      <div className="flex justify-between items-start gap-3">
        <div>
          <h3 className="font-bold text-gray-900 text-sm sm:text-base line-clamp-2">
            {o.title || "Ohne Titel"}
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            {o.vendor?.name} · {o.rooms} Zi.
          </p>
        </div>

        <div className="text-right whitespace-nowrap">
          <div className="font-bold text-gray-900">{formatPrice(o.price)}</div>

          <button
            onClick={() =>
              trackAndRedirect({
                redirectId: o.docId,
                geomapOfferId: o.geomapOfferId,
                redirectUrl: o.redirectUrl,
                userId: user?.uid || null,
                source: "web-app",
              })
            }
            className="mt-2 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors"
          >
            Zum Angebot
          </button>
        </div>
      </div>
    </div>
  );
}