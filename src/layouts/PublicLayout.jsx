import { Outlet, Link } from "react-router-dom";

export default function PublicLayout() {
  return (
    <div className="min-h-screen">
      <nav className="p-4 bg-gray-800 text-white flex gap-4">
        <Link to="/">Home</Link>
        <Link to="/dashboard" className="ml-auto">Dashboard</Link>
        <Link to="/admin">Admin</Link>
      </nav>
      <main className="p-6"><Outlet /></main>
    </div>
  );
}
