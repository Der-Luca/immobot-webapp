import { Outlet, Link } from "react-router-dom";

export default function UserLayout() {
  return (
    <div className="min-h-screen">
      <nav className="p-4 bg-gray-900 text-white flex gap-4">
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/admin" className="ml-auto">Admin</Link>
      </nav>
      <main className="p-6"><Outlet /></main>
    </div>
  );
}
