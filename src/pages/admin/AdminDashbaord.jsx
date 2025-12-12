import { useState, useEffect } from "react";
import { db } from "../../firebase";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  where,
} from "firebase/firestore";

import LatestClicks from "./LatestClicks";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    offersToday: 0,
    clicksToday: 0,
    uniqueClickUsers: 0,
    totalOffers: 0,
    totalClicks: 0,
  });

  useEffect(() => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // --- Today Clicks ---
    const clicksQuery = query(
      collection(db, "clickEvents"),
      where("timestamp", ">=", startOfDay)
    );

    const unsub1 = onSnapshot(clicksQuery, (snap) => {
      const todayClicks = snap.docs.length;

      const uniqueUsers = new Set(
        snap.docs.map((d) => d.data().userId)
      ).size;

      setStats((prev) => ({
        ...prev,
        clicksToday: todayClicks,
        uniqueClickUsers: uniqueUsers,
      }));
    });

    // --- Total Clicks ---
    const unsub2 = onSnapshot(collection(db, "clickEvents"), (snap) => {
      const totalClicks = snap.docs.length;
      setStats((prev) => ({ ...prev, totalClicks }));
    });

    // --- Offers today ---
    const offersQuery = query(
      collection(db, "offerRedirects"),
      where("createdAt", ">=", startOfDay)
    );

    const unsub3 = onSnapshot(offersQuery, (snap) => {
      setStats((prev) => ({
        ...prev,
        offersToday: snap.docs.length,
      }));
    });

    // --- Total Offers ---
    const unsub4 = onSnapshot(collection(db, "offerRedirects"), (snap) => {
      setStats((prev) => ({
        ...prev,
        totalOffers: snap.docs.length,
      }));
    });

    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
    };
  }, []);

  return (
    <div className="p-10 space-y-10">

      {/* HEADER */}
      <h1 className="text-4xl font-bold tracking-tight">
        Immobot Admin Dashboard
      </h1>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

        <StatCard
          title="Neue Offers heute"
          value={stats.offersToday}
          color="blue"
        />

        <StatCard
          title="Klicks heute"
          value={stats.clicksToday}
          color="green"
        />

        <StatCard
          title="Unique User heute"
          value={stats.uniqueClickUsers}
          color="purple"
        />

        <StatCard
          title="CTR (Clicks/Offers)"
          value={
            stats.offersToday > 0
              ? ((stats.clicksToday / stats.offersToday) * 100).toFixed(1) + "%"
              : "0%"
          }
          color="yellow"
        />
      </div>

      {/* SECOND KPI ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <StatCard
          title="Total Offers"
          value={stats.totalOffers}
          color="cyan"
        />

        <StatCard
          title="Total Clicks"
          value={stats.totalClicks}
          color="rose"
        />

        <StatCard
          title="Avg Clicks pro Offer"
          value={
            stats.totalOffers > 0
              ? (stats.totalClicks / stats.totalOffers).toFixed(2)
              : "0"
          }
          color="indigo"
        />
      </div>

      {/* Latest Clicks */}
      <LatestClicks />
    </div>
  );
}

/* SIMPLE UI COMPONENT FOR KPI CARDS */
function StatCard({ title, value, color }) {
  return (
    <div
      className={`rounded-xl shadow p-6 border-l-8 border-${color}-500 bg-white`}
    >
      <p className="text-gray-500 font-medium">{title}</p>
      <p className="text-3xl font-bold mt-2">{value}</p>
    </div>
  );
}
