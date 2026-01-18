// ============================================================================
// IMPORTS (Firebase Functions v2)
// ============================================================================
const { onCall, onRequest } = require("firebase-functions/v2/https");
const { defineString } = require("firebase-functions/params");
const admin = require("firebase-admin");


//mailer
const nodemailer = require("nodemailer");
const { defineSecret } = require("firebase-functions/params");

const SMTP_HOST = defineSecret("SMTP_HOST");
const SMTP_PORT = defineSecret("SMTP_PORT");
const SMTP_USER = defineSecret("SMTP_USER");
const SMTP_PASS = defineSecret("SMTP_PASS");



function getMailer() {
  return nodemailer.createTransport({
    host: SMTP_HOST.value(),
    port: Number(SMTP_PORT.value()),
    secure: true, // Netcup: true bei 465
    auth: {
      user: SMTP_USER.value(),
      pass: SMTP_PASS.value(),
    },
  });
}



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
  return require("stripe")(STRIPE_SECRET.value());
};

// ============================================================================
// CREATE CHECKOUT SESSION
// ============================================================================
exports.createCheckoutSession = onCall(
  { region: "europe-west1" },
  async ({ auth, data }) => {
    if (!auth) throw new Error("Login erforderlich.");
    if (!data?.priceId) throw new Error("priceId fehlt");

    const uid = auth.uid;
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
      await userRef.set({ stripeCustomerId: customerId }, { merge: true });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: data.priceId, quantity: 1 }],
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
// STRIPE CUSTOMER PORTAL
// ============================================================================
exports.createCustomerPortal = onCall(
  { region: "europe-west1" },
  async ({ auth, data }) => {
    if (!auth) throw new Error("Login erforderlich.");

    const uid = auth.uid;
    const stripe = getStripe();
    const snap = await db.collection("users").doc(uid).get();
    const customerId = snap.data()?.stripeCustomerId;

    if (!customerId) throw new Error("Kein Stripe-Kunde gefunden.");

    const returnPath = data?.returnPath || "/profile";
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${FRONTEND_BASE_URL.value()}${returnPath}`,
    });

    return { url: session.url };
  }
);

// ============================================================================
// CANCEL SUBSCRIPTION (period end)
// ============================================================================
exports.cancelSubscriptionAtPeriodEnd = onCall(
  { region: "europe-west1" },
  async ({ auth }) => {
    if (!auth) throw new Error("Login erforderlich.");

    const uid = auth.uid;
    const stripe = getStripe();
    const userRef = db.collection("users").doc(uid);
    const snap = await userRef.get();
    const subId = snap.data()?.stripeSubscriptionId;

    if (!subId) throw new Error("Keine Subscription gefunden.");

    const updated = await stripe.subscriptions.update(subId, {
      cancel_at_period_end: true,
    });

    await userRef.set(
      {
        stripeCancelAtPeriodEnd: true,
        stripeSubscriptionStatus: updated.status,
      },
      { merge: true }
    );

    return { ok: true };
  }
);

// ============================================================================
// REACTIVATE SUBSCRIPTION
// ============================================================================
exports.reactivateSubscription = onCall(
  { region: "europe-west1" },
  async ({ auth }) => {
    if (!auth) throw new Error("Login erforderlich.");

    const uid = auth.uid;
    const stripe = getStripe();
    const userRef = db.collection("users").doc(uid);
    const snap = await userRef.get();
    const subId = snap.data()?.stripeSubscriptionId;

    if (!subId) throw new Error("Keine Subscription gefunden.");

    const updated = await stripe.subscriptions.update(subId, {
      cancel_at_period_end: false,
    });

    await userRef.set(
      {
        stripeCancelAtPeriodEnd: false,
        stripeSubscriptionStatus: updated.status,
      },
      { merge: true }
    );

    return { ok: true };
  }
);

// ============================================================================
// STRIPE WEBHOOK
// ============================================================================
exports.handleStripeWebhook = onRequest(
  { region: "europe-west1" },
  async (req, res) => {
    const stripe = getStripe();
    const sig = req.headers["stripe-signature"];

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.rawBody,
        sig,
        STRIPE_WEBHOOK_SECRET.value()
      );
    } catch (err) {
      console.error("❌ Webhook Signatur ungültig", err.message);
      return res.status(400).send("Invalid signature");
    }

    const obj = event.data.object;

    try {
      switch (event.type) {
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

        case "invoice.payment_succeeded": {
          const snap = await db
            .collection("users")
            .where("stripeCustomerId", "==", obj.customer)
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

        case "invoice.payment_failed": {
          const snap = await db
            .collection("users")
            .where("stripeCustomerId", "==", obj.customer)
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

        case "customer.subscription.updated": {
          const snap = await db
            .collection("users")
            .where("stripeCustomerId", "==", obj.customer)
            .limit(1)
            .get();

          if (!snap.empty) {
            await snap.docs[0].ref.set(
              {
                stripeSubscriptionStatus: obj.status,
                stripeCancelAtPeriodEnd: obj.cancel_at_period_end,
              },
              { merge: true }
            );
          }
          break;
        }

        case "customer.subscription.deleted": {
          const snap = await db
            .collection("users")
            .where("stripeCustomerId", "==", obj.customer)
            .limit(1)
            .get();

          if (!snap.empty) {
            await snap.docs[0].ref.set(
              {
                stripeStatus: "cancelled",
                stripeSubscriptionStatus: "canceled",
              },
              { merge: true }
            );
          }
          break;
        }

        default:
          console.log("ℹ️ Ignored event:", event.type);
      }

      res.json({ received: true });
    } catch (err) {
      console.error("❌ Webhook Fehler", err);
      res.status(500).send("Webhook error");
    }
  }
);


exports.sendVerifyEmail = onCall(
  {
    region: "europe-west1",
    secrets: [SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS],
  },
  async ({ auth }) => {
    if (!auth) throw new Error("Nicht eingeloggt");

    const uid = auth.uid;
    const userRecord = await admin.auth().getUser(uid);

    if (userRecord.emailVerified) {
      return { ok: true, alreadyVerified: true };
    }

    const crypto = require("crypto");
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    await db.collection("users").doc(uid).set(
      {
        emailVerifyToken: tokenHash,
        emailVerifyExpiresAt: Date.now() + 1000 * 60 * 60 * 24, // 24h
        emailVerified: false,
      },
      { merge: true }
    );

    const verifyUrl = `https://verifyemail-zxgbc7q6ka-ew.a.run.app/verify-email?token=${rawToken}`;

    const transporter = getMailer();

    await transporter.sendMail({
      from: `"Immobot" <${SMTP_USER.value()}>`,
      to: userRecord.email,
      subject: "Bitte bestätige deine E-Mail-Adresse",
      html: `
        <p>Willkommen bei <strong>Immobot</strong>,</p>
        <p>bitte bestätige deine E-Mail-Adresse, um dein Konto zu aktivieren:</p>
        <p>
          <a href="${verifyUrl}"
             style="display:inline-block;padding:12px 18px;
             background:#0f172a;color:#fff;border-radius:6px;text-decoration:none;">
            E-Mail-Adresse bestätigen
          </a>
        </p>
        <p>Falls du dich nicht registriert hast, ignoriere diese E-Mail.</p>
        <p>– Dein Immobot-Team</p>
      `,
    });

    return { ok: true };
  }
);






exports.verifyEmail = onRequest(
  { region: "europe-west1" },
  async (req, res) => {
    const token = req.query.token;
    if (!token) {
      return res.status(400).send("Ungültiger Link");
    }

    const crypto = require("crypto");
    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const snap = await db
      .collection("users")
      .where("emailVerifyToken", "==", tokenHash)
      .limit(1)
      .get();

    if (snap.empty) {
      return res.status(400).send("Link ungültig oder abgelaufen");
    }

    const userRef = snap.docs[0].ref;
    const user = snap.docs[0].data();

    if (user.emailVerifyExpiresAt < Date.now()) {
      return res.status(400).send("Link abgelaufen");
    }

    await userRef.update({
      emailVerified: true,
      emailVerifyToken: admin.firestore.FieldValue.delete(),
      emailVerifyExpiresAt: admin.firestore.FieldValue.delete(),
    });

    return res.redirect(
      `${FRONTEND_BASE_URL.value()}/login?verified=1`
    );
  }
);
