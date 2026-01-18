import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";

export default function usePaymentStatus() {
  const { user } = useAuth();

  const [userDoc, setUserDoc] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  if (!user) return;

  let interval;

  const load = async () => {
    const snap = await getDoc(doc(db, "users", user.uid));
    setUserDoc(snap.data() || null);
    setLoading(false);
  };

  load();

  // 🔁 solange pending → alle 3 Sekunden neu prüfen
  if (userDoc?.stripeStatus === "pending") {
    interval = setInterval(load, 3000);
  }

  return () => {
    if (interval) clearInterval(interval);
  };
}, [user, userDoc?.stripeStatus]);

  // ------------------------------------------------------------
  // Stripe States
  // ------------------------------------------------------------

  const stripeStatus = userDoc?.stripeStatus;
  const subscriptionStatus = userDoc?.stripeSubscriptionStatus;
  const stripeCustomerId = userDoc?.stripeCustomerId;

  // 🆓 NIE Kunde gewesen
  const isFree = !stripeCustomerId;

  const isPaid =
    stripeStatus === "paid" &&
    subscriptionStatus !== "past_due" &&
    subscriptionStatus !== "unpaid";

  const isPending = stripeStatus === "pending";
  const isPaymentFailed = stripeStatus === "payment_failed";
  const isCancelled = stripeStatus === "cancelled";

  const needsAction =
    isPaymentFailed ||
    subscriptionStatus === "past_due" ||
    subscriptionStatus === "unpaid";

  return {
    userDoc,
    loading,

    // semantic flags
    isFree,
    isPaid,
    isPending,
    isCancelled,
    needsAction,
  };
}
