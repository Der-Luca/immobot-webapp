import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { db } from "@/firebase.js"; // Pfad anpassen
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  doc,
  getDoc,
} from "firebase/firestore";

export default function LatestClicks() {
  const [clicks, setClicks] = useState([]);
  const [usersById, setUsersById] = useState({});
  const [loading, setLoading] = useState(true);

  // SEARCH & SORT STATE
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "timestamp", direction: "desc" });

  // 1️⃣ CLICKS LADEN (Mehr laden für bessere Suche, z.B. 100)
  useEffect(() => {
    const q = query(
      collection(db, "clickEvents"),
      orderBy("timestamp", "desc"),
      limit(100) 
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        // Normalisiere Daten für Sortierung
        offerId: d.data().offerId || d.data().offer_id || "",
        source: d.data().source || "—",
        timestampDate: d.data().timestamp?.toDate ? d.data().timestamp.toDate() : new Date(0),
      }));
      setClicks(data);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // 2️⃣ USER NACHLADEN
  useEffect(() => {
    if (!clicks.length) return;
    const uids = [...new Set(clicks.map((c) => c.userId).filter(Boolean))];
    const missing = uids.filter((uid) => !usersById[uid]);

    if (!missing.length) return;

    const fetchUsers = async () => {
      const newUsers = { ...usersById };
      await Promise.all(
        missing.map(async (uid) => {
          try {
            const snap = await getDoc(doc(db, "users", uid));
            if (snap.exists()) {
              const d = snap.data();
              newUsers[uid] = {
                firstName: d.firstName ?? d.FirstName ?? "",
                lastName: d.lastName ?? d.LastName ?? "",
                email: d.email ?? d.Email ?? "",
              };
            } else {
              newUsers[uid] = { firstName: "Gelöscht", lastName: "", email: "" };
            }
          } catch {
            newUsers[uid] = { firstName: "Fehler", lastName: "", email: "" };
          }
        })
      );
      setUsersById(newUsers);
    };

    fetchUsers();
  }, [clicks]); // Abhängigkeit clicks ist okay, da wir 'missing' prüfen

  // 3️⃣ FILTER & SORT LOGIK
  const processedRows = useMemo(() => {
    // A) Daten anreichern (User Namen reinholen)
    let data = clicks.map(c => {
      const u = usersById[c.userId] || {};
      const fullName = `${u.firstName || ""} ${u.lastName || ""}`.trim();
      return {
        ...c,
        userLabel: fullName || c.userId || "Gast", // Label für Sortierung/Suche
        userEmail: u.email || "",
      };
    });

    // B) SUCHE
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      data = data.filter(item => 
        item.userLabel.toLowerCase().includes(lowerTerm) ||
        item.userEmail.toLowerCase().includes(lowerTerm) ||
        item.offerId.toLowerCase().includes(lowerTerm) ||
        item.source.toLowerCase().includes(lowerTerm)
      );
    }

    // C) SORTIERUNG
    if (sortConfig.key) {
      data.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];

        if (sortConfig.key === "timestamp") {
          aVal = a.timestampDate;
          bVal = b.timestampDate;
        }
        
        // Strings lowercase
        if (typeof aVal === "string") aVal = aVal.toLowerCase();
        if (typeof bVal === "string") bVal = bVal.toLowerCase();

        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return data;
  }, [clicks, usersById, searchTerm, sortConfig]);

  // Sort Handler
  const requestSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  if (loading) return <div className="p-10 text-center animate-pulse text-gray-400">Lade Events...</div>;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col h-[600px]"> {/* Feste Höhe für Scroll */}
      
      {/* TOOLBAR (Titel + Suche) */}
      <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Letzte Aktivitäten</h2>
          <p className="text-xs text-gray-500">{processedRows.length} Events angezeigt</p>
        </div>

        {/* Suchfeld */}
        <div className="relative w-full sm:w-64">
           <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          <input
            type="text"
            placeholder="Suche (User, Offer, Quelle)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow outline-none"
          />
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-auto custom-scrollbar flex-1 rounded-b-2xl">
        <table className="min-w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-gray-50 text-gray-700 sticky top-0 z-10 border-b border-gray-200">
            <tr>
              <SortableHeader label="Zeitpunkt" sortKey="timestamp" currentSort={sortConfig} onSort={requestSort} />
              <SortableHeader label="User" sortKey="userLabel" currentSort={sortConfig} onSort={requestSort} />
              <SortableHeader label="Offer ID" sortKey="offerId" currentSort={sortConfig} onSort={requestSort} />
              <SortableHeader label="Quelle" sortKey="source" currentSort={sortConfig} onSort={requestSort} />
              <th className="px-6 py-3 font-semibold text-xs uppercase tracking-wider text-right">Redirect</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {processedRows.length === 0 ? (
              <tr><td colSpan="5" className="p-8 text-center text-gray-400">Keine Events gefunden.</td></tr>
            ) : (
              processedRows.map((c) => {
                const u = usersById[c.userId];
                // Kurze IDs für Display
                const displayOffer = c.offerId ? (c.offerId.length > 15 ? c.offerId.slice(0,12)+"..." : c.offerId) : "—";

                return (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    
                    {/* Zeit */}
                    <td className="px-6 py-3 font-mono text-xs text-gray-500">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-700">{c.timestampDate.toLocaleTimeString("de-DE")}</span>
                        <span className="opacity-70">{c.timestampDate.toLocaleDateString("de-DE")}</span>
                      </div>
                    </td>

                    {/* User */}
                    <td className="px-6 py-3">
                      {c.userId ? (
                        <div className="flex flex-col">
                          <Link to={`/admin/user/${c.userId}`} className="text-indigo-600 font-medium hover:underline text-xs sm:text-sm">
                            {c.userLabel === c.userId ? `UID: ${c.userId.slice(0,6)}...` : c.userLabel}
                          </Link>
                          {u?.email && <span className="text-[10px] text-gray-400">{u.email}</span>}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic text-xs">Gast</span>
                      )}
                    </td>

                    {/* Offer */}
                    <td className="px-6 py-3">
                      <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded text-gray-700 border border-gray-200" title={c.offerId}>
                        {displayOffer}
                      </span>
                    </td>

                    {/* Quelle */}
                    <td className="px-6 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {c.source}
                      </span>
                    </td>

                    {/* Redirect ID / Link */}
                    <td className="px-6 py-3 text-right text-xs font-mono text-gray-400">
                      {c.redirectId ? c.redirectId.slice(0,8)+"..." : "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

       {/* SCROLLBAR STYLE */}
       <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f9fafb; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
      `}</style>
    </div>
  );
}

// Helper für Header
function SortableHeader({ label, sortKey, currentSort, onSort }) {
  const isSorted = currentSort.key === sortKey;
  const isAsc = currentSort.direction === "asc";
  
  return (
    <th 
      onClick={() => onSort(sortKey)}
      className="px-6 py-3 text-xs font-semibold uppercase tracking-wider cursor-pointer select-none group hover:bg-gray-100 transition-colors"
    >
      <div className="flex items-center gap-1">
        {label}
        <span className={`text-[10px] flex flex-col leading-none ml-1 ${isSorted ? 'text-indigo-600' : 'text-gray-300 group-hover:text-gray-400'}`}>
          <span className={isSorted && isAsc ? "opacity-100" : "opacity-50"}>▲</span>
          <span className={isSorted && !isAsc ? "opacity-100" : "opacity-50"}>▼</span>
        </span>
      </div>
    </th>
  );
}