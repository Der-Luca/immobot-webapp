// src/layouts/PublicLayout.jsx
import { Outlet, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import LoadingScreen from "../components/LoadingScreen";
import MainNav from "./MainNav";

export default function PublicLayout() {
  const { user, ready } = useAuth();
  const location = useLocation();

  // warten bis Auth bekannt ist
  if (!ready) return <LoadingScreen label="Profil wird geladen…" />;

  // wenn eingeloggt: alle public-routen wegredirecten
  if (user) {
    // optional: falls du jemals eine öffentliche Seite erlauben willst,
    // kannst du hier eine Allowlist prüfen (siehe unten)
    return <Navigate to="/dashboard" replace state={{ from: location }} />;
  }

  return (
    <div className="min-h-screen">
      <MainNav />
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
}
