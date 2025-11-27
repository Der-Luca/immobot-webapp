import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext"

export default function usePaymentStatus() {
  const { user } = useAuth();
  const [status, setStatus] = useState("loading"); 
  const [userDoc, setUserDoc] = useState(null);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      const snap = await getDoc(doc(db, "users", user.uid));
      const data = snap.data();
      setUserDoc(data);

      if (!data?.stripeStatus) setStatus("free");
      else setStatus(data.stripeStatus);
    };

    load();
  }, [user]);

  return { status, userDoc };
}
