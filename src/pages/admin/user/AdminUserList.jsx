import { useEffect, useState, useMemo } from "react";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "../../../firebase"; // Pfad ggf. anpassen
import { Link } from "react-router-dom";

export default function AdminUserList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // STATE für Suche & Sortierung
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "createdAt", direction: "desc" });

  useEffect(() => {
    const load = async () => {
      // Wir laden erst alle User (sortiert nach Datum als Default)
      // Client-Side Filtering/Sorting ist bei <5000 Usern viel schneller als Firestore Indexe
      const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
      
      const snap = await getDocs(q);
      const data = snap.docs.map((d) => ({
        uid: d.id,
        ...d.data(),
        // Normalisiere Daten für einfacheres Sortieren
        firstName: d.data().firstName ?? d.data().FirstName ?? "",
        lastName: d.data().lastName ?? d.data().LastName ?? "",
        email: d.data().email ?? d.data().Email ?? "",
        stripeStatus: d.data().stripeStatus ?? "—",
        createdAtDate: d.data().createdAt?.toDate ? d.data().createdAt.toDate() : null,
      }));

      setUsers(data);
      setLoading(false);
    };

    load();
  }, []);

  // --- LOGIC: SORTING & FILTERING ---
  const filteredUsers = useMemo(() => {
    // 1. Filtern
    let filtered = users.filter((u) => {
      const fullString = `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase();
      return fullString.includes(searchTerm.toLowerCase());
    });

    // 2. Sortieren
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Sonderfall für Datums-Sortierung (wenn key === 'createdAt')
        if (sortConfig.key === 'createdAt') {
             aValue = a.createdAtDate || new Date(0);
             bValue = b.createdAtDate || new Date(0);
        }

        // String Vergleich case-insensitive
        if (typeof aValue === 'string') aValue = aValue.toLowerCase();
        if (typeof bValue === 'string') bValue = bValue.toLowerCase();

        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return filtered;
  }, [users, searchTerm, sortConfig]);

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
    if (sortConfig.key !== column) return <span className="ml-2 text-gray-300 opacity-0 group-hover:opacity-50">↕</span>;
    return <span className="ml-2 text-indigo-600">{sortConfig.direction === "asc" ? "↑" : "↓"}</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 animate-pulse">
        Lade Benutzerdaten...
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      
      {/* HEADER & SUCHE */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Userübersicht</h1>
          <p className="text-sm text-gray-500">{filteredUsers.length} Benutzer gefunden</p>
        </div>
        
        <div className="relative w-full md:w-72">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {/* Search Icon SVG */}
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition duration-150 ease-in-out"
            placeholder="Suchen (Name, E-Mail)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* TABLE CONTAINER */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col max-h-[75vh]">
        <div className="overflow-auto flex-1">
          <table className="min-w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10 shadow-sm">
              <tr>
                <th 
                  onClick={() => handleSort("firstName")}
                  className="px-6 py-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 group select-none transition-colors"
                >
                  Name <SortIcon column="firstName" />
                </th>
                <th 
                  onClick={() => handleSort("email")}
                  className="px-6 py-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 group select-none transition-colors"
                >
                  E-Mail <SortIcon column="email" />
                </th>
                <th 
                  onClick={() => handleSort("stripeStatus")}
                  className="px-6 py-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 group select-none transition-colors"
                >
                  Status <SortIcon column="stripeStatus" />
                </th>
                <th 
                  onClick={() => handleSort("createdAt")}
                  className="px-6 py-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 group select-none transition-colors"
                >
                  Erstellt am <SortIcon column="createdAt" />
                </th>
                <th className="px-6 py-4 font-semibold text-gray-700 text-right">
                  Aktion
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-10 text-center text-gray-500">
                    Keine Benutzer gefunden.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const statusColor =
                    u.stripeStatus === "paid"
                      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                      : u.stripeStatus === "canceled"
                      ? "bg-red-50 text-red-600 border-red-100"
                      : "bg-gray-100 text-gray-600 border-gray-200";

                  return (
                    <tr key={u.uid} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs mr-3">
                            {u.firstName?.[0] || "?"}{u.lastName?.[0] || ""}
                          </div>
                          {`${u.firstName} ${u.lastName}`.trim() || "Unbekannt"}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-gray-500">
                        {u.email}
                      </td>

                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColor}`}>
                          {u.stripeStatus}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-gray-500 font-mono text-xs">
                        {u.createdAtDate?.toLocaleDateString("de-DE", { 
                          day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute:'2-digit' 
                        }) ?? "—"}
                      </td>
                      
                      <td className="px-6 py-4 text-right">
                        <Link
                          to={`/admin/user/${u.uid}`}
                          className="text-indigo-600 hover:text-indigo-900 font-medium text-xs border border-indigo-200 hover:border-indigo-400 px-3 py-1.5 rounded-lg transition-all"
                        >
                          Verwalten
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}