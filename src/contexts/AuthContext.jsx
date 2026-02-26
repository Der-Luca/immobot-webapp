// src/contexts/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [emailVerified, setEmailVerified] = useState(null);
  const [ready, setReady] = useState(false);
  const [checkoutStarted, setCheckoutStarted] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u || null);

      if (u) {
        // 🔥 Rolle + E-Mail-Verifizierung aus Firestore laden
        const snap = await getDoc(doc(db, "users", u.uid));
        const data = snap.exists() ? snap.data() : {};
        setRole(data?.role || null);
        setEmailVerified(data?.emailVerified ?? null);
      } else {
        setRole(null);
        setEmailVerified(null);
      }

      setReady(true);
    });
    return () => unsub();
  }, []);

  const value = {
    user,
    role,
    emailVerified,
    ready,
    logout: () => signOut(auth),
  };

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
