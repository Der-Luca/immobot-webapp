import { useMemo, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { doc, getDoc } from "firebase/firestore";

import { useAuth } from "../../contexts/AuthContext";
import useUserFilters from "./hooks/useUserFilters";
import RequirePayment from "../../components/payment/RequirePayment";
import { db } from "../../firebase";

// --- 1. Die Logik für die Begrüßung ---
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 11) return "Guten Morgen";
  if (hour < 18) return "Guten Tag";
  return "Guten Abend";
}

// Hilfsfunktion: Zählt aktive Filter
function countActiveFilters(filters) {
  if (!filters) return 0;
  return Object.values(filters).filter((v) => {
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === "object" && v !== null) return Object.keys(v).length > 0;
    return v !== null && v !== "" && v !== false;
  }).length;
}

export default function Dashboard() {
  const { user } = useAuth(); // liefert uid (und evtl. email), aber Firstname kommt aus Firestore
  const { filters, loading } = useUserFilters();

  const [firstName, setFirstName] = useState("");

  // --- Firstname aus Firestore laden: users/{uid}.firstName ---
  useEffect(() => {
    let cancelled = false;

    async function loadUserProfile() {
      if (!user?.uid) return;

      try {
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);

        if (cancelled) return;

        if (snap.exists()) {
          const data = snap.data() || {};
          setFirstName(typeof data.firstName === "string" ? data.firstName : "");
        } else {
          setFirstName("");
        }
      } catch (err) {
        console.error("Fehler beim Laden des Userprofils:", err);
        if (!cancelled) setFirstName("");
      }
    }

    loadUserProfile();
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  const activeFilters = useMemo(() => countActiveFilters(filters), [filters]);
  const greeting = getGreeting(); // "Guten Morgen" / "Abend"

  // Animationen für butterweichen Einstieg
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 100 },
    },
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-4 w-32 bg-gray-200 rounded mb-4"></div>
          <div className="h-64 w-64 bg-gray-200 rounded-3xl"></div>
        </div>
      </div>
    );
  }

  return (
    <RequirePayment>
      <motion.div
        className="min-h-screen bg-[#FDFDFD] p-6 md:p-12 font-sans text-gray-900"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="max-w-6xl mx-auto space-y-12">
          {/* --- HEADER MIT NAME & BEGRÜSSUNG --- */}
          <motion.div variants={itemVariants} className="space-y-1">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
              {greeting}, <br className="md:hidden" />
              <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-600 to-violet-600">
                {firstName}
              </span>
              <motion.span
                className="inline-block ml-4"
                animate={{ rotate: [0, 14, -8, 14, -4, 10, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1 }}
              >
                👋
              </motion.span>
            </h1>
            <p className="text-lg md:text-xl text-gray-400 font-medium">
              Schön, dich wiederzusehen. Hier ist dein Status.
            </p>
          </motion.div>

          {/* --- GRID LAYOUT --- */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* KARTE 1: FILTER (Dark Aesthetic) */}
            <DashboardCard to="/dashboard/filters" variant="dark">
              <div className="flex flex-col h-full justify-between">
                <div className="flex justify-between items-start">
                  <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/5">
                    <svg
                      className="w-6 h-6 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                      />
                    </svg>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white backdrop-blur-sm border border-white/10">
                    Konfiguration
                  </span>
                </div>

                <div className="space-y-2 mt-8">
                  <div className="text-6xl font-black text-white tracking-tighter">
                    {activeFilters}
                  </div>
                  <h3 className="text-xl font-bold text-white">Aktive Suchfilter</h3>
                  <p className="text-white/60 text-sm leading-relaxed max-w-xs">
                    Deine Kriterien für Standort, Preis und Ausstattung.
                  </p>
                </div>

                <div className="mt-8 flex items-center text-sm font-bold text-white/80 group-hover:text-white transition-colors">
                  Bearbeiten <ArrowRight />
                </div>
              </div>
            </DashboardCard>

            {/* KARTE 2: ERGEBNISSE (Light Aesthetic) */}
            <DashboardCard to="/dashboard/results" variant="light">
              <div className="flex flex-col h-full justify-between relative overflow-hidden">
                {/* Deko Blob */}
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-50 pointer-events-none mix-blend-multiply" />

                <div className="flex justify-between items-start z-10">
                  <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-100">
                    <svg
                      className="w-6 h-6 text-indigo-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                      />
                    </svg>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">
                    Live Suche
                  </span>
                </div>

                <div className="space-y-2 mt-8 z-10">
                  <h3 className="text-2xl font-bold text-gray-900">Suchergebnisse</h3>
                  <p className="text-gray-500 text-sm leading-relaxed max-w-xs">
                    Wir haben den Markt gescannt. Schau dir die Treffer an, die zu
                    deinen Filtern passen.
                  </p>
                </div>

                <div className="mt-8 flex items-center text-sm font-bold text-indigo-600 group-hover:text-indigo-700 transition-colors z-10">
                  Ergebnisse öffnen <ArrowRight />
                </div>
              </div>
            </DashboardCard>
          </div>
        </div>
      </motion.div>
    </RequirePayment>
  );
}

// --- SUB-KOMPONENTEN ---

function DashboardCard({ children, to, variant }) {
  const isDark = variant === "dark";
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, scale: 0.95 },
        visible: { opacity: 1, scale: 1 },
      }}
      whileHover={{ y: -8 }}
      whileTap={{ scale: 0.98 }}
    >
      <Link
        to={to}
        className={`
          group relative block h-full p-8 md:p-10 rounded-[2.5rem] overflow-hidden transition-all duration-500 shadow-xl
          ${
            isDark
              ? "bg-gray-900 border border-gray-800 shadow-2xl shadow-gray-900/20"
              : "bg-white border border-gray-100 shadow-2xl shadow-indigo-100/50"
          }
        `}
      >
        {/* Dark Mode Gradient Overlay */}
        {isDark && (
          <div className="absolute inset-0 bg-linear-to-br from-indigo-600/20 via-transparent to-purple-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        )}
        <div className="relative z-10 h-full">{children}</div>
      </Link>
    </motion.div>
  );
}

function ArrowRight() {
  return (
    <svg
      className="w-4 h-4 ml-2 transition-transform duration-300 group-hover:translate-x-1"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.5}
        d="M14 5l7 7m0 0l-7 7m7-7H3"
      />
    </svg>
  );
}
