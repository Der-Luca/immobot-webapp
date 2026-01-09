// ============================================================================
// IMPORTS (Firebase Functions v2)
// ============================================================================
const { onCall, onRequest } = require("firebase-functions/v2/https");
const { defineString } = require("firebase-functions/params");
const admin = require("firebase-admin");

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();


// ============================================================================
// PARAMS
// ============================================================================
const STRIPE_SECRET = defineString("STRIPE_SECRET");
const STRIPE_WEBHOOK_SECRET = defineString("STRIPE_WEBHOOK_SECRET");
const PRICE_MONTHLY = defineString("PRICE_MONTHLY");
const PRICE_YEARLY = defineString("PRICE_YEARLY");
const FRONTEND_BASE_URL = defineString("FRONTEND_BASE_URL");


// ============================================================================
// STRIPE INITIALIZER
// ============================================================================
const getStripe = () => {
  const key = STRIPE_SECRET.value();
  return require("stripe")(key);
};


// ============================================================================
// CREATE CHECKOUT SESSION (HTTPS Callable)
// ============================================================================
exports.createCheckoutSession = onCall(
  { region: "europe-west1" },
  async (request) => {
    const { data, auth } = request;

    if (!auth) throw new Error("Login erforderlich.");
    const uid = auth.uid;
    const priceId = data.priceId;

    if (!priceId) throw new Error("priceId fehlt");

    const stripe = getStripe();
    const userRef = db.collection("users").doc(uid);
    const snap = await userRef.get();
    const userData = snap.data() || {};

    let customerId = userData.stripeCustomerId;

    if (!customerId) {
      const userRecord = await admin.auth().getUser(uid).catch(() => null);
      const email =
        userRecord?.email ||
        userData.email ||
        `user-${uid}@example.com`;

      const customer = await stripe.customers.create({
        email,
        metadata: { firebaseUid: uid },
      });

      customerId = customer.id;
      await userRef.set(
        { stripeCustomerId: customerId },
        { merge: true }
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      metadata: { firebaseUid: uid },
      subscription_data: { metadata: { firebaseUid: uid } },
      success_url: `${FRONTEND_BASE_URL.value()}/dashboard?checkout=success`,
      cancel_url: `${FRONTEND_BASE_URL.value()}/dashboard?checkout=cancel`,
    });

    await userRef.set(
      {
        stripeStatus: "pending",
        stripeCheckoutSessionId: session.id,
      },
      { merge: true }
    );

    return { url: session.url };
  }
);


