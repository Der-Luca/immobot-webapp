import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function MainNav() {
  const { user, role, logout, ready } = useAuth();

  if (!ready) {
    return (
      <nav className="p-4 bg-gray-900 text-white">
        <span>Lade…</span>
      </nav>
    );
  }

  const loggedIn = !!user;
  const isAdmin = role === "admin";

  const firstName = user?.email?.split("@")[0] || "User";

  return (
    <nav className="p-4 bg-gray-900 text-white flex items-center gap-6">
      {/* Links */}
      <Link to="/" className="font-bold">Immobot</Link>

      {/* PUBLIC */}
      {!loggedIn && (
        <>
          <Link to="/register/step1">Registrieren</Link>
          <Link to="/login" className="ml-auto">Login</Link>
        </>
      )}

      {/* USER */}
      {loggedIn && (
        <>
          <Link to="/dashboard">Home</Link>

          {/* ADMIN */}
          {isAdmin && (
            <Link to="/admin" className="text-yellow-400 font-semibold">
              Admin-Area
            </Link>
          )}

          {/* Rechts */}
          <div className="ml-auto flex items-center gap-4">
            <span>Willkommen, <strong>{firstName}</strong></span>
            <button
              onClick={logout}
              className="px-3 py-1 bg-red-600 rounded hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </>
      )}
    </nav>
  );
}
