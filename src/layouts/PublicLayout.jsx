// src/layouts/PublicLayout.jsx
import { Outlet, useLocation } from "react-router-dom";
import MainNav from "./MainNav";

export default function PublicLayout() {
  const location = useLocation();
  const isLogin = location.pathname === "/login";

  return (
    <div className="min-h-screen">
      <MainNav />
      <main className={isLogin ? "min-h-screen" : "p-6"}>
        <Outlet />
      </main>
    </div>
  );
}
