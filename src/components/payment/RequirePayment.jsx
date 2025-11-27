import usePaymentStatus from "./usePaymentStatus";
import PaymentOverlay from "./PaymentOverlay";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../firebase";


export default function RequirePayment({ content }) {
  const { status } = usePaymentStatus();

  if (status === "loading") {
    return (
      <div className="p-10 text-center text-slate-500">
        Lade Zugang…
      </div>
    );
  }

  async function startCheckout() {
    const createSession = httpsCallable(functions, "createCheckoutSession");
    const res = await createSession({});
    window.location.href = res.data.url;
  }

  // ❌ nicht bezahlt → gar NICHT Dashboard rendern
  if (status !== "paid") {
    return <PaymentOverlay onCheckout={startCheckout} />;
  }

  // ✔ bezahlt → Dashboard-Inhalt rendern
  return content;
}
