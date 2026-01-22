// src/layouts/PublicLayout.jsx
import { Outlet, Navigate, useLocation } from "react-router-dom";
import MainNav from "./MainNav";

export default function PublicLayout() {

  return (
    <div className="min-h-screen">
      <MainNav />
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
}
