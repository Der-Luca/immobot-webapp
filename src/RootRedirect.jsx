// src/RootRedirect.jsx
import { Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";

export default function RootRedirect() {
  const { user, ready } = useAuth();

  // Warten, bis Firebase fertig ist, damit es nicht flackert
  if (!ready) return null;

  // Eingeloggt → Dashboard
  if (user) return <Navigate to="/dashboard" replace />;

  // Nicht eingeloggt → Login
  return <Navigate to="/login" replace />;
}
