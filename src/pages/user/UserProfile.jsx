import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase.js";

export default function UserProfile() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Daten aus Firestore laden (für Stripe-Status, Namen etc.)
  useEffect(() => {
    async function loadProfile() {
      if (!user?.uid) return;
      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setProfile(docSnap.data());
        }
      } catch (err) {
        console.error("Fehler beim Laden des Profils:", err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [user]);

  if (loading) {
    return <div className="p-10 text-center animate-pulse text-gray-400">Lade Profil...</div>;
  }

  // Fallbacks für fehlende Daten
  const firstName = profile?.firstName || profile?.FirstName || "User";
  const lastName = profile?.lastName || profile?.LastName || "";
  const initial = firstName.charAt(0).toUpperCase();
  const status = profile?.stripeStatus || "free"; // 'active', 'paid', 'canceled', 'free'
  
  // Status Farben Logik
  const isPremium = status === "active" || status === "paid";
  const statusColor = isPremium 
    ? "bg-emerald-100 text-emerald-700 border-emerald-200" 
    : "bg-gray-100 text-gray-600 border-gray-200";

  const handleManageSubscription = () => {
    // Hier Logik einfügen, um zum Stripe Customer Portal weiterzuleiten
    // z.B. window.location.href = "DEIN_CLOUD_FUNCTION_LINK";
    alert("Hier würde sich das Stripe Portal öffnen.");
  };

  return (
    <div className="min-h-[80vh] bg-gray-50/50 p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Mein Profil</h1>
          <p className="text-gray-500 mt-1">Verwalte deine persönlichen Daten und dein Abonnement.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* LINKER BEREICH: STAMMDATEN (2/3 Breite) */}
          <div className="md:col-span-2 space-y-6">
            
            {/* Karte: Persönliche Daten */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h2 className="font-bold text-gray-900">Persönliche Daten</h2>
                {/* Optionaler Edit Button */}
                <button className="text-sm text-indigo-600 font-medium hover:underline">
                  Bearbeiten
                </button>
              </div>
              
              <div className="p-8 flex flex-col sm:flex-row gap-8 items-start">
                {/* Großer Avatar */}
                <div className="flex-shrink-0">
                  <div className="h-24 w-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg ring-4 ring-white">
                    {initial}
                  </div>
                </div>

                {/* Daten Felder */}
                <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <InfoField label="Vorname" value={firstName} />
                  <InfoField label="Nachname" value={lastName} />
                  <InfoField label="E-Mail Adresse" value={user.email} fullWidth />
                  <InfoField label="Kundennummer (UID)" value={user.uid} fullWidth copyable />
                </div>
              </div>
            </div>

            {/* Logout Button Zone */}
            <div className="text-right">
              <button 
                onClick={logout}
                className="text-red-600 font-medium text-sm hover:bg-red-50 px-4 py-2 rounded-lg transition-colors border border-transparent hover:border-red-100"
              >
                Vom Konto abmelden
              </button>
            </div>
          </div>


          {/* RECHTER BEREICH: ZAHLUNG & ABO (1/3 Breite) */}
          <div className="md:col-span-1 space-y-6">
            
            {/* Karte: Abo Status */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col h-full relative overflow-hidden">
              {/* Dekorativer Hintergrund */}
              <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20 -mr-10 -mt-10 pointer-events-none ${isPremium ? 'bg-emerald-400' : 'bg-gray-400'}`} />

              <h2 className="font-bold text-gray-900 mb-6 relative z-10">Mitgliedschaft</h2>
              
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${statusColor}`}>
                    {status === 'paid' ? 'PRO PLAN' : status.toUpperCase()}
                  </span>
                </div>
                
                <p className="text-gray-500 text-sm leading-relaxed mb-6">
                  {isPremium 
                    ? "Du hast vollen Zugriff auf alle Premium-Features. Deine nächste Abrechnung erfolgt am Monatsende." 
                    : "Du nutzt aktuell den kostenlosen Basis-Plan. Upgrade für mehr Features."}
                </p>

                {isPremium && (
                  <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-3 mb-2">
                      <CreditCardIcon />
                      <span className="text-sm font-semibold text-gray-700">•••• 4242</span>
                    </div>
                    <p className="text-xs text-gray-400">Nächste Zahlung: 01.01.2024</p>
                  </div>
                )}
              </div>

              <button 
                onClick={handleManageSubscription}
                className="w-full py-2.5 rounded-xl font-semibold text-sm transition-all shadow-sm hover:shadow active:scale-95 bg-gray-900 text-white hover:bg-black"
              >
                {isPremium ? "Abo verwalten" : "Jetzt upgraden"}
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

// --- KLEINE HILFSKOMPONENTEN ---

function InfoField({ label, value, fullWidth, copyable }) {
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    alert("Kopiert!");
  };

  return (
    <div className={`${fullWidth ? "col-span-1 sm:col-span-2" : "col-span-1"}`}>
      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <p className="font-medium text-gray-900 break-all">{value || "—"}</p>
        {copyable && (
          <button onClick={handleCopy} className="text-gray-300 hover:text-indigo-600 transition-colors" title="Kopieren">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
          </button>
        )}
      </div>
    </div>
  );
}

function CreditCardIcon() {
  return (
    <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  );
}