import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/firebase";

/**
 * Trackt einen Klick in clickEvents und öffnet danach die redirectUrl.
 */
export async function trackAndRedirect({
  redirectId,        // offerRedirects DOC-ID (PFLICHT)
  geomapOfferId,     // optional
  redirectUrl,       // PFLICHT
  userId,            // optional
  source = "web-app" // fix: web-app
}) {
  // Hard guard + hilfreiches Debug
  if (!redirectId || !redirectUrl) {
    console.error("trackAndRedirect: missing data", {
      redirectId,
      redirectUrl,
      geomapOfferId,
      userId,
      source,
    });
    return;
  }

  try {
    const payload = {
      redirectId,
      source,
      timestamp: serverTimestamp(),
    };

    // OPTIONAL NUR setzen wenn vorhanden (nie undefined schreiben!)
    if (geomapOfferId) payload.geomapOfferId = geomapOfferId;
    if (userId) payload.userId = userId;

    await addDoc(collection(db, "clickEvents"), payload);
  } catch (err) {
    console.error("Click tracking failed", err);
  }

  // Danach weiterleiten (immer)
  window.open(redirectUrl, "_blank", "noopener,noreferrer");
}
