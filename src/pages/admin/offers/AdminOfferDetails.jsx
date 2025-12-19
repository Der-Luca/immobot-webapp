import { useParams } from "react-router-dom";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "@/firebase";

export default function AdminOfferDetails() {
  const { offerId } = useParams();
  const [offer, setOffer] = useState(null);
  const [clicks, setClicks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      // Offer laden
      const offerSnap = await getDoc(doc(db, "offerRedirects", offerId));
      if (offerSnap.exists()) {
        setOffer({ id: offerSnap.id, ...offerSnap.data() });
      }

      // ClickEvents laden
      const q = query(
        collection(db, "clickEvents"),
         where("redirectId", "==", offerId)
      );
      const clickSnap = await getDocs(q);
      setClicks(clickSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      setLoading(false);
    };

    load();
  }, [offerId]);

  if (loading) return <div className="p-10">Lade Offer…</div>;
  if (!offer) return <div className="p-10 text-red-500">Offer nicht gefunden</div>;

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      <h1 className="text-2xl font-bold">{offer.title}</h1>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div><b>Preis:</b> {offer.price} €</div>
        <div><b>Zimmer:</b> {offer.rooms}</div>
        <div><b>Quelle:</b> {offer.source}</div>
        <div><b>Vendor:</b> {offer.vendor?.name}</div>
      </div>

      <a
        href={offer.redirectUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-block px-4 py-2 bg-indigo-600 text-white rounded-lg"
      >
        Anzeige öffnen ↗
      </a>

      <hr />

      <h2 className="text-lg font-semibold">
        Klicks ({clicks.length})
      </h2>

      <ul className="text-sm space-y-1">
        {clicks.map(c => (
          <li key={c.id} className="text-gray-600">
            {c.timestamp?.toDate().toLocaleString("de-DE")} – {c.source}
          </li>
        ))}
      </ul>
    </div>
  );
}
