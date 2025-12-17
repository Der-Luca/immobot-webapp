import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { db } from "@/firebase.js";
import { doc, getDoc } from "firebase/firestore";

// Sub-Komponenten (Vorhandene Logik behalten, nur Container stylen)
import RenderValue from "./components/RenderValue";
import UserPayments from "./components/UserPayments";
import UserSearchHistory from "./components/UserSearchHistory";
import UserClickHistory from "./components/UserClickHistory";

export default function AdminUserDetails() {
  const { uid } = useParams();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const snap = await getDoc(doc(db, "users", uid));
        if (!snap.exists()) {
          setError("User nicht gefunden");
          return;
        }
        setUser({ uid, ...snap.data() });
      } catch (err) {
        console.error(err);
        setError("Fehler beim Laden des Users");
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, [uid]);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    // Optional: Toast Notification hier
  };

  if (loading) return <div className="p-10 text-center animate-pulse text-gray-500">Lade Profil...</div>;
  if (error) return <div className="p-10 text-center text-red-600 font-bold">{error}</div>;

  // Daten vorbereiten
  const firstName = user.firstName ?? user.FirstName ?? "Unbekannt";
  const lastName = user.lastName ?? user.LastName ?? "";
  const email = user.email ?? user.Email ?? "—";
  const role = user.role ?? "user";
  const createdAt = user.createdAt?.toDate ? user.createdAt.toDate().toLocaleDateString("de-DE") : "—";
  
  // Status Farbe
  const status = user.stripeStatus || "free";
  const isPremium = status === "paid" || status === "active";
  const statusColors = isPremium 
    ? "bg-emerald-100 text-emerald-700 border-emerald-200" 
    : status === "canceled" 
    ? "bg-red-50 text-red-600 border-red-100" 
    : "bg-gray-100 text-gray-600 border-gray-200";

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* TOP NAV: BACK LINK */}
        <div>
          <Link 
            to="/admin/users" 
            className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors mb-4"
          >
            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Zurück zur Übersicht
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* --- LINKE SPALTE: PROFIL & STAMMDATEN (Sticky) --- */}
          <div className="space-y-6 lg:sticky lg:top-6">
            
            {/* 1. PROFIL KARTE */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Header BG */}
              <div className="h-24 bg-gradient-to-r from-indigo-500 to-blue-600"></div>
              
              <div className="px-6 pb-6 relative">
                {/* Avatar */}
                <div className="-mt-12 mb-4">
                   <div className="h-24 w-24 rounded-full bg-white p-1 shadow-md">
                     <div className="h-full w-full rounded-full bg-gray-100 flex items-center justify-center text-2xl font-bold text-gray-400 uppercase">
                       {firstName[0]}{lastName[0]}
                     </div>
                   </div>
                </div>

                {/* Name & Badges */}
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{firstName} {lastName}</h1>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide border ${statusColors}`}>
                      {status}
                    </span>
                    <span className="px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide bg-blue-50 text-blue-700 border border-blue-100">
                      {role}
                    </span>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  {/* Email */}
                  <InfoRow label="E-Mail" value={email} icon={
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  } />
                  
                  {/* UID */}
                  <div className="group">
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">User ID</div>
                    <div 
                      onClick={() => copyToClipboard(user.uid)}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200 cursor-pointer hover:border-indigo-300 transition-colors"
                      title="Klicken zum Kopieren"
                    >
                      <code className="text-xs text-gray-600 font-mono truncate mr-2">{user.uid}</code>
                      <svg className="w-4 h-4 text-gray-400 group-hover:text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    </div>
                  </div>

                  {/* Joined */}
                  <InfoRow label="Mitglied seit" value={createdAt} icon={
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  } />
                </div>
              </div>
            </div>

            {/* 2. AKTUELLER SUCHFILTER */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">
                Aktiver Suchfilter
              </h2>
              {user.lastSearch ? (
                <div className="text-sm">
                  <RenderValue value={user.lastSearch} />
                </div>
              ) : (
                <div className="text-sm text-gray-400 italic">Kein Filter gesetzt.</div>
              )}
            </div>
          </div>


          {/* --- RECHTE SPALTE: DETAILS & HISTORY --- */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* ZAHLUNGEN */}
            <SectionContainer title="Zahlungen & Abos">
              <UserPayments user={user} />
            </SectionContainer>

            {/* KLICK HISTORIE */}
            <SectionContainer title="Klick-Historie">
               <UserClickHistory uid={user.uid} />
            </SectionContainer>

            {/* SUCH HISTORIE */}
            <SectionContainer title="Such-Verlauf">
              <UserSearchHistory uid={user.uid} />
            </SectionContainer>

          </div>

        </div>
      </div>
    </div>
  );
}

// --- HILFSKOMPONENTEN ---

function SectionContainer({ title, children }) {
  return (
    <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/30">
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      </div>
      <div className="p-6">
        {children}
      </div>
    </section>
  );
}

function InfoRow({ label, value, icon }) {
  return (
    <div>
      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">{label}</div>
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
        {icon && <span className="text-gray-400">{icon}</span>}
        {value}
      </div>
    </div>
  );
}