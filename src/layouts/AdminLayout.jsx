import { Outlet } from "react-router-dom";
import MainNav from "./MainNav";

export default function AdminLayout() {
  return (
    <div className="min-h-screen">
      <MainNav />
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
}
