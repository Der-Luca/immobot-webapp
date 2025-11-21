import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import LoadingScreen from "../components/LoadingScreen";

export default function ProtectedRoute({ children }) {
  const { user, ready } = useAuth(); // <<< nicht loading

  // 1) Auth wird noch geladen → NICHT redirecten
  if (!ready) {
    return <LoadingScreen label="Profil wird geladen…" />;
  }

  // 2) Wenn ready, aber kein User → redirect
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 3) Alles ok → children rendern
  return children;
}
