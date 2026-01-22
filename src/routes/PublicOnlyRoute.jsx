// src/routes/PublicOnlyRoute.jsx
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import LoadingScreen from "../components/LoadingScreen";

export default function PublicOnlyRoute({ children }) {
  const { user, ready } = useAuth();
  const { pathname } = useLocation();

  if (!ready) {
    return <LoadingScreen label="Profil wird geladen…" />;
  }

  const isCheckoutRedirect = pathname === "/register/checkout-redirect";

  // ✅ Eingeloggt darf NICHT zurück in Register (außer CheckoutRedirect)
  if (user && !isCheckoutRedirect) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
