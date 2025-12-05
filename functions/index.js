// functions/index.js
const { onCall, onRequest } = require("firebase-functions/v2/https");
const { defineString } = require("firebase-functions/params");
const admin = require("firebase-admin");

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

// PARAMS (werden aus .env geladen)
const STRIPE_SECRET = defineString("STRIPE_SECRET");
const STRIPE_WEBHOOK_SECRET = defineString("STRIPE_WEBHOOK_SECRET");
const PRICE_MONTHLY = defineString("PRICE_MONTHLY");
const PRICE_YEARLY = defineString("PRICE_YEARLY");
const FRONTEND_BASE_URL = defineString("FRONTEND_BASE_URL");

// Stripe muss LAZY geladen werden (erst zur Runtime, nicht global!)
const getStripe = () => {
  const key = STRIPE_SECRET.value();
  return require("stripe")(key);
};

// ============================================================================
// CREATE CHECKOUT SESSION
// ============================================================================
exports.createCheckoutSession = onCall(
  {
    region: "europe-west1",
  },
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

    // Stripe-Customer erzeugen
    if (!customerId) {
      const userRecord = await admin.auth().getUser(uid).catch(() => null);
      const email = userRecord?.email || userData.email || `user-${uid}@example.com`;

      const customer = await stripe.customers.create({
        email,
        metadata: { firebaseUid: uid },
      });

      customerId = customer.id;
      await userRef.set({ stripeCustomerId: customerId }, { merge: true });
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
      { stripeStatus: "pending", stripeCheckoutSessionId: session.id },
      { merge: true }
    );

    return { url: session.url };
  }
);

// ============================================================================
// STRIPE WEBHOOK
// ============================================================================
exports.handleStripeWebhook = onRequest(
  {
    region: "europe-west1",
  },
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
      console.error("❌ Ungültige Signatur", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    const obj = event.data.object;

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const uid = obj.metadata?.firebaseUid;
          if (uid) {
            await db.collection("users").doc(uid).set(
              {
                stripeStatus: "paid",
                stripeCustomerId: obj.customer,
                stripeSubscriptionId: obj.subscription,
                stripeLastPayment: new Date().toISOString(),
              },
              { merge: true }
            );
          }
          break;
        }

        case "customer.subscription.deleted": {
          const customerId = obj.customer;

          const snap = await db
            .collection("users")
            .where("stripeCustomerId", "==", customerId)
            .limit(1)
            .get();

          if (!snap.empty) {
            await snap.docs[0].ref.set({ stripeStatus: "cancelled" }, { merge: true });
          }
        }

        default:
          console.log("Ignored event:", event.type);
      }

      res.json({ received: true });
    } catch (err) {
      console.error("Webhook handler error", err);
      res.status(500).send("Fehler im Webhook");
    }
  }
);
