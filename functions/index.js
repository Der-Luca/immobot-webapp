const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();

// --- Fake Checkout Session (bis Stripe kommt) ---
exports.createCheckoutSession = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Login required");
  }

  const uid = context.auth.uid;

  // später: Stripe Session erstellen
  // jetzt: Fake-Bezahl-URL zurückgeben
  const fakeUrl = "https://immobot.pro/stripe-test?uid=" + uid;

  return { url: fakeUrl };
});

// --- Fake Webhook (bis Stripe kommt) ---
exports.fakeStripeWebhook = functions.https.onRequest(async (req, res) => {
  const uid = req.query.uid;
  if (!uid) return res.status(400).send("Missing uid");

  await db.collection("users").doc(uid).set({
    stripeStatus: "paid",
    stripeLastPayment: new Date().toISOString()
  }, { merge: true });

  return res.send("OK - User now paid");
});
