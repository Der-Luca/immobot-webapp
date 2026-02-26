// src/contexts/AuthContext.jsx
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

const POLL_INTERVAL = 4000; // ms

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [emailVerified, setEmailVerified] = useState(null);
  const [ready, setReady] = useState(false);
  const pollRef = useRef(null);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      stopPolling();
      setUser(u || null);

      if (u) {
        const snap = await getDoc(doc(db, "users", u.uid));
        const data = snap.exists() ? snap.data() : {};
        setRole(data?.role || null);
        const verified = data?.emailVerified ?? null;
        setEmailVerified(verified);

        // Solange nicht verifiziert → alle 4s erneut prüfen
        if (verified === false) {
          pollRef.current = setInterval(async () => {
            const s = await getDoc(doc(db, "users", u.uid));
            const v = s.data()?.emailVerified ?? null;
            setEmailVerified(v);
            if (v !== false) stopPolling();
          }, POLL_INTERVAL);
        }
      } else {
        setRole(null);
        setEmailVerified(null);
      }

      setReady(true);
    });

    return () => {
      unsub();
      stopPolling();
    };
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
