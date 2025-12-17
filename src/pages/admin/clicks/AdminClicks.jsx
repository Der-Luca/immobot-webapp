import { useEffect, useState } from "react";
import { db } from "@/firebase.js"; 
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import LatestClicks from "./components/LatestClicks";

export default function AdminClicks() {
  const [stats, setStats] = useState({
    today: 0,
    total: 0,
    topOffer: { id: "—", count: 0 },
  });

  useEffect(() => {
    async function loadStats() {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      // 1. Klicks Heute
      const qToday = query(
        collection(db, "clickEvents"),
        where("timestamp", ">=", startOfDay)
      );
      const snapToday = await getDocs(qToday);
      
      // 2. Simple "Top Offer" Berechnung (basierend auf den heutigen Klicks für Performance)
      const offerCounts = {};
      snapToday.docs.forEach(doc => {
        const oid = doc.data().offerId || doc.data().offer_id || "Unbekannt";
        offerCounts[oid] = (offerCounts[oid] || 0) + 1;
      });

      // Sortieren um Top Offer zu finden
      let topOfferId = "—";
      let topOfferCount = 0;
      Object.entries(offerCounts).forEach(([id, count]) => {
        if (count > topOfferCount) {
          topOfferCount = count;
          topOfferId = id;
        }
      });

      // 3. Total (optional, hier nur Snapshot size für Schnelligkeit)
      // Bei riesigen DBs besser weglassen oder Aggregation nutzen
      // const snapTotal = await getCountFromServer(collection(db, "clickEvents")); 
      
      setStats({
        today: snapToday.size,
        total: "Live", // Platzhalter oder separate Query
        topOffer: { id: topOfferId, count: topOfferCount }
      });
    }

    loadStats();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 md:p-10 flex flex-col space-y-8">
      
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Click-Events & Analyse</h1>
        <p className="text-gray-500 mt-1">Echtzeit-Tracking aller User-Interaktionen.</p>
      </div>

      {/* KPI GRID (Die "Top Clicks" Übersicht) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Klicks Heute" 
          value={stats.today} 
          icon={<path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />}
          color="text-blue-600 bg-blue-50"
        />
        <StatCard 
          title="Top Offer (Heute)" 
          value={stats.topOffer.id} 
          subValue={`${stats.topOffer.count} Klicks`}
          icon={<path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />}
          color="text-emerald-600 bg-emerald-50"
        />
        <StatCard 
          title="Live Feed" 
          value="Aktiv" 
          icon={<path strokeLinecap="round" strokeLinejoin="round" d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" />}
          color="text-purple-600 bg-purple-50"
        />
      </div>

      {/* DIE GROSSE TABELLE */}
      <div className="flex-1 min-h-0">
        <LatestClicks />
      </div>
    </div>
  );
}

function StatCard({ title, value, subValue, icon, color }) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex items-center justify-between transition-transform hover:-translate-y-1">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1 truncate max-w-[200px]" title={value}>{value}</p>
        {subValue && <p className="text-xs font-semibold text-emerald-600 mt-1">{subValue}</p>}
      </div>
      <div className={`p-3 rounded-xl ${color}`}>
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          {icon}
        </svg>
      </div>
    </div>
  );
}