import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";

export default function usePaymentStatus() {
  const { user } = useAuth();

  const [status, setStatus] = useState("loading");
  const [userDoc, setUserDoc] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      setLoading(true);

      const snap = await getDoc(doc(db, "users", user.uid));
      const data = snap.data() || null;

      setUserDoc(data);

      // 🔑 KEIN Stripe-Eintrag → Free User
      if (!data?.stripeStatus) {
        setStatus("free");
      } else {
        setStatus(data.stripeStatus);
      }

      setLoading(false);
    };

    load();
  }, [user]);

  // ------------------------------------------------------------
  // UX-Helfer (das ist der eigentliche Mehrwert)
  // ------------------------------------------------------------

  const stripeStatus = userDoc?.stripeStatus;
  const subscriptionStatus = userDoc?.stripeSubscriptionStatus;

  const isPaid =
    stripeStatus === "paid" &&
    subscriptionStatus !== "past_due" &&
    subscriptionStatus !== "unpaid";

  const isPending = stripeStatus === "pending";
  const isPaymentFailed = stripeStatus === "payment_failed";
  const isCancelled = stripeStatus === "cancelled";
  const isFree = status === "free";

  const needsAction =
    isPaymentFailed ||
    subscriptionStatus === "past_due" ||
    subscriptionStatus === "unpaid";

  return {
    // raw
    status,
    userDoc,
    loading,

    // semantic flags (für UI)
    isPaid,
    isPending,
    isPaymentFailed,
    isCancelled,
    isFree,
    needsAction,
  };
}
