import { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../firebase";
import usePaymentStatus from "./usePaymentStatus";
import PaymentOverlay from "./PaymentOverlay";

// deine Price-IDs
const PRICE_MONTHLY = "price_1SaeE9DhGVwiGXJYxm5oZdI6";
const PRICE_YEARLY  = "price_1SaeGDDhGVwiGXJYn2kbMjuh";

export default function RequirePayment({ children }) {
  const { isPaid, loading } = usePaymentStatus();
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState("");

  async function startCheckout(priceId) {
    setError("");
    setCheckingOut(true);
    try {
      const createCheckoutSession = httpsCallable(
        functions,
        "createCheckoutSession"
      );
      const result = await createCheckoutSession({ priceId });
      const url = result.data?.url;
      if (!url) throw new Error("Keine Checkout-URL erhalten");
      window.location.href = url;
    } catch (err) {
      console.error(err);
      setError(err.message || "Fehler beim Starten des Checkouts");
      setCheckingOut(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 text-center text-sm text-gray-500">
        Prüfe deinen Zugang…
      </div>
    );
  }

  if (!isPaid) {
    return (
      <PaymentOverlay
        loading={checkingOut}
        error={error}
        onSelectMonthly={() => startCheckout(PRICE_MONTHLY)}
        onSelectYearly={() => startCheckout(PRICE_YEARLY)}
      />
    );
  }

  return children;
}
