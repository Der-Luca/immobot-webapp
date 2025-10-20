import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function AdminRoute({ children }) {
  const { user, role } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  if (role !== "admin") return <Navigate to="/" replace />;
  return children;
}
