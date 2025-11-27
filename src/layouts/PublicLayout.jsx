// src/layouts/PublicLayout.jsx
import { Outlet, useLocation } from "react-router-dom";
import MainNav from "./MainNav";

export default function PublicLayout() {
  const location = useLocation();

  // Pfade, auf denen KEINE Navbar angezeigt werden soll
  const hideNavOn = ["/login"];

  const showNav = !hideNavOn.includes(location.pathname);

  return (
    <div className="min-h-screen ">
      {showNav && <MainNav />}

      <main className="min-h-[calc(100vh-64px)]">
        <Outlet />
      </main>
    </div>
  );
}
