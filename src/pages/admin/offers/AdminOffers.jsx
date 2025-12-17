import { useEffect, useState, useMemo } from "react";
import { collection, query, orderBy, getDocs, doc, getDoc } from "firebase/firestore";
import { Link } from "react-router-dom";
import { db } from "@/firebase.js";

export default function AdminOffers() {
  const [offers, setOffers] = useState([]);
  const [usersById, setUsersById] = useState({});
  const [loading, setLoading] = useState(true);

  // STATE für Suche & Sortierung
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "createdAt", direction: "desc" });

  // 1️⃣ DATEN LADEN
  useEffect(() => {
    const load = async () => {
      // Offers holen
      const q = query(collection(db, "offerRedirects"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      
      const rawOffers = snap.docs.map((d) => ({
        docId: d.id,
        ...d.data(),
        // WICHTIG: Daten normalisieren für sauberes Sortieren
        title: d.data().title || "",
        vendorName: d.data().vendor?.name || "",
        source: d.data().source || "System",
        price: Number(d.data().price) || 0, // Zahl erzwingen
        rooms: Number(d.data().rooms) || 0, // Zahl erzwingen
        createdAtDate: d.data().createdAt?.toDate ? d.data().createdAt.toDate() : new Date(0),
      }));

      // User IDs sammeln
      const uids = [...new Set(rawOffers.map(o => o.uid).filter(Boolean))];
      const userMap = {};

      // User nachladen
      await Promise.all(
        uids.map(async (uid) => {
          const userSnap = await getDoc(doc(db, "users", uid));
          if (userSnap.exists()) {
            const d = userSnap.data();
            userMap[uid] = {
              firstName: d.firstName ?? d.FirstName ?? "",
              lastName: d.lastName ?? d.LastName ?? "",
              email: d.email ?? d.Email ?? "",
            };
          }
        })
      );

      setOffers(rawOffers);
      setUsersById(userMap);
      setLoading(false);
    };

    load();
  }, []);

  // --- LOGIC: SORTING & FILTERING (Identisch zur UserList) ---
  const filteredOffers = useMemo(() => {
    // A) Daten verknüpfen (User Name in das Offer Objekt holen)
    let data = offers.map(offer => {
      const user = usersById[offer.uid] || {};
      const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
      return {
        ...offer,
        userName: fullName || "Unbekannt",
        userEmail: user.email || "",
      };
    });

    // B) Filtern
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      data = data.filter((item) => 
        item.title.toLowerCase().includes(lowerTerm) ||
        item.vendorName.toLowerCase().includes(lowerTerm) ||
        item.userName.toLowerCase().includes(lowerTerm) ||
        item.userEmail.toLowerCase().includes(lowerTerm)
      );
    }

    // C) Sortieren
    if (sortConfig.key) {
      data.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Sonderfall Datum
        if (sortConfig.key === 'createdAt') {
             aValue = a.createdAtDate;
             bValue = b.createdAtDate;
        }

        // String Vergleich case-insensitive
        if (typeof aValue === 'string') aValue = aValue.toLowerCase();
        if (typeof bValue === 'string') bValue = bValue.toLowerCase();

        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return data;
  }, [offers, usersById, searchTerm, sortConfig]);

  // Handler für Klick auf Spaltenkopf
  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  // Helper für Sortier-Pfeile
  const SortIcon = ({ column }) => {
    if (sortConfig.key !== column) return <span className="ml-2 text-gray-300 opacity-0 group-hover:opacity-50 transition-opacity">↕</span>;
    return <span className="ml-2 text-indigo-600 font-bold">{sortConfig.direction === "asc" ? "↑" : "↓"}</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 animate-pulse">
        Lade Angebote...
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      
      {/* HEADER & SUCHE */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Offer Redirects</h1>
          <p className="text-sm text-gray-500">{filteredOffers.length} Einträge gefunden</p>
        </div>
        
        <div className="relative w-full md:w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {/* Search Icon SVG */}
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition duration-150 ease-in-out"
            placeholder="Suchen (Titel, User, Anbieter)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* TABLE CONTAINER (mit Scrollbar Logik wie bei UserList) */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col max-h-[75vh]">
        <div className="overflow-auto flex-1">
          <table className="min-w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10 shadow-sm">
              <tr>
                <th onClick={() => handleSort("title")} className="px-6 py-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 group select-none transition-colors">
                  Titel <SortIcon column="title" />
                </th>
                <th onClick={() => handleSort("price")} className="px-6 py-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 group select-none transition-colors">
                  Preis <SortIcon column="price" />
                </th>
                <th onClick={() => handleSort("rooms")} className="px-6 py-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 group select-none transition-colors">
                  Zi. <SortIcon column="rooms" />
                </th>
                <th onClick={() => handleSort("source")} className="px-6 py-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 group select-none transition-colors">
                  Quelle <SortIcon column="source" />
                </th>
                <th onClick={() => handleSort("userName")} className="px-6 py-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 group select-none transition-colors">
                  User <SortIcon column="userName" />
                </th>
                <th onClick={() => handleSort("createdAt")} className="px-6 py-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 group select-none transition-colors">
                  Datum <SortIcon column="createdAt" />
                </th>
                <th className="px-6 py-4 font-semibold text-gray-700 text-right">Link</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {filteredOffers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-10 text-center text-gray-500">
                    Keine Offers gefunden.
                  </td>
                </tr>
              ) : (
                filteredOffers.map((o) => (
                  <tr key={o.docId} className="hover:bg-gray-50 transition-colors">
                    
                    {/* Titel */}
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 max-w-[180px] truncate" title={o.title}>
                        {o.title || "—"}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {o.vendorName || "Unbekannt"}
                      </div>
                    </td>

                    {/* Preis */}
                    <td className="px-6 py-4 font-mono text-gray-700">
                      {o.price > 0 ? `${o.price} €` : "—"}
                    </td>

                    {/* Zimmer */}
                    <td className="px-6 py-4 text-gray-600">
                      {o.rooms || "—"}
                    </td>

                    {/* Quelle */}
                    <td className="px-6 py-4">
                       <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                        {o.source}
                      </span>
                    </td>

                    {/* User */}
                    <td className="px-6 py-4">
                      {o.uid ? (
                        <div className="flex flex-col">
                          <Link to={`/admin/user/${o.uid}`} className="text-indigo-600 font-medium hover:underline">
                            {o.userName}
                          </Link>
                          <span className="text-xs text-gray-400">{o.userEmail}</span>
                        </div>
                      ) : (
                         <span className="text-gray-400 italic">Gast</span>
                      )}
                    </td>

                    {/* Datum */}
                    <td className="px-6 py-4 text-gray-500 font-mono text-xs">
                      {o.createdAtDate?.toLocaleDateString("de-DE") ?? "—"} <span className="text-gray-400">| {o.createdAtDate?.toLocaleTimeString("de-DE", {hour:'2-digit', minute:'2-digit'})}</span>
                    </td>
                    
                    {/* Link Action */}
                    <td className="px-6 py-4 text-right">
                      {o.redirectUrl ? (
                        <a
                          href={o.redirectUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-100 transition-all"
                        >
                          ↗
                        </a>
                      ) : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}