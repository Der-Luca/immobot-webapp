import { Outlet } from "react-router-dom";
import MainNav from "./MainNav";
import { useAuth } from "../contexts/AuthContext";
import EmailVerificationOverlay from "../components/EmailVerificationOverlay";

export default function UserLayout() {
  const { emailVerified } = useAuth();

  return (
    <div className="min-h-screen">
      <MainNav />
      {emailVerified === false && <EmailVerificationOverlay />}
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
}
