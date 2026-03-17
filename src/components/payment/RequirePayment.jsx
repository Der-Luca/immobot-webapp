import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { httpsCallable } from "firebase/functions";
import { doc, updateDoc, deleteField } from "firebase/firestore";
import { functions, db } from "../../firebase";
import usePaymentStatus from "./usePaymentStatus";
import PaymentOverlay from "./PaymentOverlay";
import ReactivateOverlay from "./ReactivateOverlay";
import { useAuth } from "../../contexts/AuthContext";

//  Stripe Price ID
const PRICE_MONTHLY = import.meta.env.VITE_STRIPE_PRICE_MONTHLY;

export default function RequirePayment({ children }) {
  const { user, logout } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    loading,
    isPaid,
    isPending,
    needsAction,
    isCancelled,
    isFree,
  } = usePaymentStatus();

  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState("");
  const [pendingTired, setPendingTired] = useState(false);

  // Stripe cancel_url → ?checkout=cancel → stripeStatus zurücksetzen
  useEffect(() => {
    if (searchParams.get("checkout") === "cancel" && user) {
      updateDoc(doc(db, "users", user.uid), { stripeStatus: deleteField() });
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, user, setSearchParams]);

  // Timeout: nach 10 Sek. Hinweis, nach 30 Sek. Auto-Reset
  useEffect(() => {
    if (!isPending) {
      setPendingTired(false);
      return;
    }
    const tiredTimer = setTimeout(() => setPendingTired(true), 10 * 1000);
    const resetTimer = setTimeout(() => resetCheckout(), 30 * 1000);
    return () => {
      clearTimeout(tiredTimer);
      clearTimeout(resetTimer);
    };
  }, [isPending]);

  async function resetCheckout() {
    if (!user) return;
    await updateDoc(doc(db, "users", user.uid), { stripeStatus: deleteField() });
  }

  async function startCheckout() {
    setError("");
    setCheckingOut(true);

    try {
      const createCheckoutSession = httpsCallable(
        functions,
        "createCheckoutSession"
      );

      const result = await createCheckoutSession({
        priceId: PRICE_MONTHLY,
      });

      const url = result.data?.url;
      if (!url) throw new Error("Keine Checkout-URL erhalten");

      window.location.href = url;
    } catch (err) {
      console.error(err);
      setError(err.message || "Fehler beim Starten des Checkouts");
      setCheckingOut(false);
    }
  }

  // ------------------------------------------------------------
  // STATES
  // ------------------------------------------------------------

  if (loading) {
    return (
      <div className="p-6 text-center text-sm text-gray-500">
        Prüfe deinen Zugang…
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="fixed inset-0 bg-white/80 backdrop-blur-md flex items-center justify-center z-50 px-4">
        <div className="bg-white rounded-2xl shadow-xl border p-6 max-w-md text-center">
          <div className="flex justify-center mb-4">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>

          <h2 className="text-lg font-semibold text-slate-900 mb-2">
            Zahlung wird bestätigt
          </h2>

          {pendingTired ? (
            <>
              <p className="text-sm text-slate-600">
                Das dauert ungewöhnlich lang. Hast du den Checkout abgebrochen?
              </p>
              <button
                onClick={resetCheckout}
                className="mt-5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-sm font-medium text-slate-700 transition"
              >
                Ja, zurück zur Übersicht
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-600">
                Wir prüfen gerade deine Zahlung.
                Das dauert in der Regel nur ein paar Sekunden.
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Falls du Stripe geschlossen oder abgebrochen hast, kannst du hier direkt zur Übersicht zurück.
              </p>
              <div className="mt-5">
                <button
                  onClick={resetCheckout}
                  className="text-xs text-slate-500 hover:text-slate-700 underline underline-offset-2"
                >
                  Stripe geschlossen oder abgebrochen?
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }


  //  Zahlung fehlgeschlagen
  if (needsAction) {
    return (
      <div className="fixed inset-0 bg-white/80 backdrop-blur-md flex items-center justify-center z-50 px-4">
        <div className="bg-white rounded-2xl shadow-xl border p-6 max-w-md text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            Zahlung fehlgeschlagen
          </h2>

          <p className="text-sm text-slate-600 mb-4">
            Bitte aktualisiere deine Zahlungsmethode, um Immobot&nbsp;Pro weiter
            nutzen zu können.
          </p>

          <button
            onClick={async () => {
              const fn = httpsCallable(functions, "createCustomerPortal");
              const res = await fn();
              window.location.href = res.data.url;
            }}
            className="px-4 py-2 rounded-xl bg-sky-600 text-white text-sm font-medium hover:bg-sky-700"
          >
            Zahlung reparieren
          </button>

          {/* Logout */}
          <div className="mt-4">
            <button
              onClick={logout}
              className="text-xs text-slate-500 hover:text-slate-700 underline"
            >
              Abmelden
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Free User
  if (isFree) {
    return (
      <PaymentOverlay
        loading={checkingOut}
        error={error}
        onSelectMonthly={startCheckout}
        onLogout={logout} // 👈 neu
      />
    );
  }

  //  Gekündigt → Reaktivieren
  if (isCancelled) {
    return (
      <ReactivateOverlay
        loading={checkingOut}
        onReactivate={startCheckout}
        onLogout={logout} // 👈 optional, falls du’s dort auch willst
      />
    );
  }

  //  Kein aktives Abo
  if (!isPaid) {
    return (
      <PaymentOverlay
        loading={checkingOut}
        error={error}
        onSelectMonthly={startCheckout}
        onLogout={logout} // 👈 neu
      />
    );
  }

  // Zugriff erlaubt
  return children;
}
