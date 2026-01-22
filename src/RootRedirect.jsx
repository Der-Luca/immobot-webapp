// src/RootRedirect.jsx
import { Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import LoadingScreen from "./components/LoadingScreen";
export default function RootRedirect() {

  const { user, ready, stripeStatus } = useAuth();

  if (!ready) {
    return <LoadingScreen label="Profil wird geladen…" />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (stripeStatus === "none") {
    return <Navigate to="/checkout-redirect" replace />;
  }

  return <Navigate to="/dashboard" replace />;


}
