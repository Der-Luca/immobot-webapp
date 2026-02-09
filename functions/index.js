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
        stripeStatus: "checkout_started",
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



// ============================================================================
// CREATE MONTHLY INVOICE
// ============================================================================
exports.createMonthlyInvoice = onCall(
  { region: "europe-west1" },
  async ({ auth }) => {
    if (!auth) throw new Error("Login erforderlich.");

    const uid = auth.uid;
    const stripe = getStripe();
    const userRef = db.collection("users").doc(uid);
    const snap = await userRef.get();
    const userData = snap.data() || {};

    const customerId = userData.stripeCustomerId;
    if (!customerId) throw new Error("Kein Stripe-Kunde gefunden.");

    const subId = userData.stripeSubscriptionId;
    if (!subId) throw new Error("Keine aktive Subscription gefunden.");

    // Get subscription to find the latest paid period
    const subscription = await stripe.subscriptions.retrieve(subId);
    if (!subscription || subscription.status === "canceled") {
      throw new Error("Keine aktive Subscription gefunden.");
    }

    // Update Stripe customer address from billing data
    const billing = userData.billingAddress || {};
    await stripe.customers.update(customerId, {
      name: [billing.firstName, billing.lastName].filter(Boolean).join(" ") || undefined,
      address: {
        line1: billing.street || "",
        postal_code: billing.zip || "",
        city: billing.city || "",
        country: billing.country || "DE",
      },
      metadata: {
        company: billing.company || "",
      },
    });

    // Determine the last paid period
    let periodStart =
      subscription.current_period_start ?? subscription.billing_cycle_anchor;
    let periodEnd = subscription.current_period_end;

    // Fallback: derive month from user data when Stripe doesn't provide a period
    if (!periodStart || !periodEnd) {
      const acceptedTermsAt =
        userData.acceptedTermsAt?.toDate?.() ?? userData.acceptedTermsAt;
      const fallbackDate =
        (userData.stripeLastPayment && new Date(userData.stripeLastPayment)) ||
        (acceptedTermsAt && new Date(acceptedTermsAt)) ||
        null;

      if (fallbackDate && !Number.isNaN(fallbackDate.getTime())) {
        const year = fallbackDate.getUTCFullYear();
        const month = fallbackDate.getUTCMonth();
        periodStart = Math.floor(Date.UTC(year, month, 1) / 1000);
        periodEnd = Math.floor(Date.UTC(year, month + 1, 1) / 1000);
      } else {
        throw new Error(
          "Subscription-Zeitraum fehlt und kein Fallback-Datum gefunden (acceptedTermsAt/stripeLastPayment)."
        );
      }
    }

    const startDate = new Date(periodStart * 1000);
    const monthName = startDate.toLocaleString("de-DE", { month: "long", year: "numeric" });
    const monthKey = `${startDate.getUTCFullYear()}-${String(startDate.getUTCMonth() + 1).padStart(2, "0")}`;
    const invoiceDocId = `${uid}_${monthKey}`;
    const invoiceDocRef = db.collection("monthlyInvoices").doc(invoiceDocId);

    let existingInvoiceData = null;
    await db.runTransaction(async (tx) => {
      const doc = await tx.get(invoiceDocRef);
      if (doc.exists) {
        existingInvoiceData = doc.data() || {};
        return;
      }
      tx.set(invoiceDocRef, {
        uid,
        monthKey,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        status: "creating",
      });
    });

    if (existingInvoiceData) {
      const existingStripeInvoiceId = existingInvoiceData.stripeInvoiceId;
      if (!existingStripeInvoiceId) {
        throw new Error(
          "Rechnung für diesen Monat existiert, aber stripeInvoiceId fehlt."
        );
      }
      const existingInvoice = await stripe.invoices.retrieve(existingStripeInvoiceId);
      return {
        invoiceUrl: existingInvoice.invoice_pdf,
        hostedUrl: existingInvoice.hosted_invoice_url,
      };
    }

    // Get the subscription item price
    const subItem = subscription.items?.data?.[0];
    const unitAmount = subItem?.price?.unit_amount;
    const currency = subItem?.price?.currency;
    if (unitAmount == null || !currency) {
      throw new Error(
        "Preis der Subscription fehlt. Bitte prüfe die Stripe-Subscription-Items."
      );
    }

    let invoice = null;
    let finalized = null;
    try {
      // Create invoice
      invoice = await stripe.invoices.create({
        customer: customerId,
        auto_advance: false,
        collection_method: "send_invoice",
        days_until_due: 0,
        metadata: {
          firebaseUid: uid,
          periodStart: periodStart.toString(),
          periodEnd: periodEnd.toString(),
          monthKey,
        },
      });

      // Add line item
      await stripe.invoiceItems.create({
        customer: customerId,
        invoice: invoice.id,
        amount: unitAmount,
        currency: currency,
        description: `Immobot Pro – ${monthName}`,
      });

      // Finalize
      finalized = await stripe.invoices.finalizeInvoice(invoice.id);

      await invoiceDocRef.set(
        {
          uid,
          monthKey,
          stripeInvoiceId: finalized.id,
          customerId,
          subscriptionId: subId,
          periodStart,
          periodEnd,
          status: "finalized",
          invoiceUrl: finalized.invoice_pdf || null,
          hostedUrl: finalized.hosted_invoice_url || null,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      await invoiceDocRef.set(
        {
          status: "error",
          errorMessage: err?.message || "Unknown error",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      throw err;
    }

    return {
      invoiceUrl: finalized.invoice_pdf,
      hostedUrl: finalized.hosted_invoice_url,
    };
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

      console.log(" Click event stored:", clickEvent);

      // 3. User weiterleiten
      const targetUrl = offerData.redirectUrl;

      if (!targetUrl) {
        console.error(" redirectUrl missing in offerRedirects doc:", redirectId);
        return res.status(500).json({
          error: "redirectUrl missing in offerRedirects doc.",
        });
      }

      console.log("➡️ Redirecting user to:", targetUrl);
      return res.redirect(targetUrl);

    } catch (err) {
      console.error(" Error in trackOfferClick:", err);
      return res.status(500).json({
        error: "Internal server error",
        details: err.message,
      });
    }
  }
);
