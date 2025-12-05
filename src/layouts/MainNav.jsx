import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function MainNav() {
  const { user, role, logout, ready } = useAuth();

  // Solange Auth prüft -> nichts anzeigen (verhindert Flackern)
  if (!ready) {
    return null; 
  }

  const loggedIn = !!user;

  // HIER IST DER TRICK:
  // Wenn nicht eingeloggt -> return null (Komponente rendert gar nichts)
  if (!loggedIn) {
    return null;
  }

  const isAdmin = role === "admin";
  const firstName = user?.email?.split("@")[0] || "User";

  return (
    // 'flex-wrap' hinzugefügt, damit es auf kleinen Handys umbricht und nicht abschneidet
    <nav className="p-4 bg-gray-900 text-white flex flex-wrap items-center gap-4 md:gap-6 shadow-md">
      
      {/* Logo / Brand */}
      <Link to="/dashboard" className="font-bold text-lg mr-2">
        Immobot
      </Link>

      {/* Normale Links */}
      <Link to="/dashboard" className="hover:text-gray-300 transition">
        Home
      </Link>

      {/* ADMIN */}
      {isAdmin && (
        <Link to="/admin" className="text-yellow-400 font-semibold hover:text-yellow-300 transition">
          Admin
        </Link>
      )}

      {/* Rechte Seite (User & Logout) */}
      {/* 'ml-auto' schiebt das nach rechts. Auf Mobile evtl. neue Zeile durch flex-wrap */}
      <div className="ml-auto flex items-center gap-4">
        {/* Auf sehr kleinen Handys (unter sm) verstecken wir den Namen, um Platz zu sparen */}
        <span className="hidden sm:inline text-sm text-gray-300">
          Hi, <strong className="text-white">{firstName}</strong>
        </span>
        
        <button
          onClick={logout}
          className="px-3 py-1.5 bg-red-600 rounded text-sm font-medium hover:bg-red-700 transition"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}