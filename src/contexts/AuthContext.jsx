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
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u || null);

      if (u) {
        // 🔥 Rolle aus Firestore laden (optional)
        const snap = await getDoc(doc(db, "users", u.uid));
        setRole(snap.exists() ? snap.data()?.role || null : null);
      } else {
        setRole(null);
      }

      setReady(true);
    });
    return () => unsub();
  }, []);

  const value = {
    user,
    role,
    ready,
    logout: () => signOut(auth),
  };

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
