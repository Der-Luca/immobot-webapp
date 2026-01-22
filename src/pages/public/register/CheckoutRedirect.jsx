import { useEffect } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../../firebase";
import { useNavigate } from "react-router-dom";

const PRICE_MONTHLY = import.meta.env.VITE_STRIPE_PRICE_MONTHLY;

export default function CheckoutRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    async function startCheckout() {
      try {
        const createCheckoutSession = httpsCallable(
          functions,
          "createCheckoutSession"
        );

        const res = await createCheckoutSession({
          priceId: PRICE_MONTHLY,
        });

        if (cancelled) return;

        // 🔥 HARTER EXIT – KEIN ZURÜCK
           sessionStorage.removeItem("onboarding_in_progress");
        window.location.replace(res.data.url);

      } catch (e) {
        console.error(e);
        navigate("/login", { replace: true });
      }
    }

    startCheckout();
    return () => { cancelled = true };
  }, [navigate]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="w-10 h-10 mb-4 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
        <p className="text-sm text-slate-600">
          Bitte warten wir bereiten deinen Zahlungsprozess vor...
        </p>
      </div>
    </div>
  );
}
