import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import LoadingScreen from "../components/LoadingScreen";

export default function AdminRoute({ children }) {
  const { user, role, ready } = useAuth();

  // 1️⃣ Auth / Role noch nicht geladen → warten
  if (!ready) {
    return <LoadingScreen label="Adminrechte werden geprüft…" />;
  }

  // 2️⃣ Nicht eingeloggt
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 3️⃣ Kein Admin
  if (role !== "admin") {
    return <Navigate to="/" replace />;
  }

  // 4️⃣ Alles ok
  return children;
}