// ============================================================================
// STRIPE WEBHOOK (HTTPS onRequest v2)
// ============================================================================
exports.handleStripeWebhook = onRequest(
  { region: "europe-west1" },
  async (req, res) => {
    const stripe = getStripe();
    const webhookSecret = STRIPE_WEBHOOK_SECRET.value();

    if (!webhookSecret) {
      console.error("⚠️ STRIPE_WEBHOOK_SECRET fehlt!");
      return res.status(500).send("Webhook Secret fehlt.");
    }

    const sig = req.headers["stripe-signature"];
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
    } catch (err) {
      console.error("❌ Ungültige Signatur:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    const obj = event.data.object;

    try {
      switch (event.type) {

        // ------------------------------------------------------------
        // CHECKOUT ABGESCHLOSSEN (noch KEIN Geld garantiert!)
        // ------------------------------------------------------------
        case "checkout.session.completed": {
          const uid = obj.metadata?.firebaseUid;

          if (uid) {
            await db.collection("users").doc(uid).set(
              {
                stripeStatus: "pending",
                stripeCustomerId: obj.customer,
                stripeSubscriptionId: obj.subscription,
              },
              { merge: true }
            );
          }
          break;
        }

        // ------------------------------------------------------------
        // ZAHLUNG ERFOLGREICH (DAS ist dein "PAID")
        // ------------------------------------------------------------
        case "invoice.payment_succeeded": {
          const customerId = obj.customer;

          const snap = await db
            .collection("users")
            .where("stripeCustomerId", "==", customerId)
            .limit(1)
            .get();

          if (!snap.empty) {
            await snap.docs[0].ref.set(
              {
                stripeStatus: "paid",
                stripeLastPayment: new Date().toISOString(),
              },
              { merge: true }
            );
          }
          break;
        }

        // ------------------------------------------------------------
        // ZAHLUNG FEHLGESCHLAGEN
        // ------------------------------------------------------------
        case "invoice.payment_failed": {
          const customerId = obj.customer;

          const snap = await db
            .collection("users")
            .where("stripeCustomerId", "==", customerId)
            .limit(1)
            .get();

          if (!snap.empty) {
            await snap.docs[0].ref.set(
              {
                stripeStatus: "payment_failed",
                stripeLastPaymentError:
                  obj.last_payment_error?.message || "Zahlung fehlgeschlagen",
              },
              { merge: true }
            );
          }
          break;
        }

        // ------------------------------------------------------------
        // ABO STATUS ÄNDERT SICH (past_due, unpaid, active)
        // ------------------------------------------------------------
        case "customer.subscription.updated": {
          const customerId = obj.customer;
          const status = obj.status; // active | past_due | unpaid | canceled

          const snap = await db
            .collection("users")
            .where("stripeCustomerId", "==", customerId)
            .limit(1)
            .get();

          if (!snap.empty) {
            await snap.docs[0].ref.set(
              { stripeSubscriptionStatus: status },
              { merge: true }
            );
          }
          break;
        }

        // ------------------------------------------------------------
        // ABO GEKÜNDIGT / BEENDET
        // ------------------------------------------------------------
        case "customer.subscription.deleted": {
          const customerId = obj.customer;

          const snap = await db
            .collection("users")
            .where("stripeCustomerId", "==", customerId)
            .limit(1)
            .get();

          if (!snap.empty) {
            await snap.docs[0].ref.set(
              { stripeStatus: "cancelled" },
              { merge: true }
            );
          }
          break;
        }

        // ------------------------------------------------------------
        // ALLES ANDERE IGNORIEREN
        // ------------------------------------------------------------
        default:
          console.log("ℹ️ Ignored event:", event.type);
      }

      res.json({ received: true });
    } catch (err) {
      console.error("❌ Fehler im Webhook Handler", err);
      res.status(500).send("Fehler im Webhook");
    }
  }
);


// ============================================================================
// TRACK OFFER CLICK (HTTPS onRequest v2)
// ============================================================================
exports.trackOfferClick = onRequest(
  { region: "europe-west1" },
  async (req, res) => {
    try {
      // redirectId kommt als Query-Parameter
      // z.B. ?redirectId=21KuoRPiAW7Jq8hzYh6C&userId=XYZ
      const redirectId = req.query.redirectId;
      const userId = req.query.userId || "unknown";

      if (!redirectId) {
        return res.status(400).json({
          error: "Missing redirectId parameter.",
        });
      }

      console.log("📥 Incoming click event:", { redirectId, userId });

      // 1. Angebot aus offerRedirects laden
      const redirectDocRef = db.collection("offerRedirects").doc(redirectId);
      const redirectDoc = await redirectDocRef.get();

      if (!redirectDoc.exists) {
        console.error("❌ Redirect not found:", redirectId);
        return res.status(404).json({
          error: "Redirect document not found.",
        });
      }

      const offerData = redirectDoc.data();

      // Geomap-Offer-ID aus Feld "id" im Angebot
      const geomapOfferId = offerData.id || null;

      // 2. Klick-Event speichern
      const clickEvent = {
        redirectId,                         // Firestore-Dokument-ID aus offerRedirects
        userId,                             // User, der geklickt hat (aus Query)
        geomapOfferId,                      // Geomap Offer-ID aus dem Angebot
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        source: req.query.source || "redirect",
      };

      await db.collection("clickEvents").add(clickEvent);

      console.log("✅ Click event stored:", clickEvent);

      // 3. User weiterleiten
      const targetUrl = offerData.redirectUrl;

      if (!targetUrl) {
        console.error("❌ redirectUrl missing in offerRedirects doc:", redirectId);
        return res.status(500).json({
          error: "redirectUrl missing in offerRedirects doc.",
        });
      }

      console.log("➡️ Redirecting user to:", targetUrl);
      return res.redirect(targetUrl);

    } catch (err) {
      console.error("❌ Error in trackOfferClick:", err);
      return res.status(500).json({
        error: "Internal server error",
        details: err.message,
      });
    }
  }
);


