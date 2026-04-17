import { useEffect, useMemo, useState } from "react";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { Link } from "react-router-dom";
import { db } from "@/firebase.js";

function toDate(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatPrice(price) {
  const num = Number(price);
  if (!Number.isFinite(num) || num <= 0) return "Preis a. A.";

  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(num);
}

export default function UserClickHistory({ uid }) {
  const [clicks, setClicks] = useState([]);
  const [offersById, setOffersById] = useState({});
  const [loading, setLoading] = useState(true);
  const [openById, setOpenById] = useState({});

  useEffect(() => {
    if (!uid) return;

    const load = async () => {
      setLoading(true);

      try {
        const clickQuery = query(
          collection(db, "clickEvents"),
          where("userId", "==", uid)
        );

        const clickSnap = await getDocs(clickQuery);
        const clickData = clickSnap.docs
          .map((d) => ({
            id: d.id,
            ...d.data(),
            timestampDate: toDate(d.data().timestamp),
          }))
          .sort((a, b) => {
            const aTime = a.timestampDate?.getTime() || 0;
            const bTime = b.timestampDate?.getTime() || 0;
            return bTime - aTime;
          });

        const redirectIds = [...new Set(clickData.map((c) => c.redirectId).filter(Boolean))];
        const offerEntries = await Promise.all(
          redirectIds.map(async (redirectId) => {
            try {
              const offerSnap = await getDoc(doc(db, "offerRedirects", redirectId));
              return [
                redirectId,
                offerSnap.exists() ? { id: offerSnap.id, ...offerSnap.data() } : null,
              ];
            } catch (err) {
              console.error("Error loading clicked offer:", redirectId, err);
              return [redirectId, null];
            }
          })
        );

        setClicks(clickData);
        setOffersById(Object.fromEntries(offerEntries));
        setOpenById(Object.fromEntries(clickData.map((click) => [click.id, false])));
      } catch (err) {
        console.error("Error loading click history:", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [uid]);

  const groupedClicks = useMemo(() => {
    return clicks.reduce((acc, click) => {
      const key = click.redirectId || click.id;
      if (!acc[key]) {
        acc[key] = {
          redirectId: click.redirectId,
          offer: offersById[click.redirectId] || null,
          clicks: [],
        };
      }
      acc[key].clicks.push(click);
      return acc;
    }, {});
  }, [clicks, offersById]);

  const setAll = (value) => {
    setOpenById(Object.fromEntries(clicks.map((click) => [click.id, value])));
  };

  if (loading) {
    return <div className="p-4 text-sm text-gray-500 animate-pulse">Lade Klick-Historie...</div>;
  }

  if (!clicks.length) {
    return (
      <div className="p-6 text-center border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-sm">
        Keine Klick-Historie vorhanden
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 px-1 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">
          {clicks.length} {clicks.length === 1 ? "Klick" : "Klicks"} auf{" "}
          {Object.keys(groupedClicks).length}{" "}
          {Object.keys(groupedClicks).length === 1 ? "Angebot" : "Angebote"}
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

      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
        <div className="max-h-[500px] overflow-y-auto custom-scrollbar divide-y divide-gray-100">
          {clicks.map((click) => {
            const offer = offersById[click.redirectId] || null;
            const isOpen = !!openById[click.id];
            const title = offer?.title || "Angebot nicht gefunden";
            const vendorName = offer?.vendor?.name || offer?.vendorName || "Unbekannter Anbieter";

            return (
              <div key={click.id} className="group bg-white transition-colors">
                <button
                  type="button"
                  onClick={() => setOpenById((prev) => ({ ...prev, [click.id]: !prev[click.id] }))}
                  className={`w-full text-left px-4 py-3 flex items-center gap-4 hover:bg-gray-50 transition-colors ${
                    isOpen ? "bg-gray-50" : ""
                  }`}
                >
                  <div
                    className={`p-1.5 rounded-md text-gray-400 transition-transform duration-200 ${
                      isOpen ? "rotate-90 text-indigo-600 bg-indigo-50" : "group-hover:text-gray-600"
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span className="text-xs font-bold text-gray-900">
                        {click.timestampDate?.toLocaleTimeString("de-DE", {
                          hour: "2-digit",
                          minute: "2-digit",
                        }) || "--:--"}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {click.timestampDate?.toLocaleDateString("de-DE") || ""}
                      </span>
                    </div>

                    <div className="text-sm text-gray-700 truncate pr-4">
                      {title}
                    </div>
                    <div className="text-xs text-gray-400 truncate pr-4">
                      {vendorName} · {click.source || "web-app"} · {formatPrice(offer?.price)}
                    </div>
                  </div>

                  <div className="hidden sm:block">
                    <span className="text-[10px] font-mono text-gray-300 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 group-hover:border-gray-200 group-hover:text-gray-400 transition-colors">
                      {(click.redirectId || click.id).slice(0, 6)}
                    </span>
                  </div>
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 pl-[3.25rem] bg-gray-50 border-t border-gray-100">
                    <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
                      <DetailItem label="Angebot" value={title} />
                      <DetailItem label="Anbieter" value={vendorName} />
                      <DetailItem label="Preis" value={formatPrice(offer?.price)} />
                      <DetailItem label="Zimmer" value={offer?.rooms || "—"} />
                      <DetailItem label="Redirect ID" value={click.redirectId || "—"} mono />
                      <DetailItem label="Geomap Offer ID" value={click.geomapOfferId || offer?.id || "—"} mono />
                      <DetailItem label="Quelle" value={click.source || "—"} />
                      <DetailItem
                        label="Zeitpunkt"
                        value={click.timestampDate?.toLocaleString("de-DE") || "—"}
                      />
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {click.redirectId && (
                        <Link
                          to={`/admin/offers/${click.redirectId}`}
                          className="inline-flex items-center px-3 py-2 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 text-xs font-bold hover:bg-indigo-100 transition-colors"
                        >
                          Offer im Admin öffnen
                        </Link>
                      )}

                      {offer?.redirectUrl && (
                        <a
                          href={offer.redirectUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center px-3 py-2 rounded-lg bg-white text-gray-700 border border-gray-200 text-xs font-bold hover:border-gray-300 transition-colors"
                        >
                          Original-Anzeige öffnen
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
      `}</style>
    </div>
  );
}

function DetailItem({ label, value, mono = false }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm min-w-0">
      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
        {label}
      </div>
      <div className={`${mono ? "font-mono text-xs" : "text-sm"} text-gray-700 break-words`}>
        {value}
      </div>
    </div>
  );
}
