import { Outlet, Link } from "react-router-dom";

export default function AdminLayout() {
  return (
    <div className="min-h-screen">
      <nav className="p-4 bg-black text-white flex gap-4">
        <Link to="/admin">Admin</Link>
        <Link to="/dashboard" className="ml-auto">Zur App</Link>
      </nav>
      <main className="p-6"><Outlet /></main>
    </div>
  );
}
