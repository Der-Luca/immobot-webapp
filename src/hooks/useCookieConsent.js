import { useCallback, useEffect, useState } from "react";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/firebase";
import { useAuth } from "@/contexts/AuthContext";
import {
  acceptLocalCookies,
  buildCookieConsentPayload,
  getLocalCookieConsent,
  hasAcceptedCookies,
  revokeLocalCookies,
} from "@/lib/cookieConsent";

export function useCookieConsent() {
  const { user } = useAuth();
  const [accepted, setAccepted] = useState(hasAcceptedCookies());
  const [loading, setLoading] = useState(Boolean(user?.uid));

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!user?.uid) {
        setAccepted(hasAcceptedCookies());
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);
        const remote = snap.exists() ? snap.data()?.cookieConsent : null;

        if (remote?.accepted === true) {
          const local = acceptLocalCookies();
          if (!cancelled) setAccepted(local.accepted);
          return;
        }

        const local = getLocalCookieConsent();
        if (local?.accepted === true) {
          await setDoc(
            ref,
            {
              cookieConsent: {
                ...buildCookieConsentPayload(local),
                syncedAt: serverTimestamp(),
              },
            },
            { merge: true }
          );
          if (!cancelled) setAccepted(true);
          return;
        }

        if (!cancelled) setAccepted(false);
      } catch (error) {
        console.error("Cookie-Consent konnte nicht geladen werden:", error);
        if (!cancelled) setAccepted(hasAcceptedCookies());
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const acceptCookies = useCallback(async () => {
    const local = acceptLocalCookies();
    setAccepted(true);

    if (user?.uid) {
      await setDoc(
        doc(db, "users", user.uid),
        {
          cookieConsent: {
            ...buildCookieConsentPayload(local),
            syncedAt: serverTimestamp(),
          },
        },
        { merge: true }
      );
    }
  }, [user]);

  const revokeCookies = useCallback(async () => {
    const local = revokeLocalCookies();
    setAccepted(false);

    if (user?.uid) {
      await setDoc(
        doc(db, "users", user.uid),
        {
          cookieConsent: {
            ...buildCookieConsentPayload(local),
            syncedAt: serverTimestamp(),
          },
        },
        { merge: true }
      );
    }
  }, [user]);

  return { accepted, loading, acceptCookies, revokeCookies };
}
