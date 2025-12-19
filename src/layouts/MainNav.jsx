import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function MainNav() {
  const { user, role, logout, ready } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // ✅ HOOKS IMMER ZUERST
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ✅ ERST DANACH RETURN-LOGIK
  if (!ready) return null;
  if (!user) return null;

  const isAdmin = role === "admin";
  const firstName = user?.firstName || user?.email?.split("@")[0] || "U";
  const initial = firstName.charAt(0).toUpperCase();

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 h-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
        <div className="flex justify-between items-center h-full">
          
          {/* LINKER BEREICH */}
          <div className="flex items-center gap-8">
            <Link to="/dashboard" className="flex items-center gap-2 group">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm group-hover:bg-indigo-700 transition">
                I
              </div>
              <span className="text-xl font-bold text-gray-900 tracking-tight">
                Immobot
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-6">
              <NavLink to="/dashboard">Dashboard</NavLink>
              {isAdmin && (
                <NavLink to="/admin" activeColor="text-indigo-600">
                  Admin
                </NavLink>
              )}
            </div>
          </div>

          {/* RECHTER BEREICH */}
          <div className="relative ml-auto" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center gap-3 p-1 rounded-full hover:bg-gray-100 transition focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <div className="hidden sm:block text-right mr-1">
                <p className="text-sm font-medium text-gray-700 leading-none">
                  {firstName}
                </p>
                <p className="text-xs text-gray-400 mt-1 uppercase tracking-wide">
                  {isAdmin ? "Admin" : "User"}
                </p>
              </div>

              <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md ring-2 ring-white">
                {initial}
              </div>
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2">
                <div className="px-4 py-2 border-b border-gray-100 sm:hidden">
                  <p className="text-sm font-semibold text-gray-900">
                    {firstName}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {user.email}
                  </p>
                </div>

                <Link
                  to="/dashboard/profile"
                  onClick={() => setIsMenuOpen(false)}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600"
                >
                  Mein Profil
                </Link>

                {isAdmin && (
                  <Link
                    to="/admin"
                    onClick={() => setIsMenuOpen(false)}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 md:hidden"
                  >
                    Admin Bereich
                  </Link>
                )}

                <div className="my-1 border-t border-gray-100" />

                <button
                  onClick={logout}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  Abmelden
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

function NavLink({ to, children, activeColor = "text-gray-900" }) {
  return (
    <Link
      to={to}
      className={`text-sm font-medium text-gray-500 hover:${activeColor} hover:bg-gray-50 px-3 py-2 rounded-md transition-all`}
    >
      {children}
    </Link>
  );
}
