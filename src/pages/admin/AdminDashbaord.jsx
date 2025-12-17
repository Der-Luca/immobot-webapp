import { Link } from "react-router-dom";

export default function AdminDashboard() {
  return (
    // Hintergrund leicht abgetönt für Tiefe, Inhalt zentriert
    <div className="min-h-screen bg-gray-50/50 p-8 md:p-12">
      <div className="max-w-5xl mx-auto space-y-12">
        
        {/* HEADER SECTION */}
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">
            Immobot <span className="text-indigo-600">Admin</span>
          </h1>
          <p className="text-lg text-gray-500">
            Willkommen zurück. Wähle einen Bereich zur Verwaltung.
          </p>
        </div>

        {/* NAVIGATION GRID (Bento Style) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <NavCard
            title="User Management"
            desc="Benutzerliste, Rollen & Zugriffsrechte verwalten."
            to="/admin/users"
            icon={<UserIcon />}
            color="text-blue-600"
            bg="bg-blue-50"
          />

          <NavCard
            title="Klick-Events"
            desc="Tracking-Daten und Klick-Analysen einsehen."
            to="/admin/clicks"
            icon={<ChartIcon />}
            color="text-violet-600"
            bg="bg-violet-50"
          />

          <NavCard
            title="Offer Redirects"
            desc="Weiterleitungen zu Partner-Angeboten steuern."
            to="/admin/offers"
            icon={<LinkIcon />}
            color="text-emerald-600"
            bg="bg-emerald-50"
          />
          
        </div>
      </div>
    </div>
  );
}

// MODERN CARD COMPONENT
function NavCard({ title, desc, to, icon, color, bg }) {
  return (
    <Link
      to={to}
      className="group relative flex flex-col justify-between p-8 bg-white rounded-2xl border border-gray-200 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-indigo-100 overflow-hidden"
    >
      {/* Dekorativer Hintergrund-Gradient beim Hover */}
      <div className={`absolute top-0 right-0 w-32 h-32 ${bg} rounded-full blur-3xl opacity-0 group-hover:opacity-50 transition-opacity duration-500 -mr-10 -mt-10 pointer-events-none`} />

      <div>
        <div className={`w-12 h-12 rounded-xl ${bg} ${color} flex items-center justify-center mb-6 transition-transform group-hover:scale-110`}>
          {icon}
        </div>
        <h2 className="text-xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
          {title}
        </h2>
        <p className="text-sm text-gray-500 mt-2 leading-relaxed">
          {desc}
        </p>
      </div>

      <div className="mt-8 flex items-center text-sm font-medium text-gray-400 group-hover:text-indigo-600 transition-colors">
        Öffnen
        <svg className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
      </div>
    </Link>
  );
}

/* --- ICONS (SVG) --- 
   Damit du keine extra Library installieren musst, sind hier saubere SVGs direkt drin.
*/

function UserIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  );
}