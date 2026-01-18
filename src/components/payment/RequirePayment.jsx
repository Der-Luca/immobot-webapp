import { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../firebase";
import usePaymentStatus from "./usePaymentStatus";
import PaymentOverlay from "./PaymentOverlay";
import ReactivateOverlay from "./ReactivateOverlay";
import { useAuth } from "../../contexts/AuthContext"; // 👈 neu

//  Stripe Price ID
const PRICE_MONTHLY = import.meta.env.VITE_STRIPE_PRICE_MONTHLY;

export default function RequirePayment({ children }) {
  const { logout } = useAuth(); // 👈 neu

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
      <div className="p-6 text-center text-sm text-gray-600">
        Zahlung wird geprüft…
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
