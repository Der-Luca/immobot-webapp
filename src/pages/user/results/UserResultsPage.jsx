import { useEffect, useState, useRef } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { trackAndRedirect } from "./trackAndRedirect";
import ResultsMap from "./ResultsMap";

/* ---------------- HELPERS ---------------- */

const formatPrice = (price) => {
  if (!price) return "Preis auf Anfrage";
  const num = parseFloat(String(price).replace(/[^0-9.,-]/g, ""));
  if (isNaN(num)) return price;
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(num);
};

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

/* ---------------- PAGE ---------------- */

export default function UserResultsPage() {
  const { user } = useAuth();

  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [highlightedId, setHighlightedId] = useState(null);
  const [showOlder, setShowOlder] = useState(false);

  const itemRefs = useRef({});

  /* ---------- LOAD DATA ---------- */

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

        const data = snap.docs.map((d) => ({
          docId: d.id,        // 🔥 EINZIGE ID
          ...d.data(),
        }));

        data.sort((a, b) => {
          const ta = a.createdAt?.seconds || 0;
          const tb = b.createdAt?.seconds || 0;
          return tb - ta;
        });

        setOffers(data);
      } catch (e) {
        console.error("Load offers failed", e);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user]);

  /* ---------- SCROLL ON MAP CLICK ---------- */

  useEffect(() => {
    if (highlightedId && itemRefs.current[highlightedId]) {
      itemRefs.current[highlightedId].scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [highlightedId]);

  /* ---------- SPLIT TODAY / OLDER ---------- */

  const todayOffers = [];
  const olderOffers = [];

  offers.forEach((o) => {
    if (o.createdAt && !isToday(o.createdAt)) olderOffers.push(o);
    else todayOffers.push(o);
  });

  /* ---------------- RENDER ---------------- */

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 p-6 max-w-[1800px] mx-auto min-h-screen">

      {/* ================= LIST ================= */}
      <div className="order-2 xl:order-1 flex flex-col gap-6">

        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Deine Ergebnisse
          </h1>
          <p className="text-gray-500 mt-1">
            {offers.length} Angebote
          </p>
        </div>

        {loading && (
          <div className="p-10 text-center text-gray-400 animate-pulse">
            Lade Angebote…
          </div>
        )}

        {!loading && offers.length === 0 && (
          <div className="p-8 rounded-2xl border border-dashed text-center text-gray-500">
            Keine Angebote gefunden.
          </div>
        )}

        {/* ---- TODAY ---- */}
        {!loading && todayOffers.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xs font-bold text-gray-400 uppercase">
              Neu von heute
            </h2>

            {todayOffers.map((o) => (
              <ResultCard
                key={o.docId}
                offer={o}
                user={user}
                isHighlighted={highlightedId === o.docId}
                setRef={(el) => (itemRefs.current[o.docId] = el)}
              />
            ))}
          </section>
        )}

        {/* ---- OLDER ---- */}
        {!loading && olderOffers.length > 0 && (
          <section className="space-y-4">
            <button
              onClick={() => setShowOlder(!showOlder)}
              className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-indigo-600"
            >
              {showOlder ? "Ältere verbergen" : `Ältere anzeigen (${olderOffers.length})`}
            </button>

            {showOlder &&
              olderOffers.map((o) => (
                <ResultCard
                  key={o.docId}
                  offer={o}
                  user={user}
                  isHighlighted={highlightedId === o.docId}
                  setRef={(el) => (itemRefs.current[o.docId] = el)}
                />
              ))}
          </section>
        )}
      </div>

     {/* ================= MAP ================= */}
<div className="order-1 xl:order-2">
  <div className="sticky top-6">
    <div className="h-[360px] xl:h-[520px] rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-sm">
      <ResultsMap
        offers={offers}
        onMarkerClick={setHighlightedId}
      />
    </div>
  </div>
</div>

    </div>
  );
}

/* ---------------- CARD ---------------- */

function ResultCard({ offer: o, user, isHighlighted, setRef }) {
  const valid = !!o.docId && !!o.redirectUrl;

  return (
    <div
      ref={setRef}
      className={`rounded-2xl p-5 transition-all
        ${isHighlighted
          ? "bg-indigo-50 border-2 border-indigo-500 shadow-lg"
          : "bg-white border hover:shadow"}
      `}
    >
      <div className="flex justify-between gap-4">
        <div>
          <h3 className="font-bold text-gray-900">
            {o.title || "Kein Titel"}
          </h3>
          <p className="text-sm text-gray-500">
            {o.vendor?.name} · {o.rooms} Zi.
          </p>
        </div>

        <div className="text-right">
          <div className="text-lg font-bold">
            {formatPrice(o.price)}
          </div>

          <button
            disabled={!valid}
            onClick={() =>
              trackAndRedirect({
                redirectId: o.docId,
                redirectUrl: o.redirectUrl,
                geomapOfferId: o.geomapOfferId,
                userId: user?.uid,
                source: "web-app",
              })
            }
            className={`mt-2 px-4 py-2 rounded-xl text-sm font-bold
              ${valid
                ? "bg-indigo-600 text-white hover:bg-indigo-700"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"}
            `}
          >
            Zum Angebot ↗
          </button>
        </div>
      </div>
    </div>
  );
}
