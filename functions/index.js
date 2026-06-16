// ============================================================================
// IMPORTS (Firebase Functions v2)
// ============================================================================
const { HttpsError, onCall, onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
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

const OFFER_REDIRECT_RETENTION_DAYS = 31;
const OFFER_REDIRECT_DELETE_BATCH_SIZE = 450;
const OFFER_REDIRECT_MAX_DELETES_PER_RUN = 10000;

// ============================================================================
// STRIPE INITIALIZER
// ============================================================================
const getStripe = () => {
  return require("stripe")(STRIPE_SECRET.value());
};

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function hashValue(value) {
  const crypto = require("crypto");
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || "unknown";
}

function setCorsHeaders(req, res) {
  const origin = req.headers.origin || "*";
  res.set("Access-Control-Allow-Origin", origin);
  res.set("Vary", "Origin");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");
}

function getConfirmSubscriptionCancelBaseUrl(req) {
  const protocol = req.protocol || "https";
  const host = req.get("host");
  if (!host) return "";

  if (host.startsWith("requestsubscriptioncancel-")) {
    return `${protocol}://${host.replace(
      "requestsubscriptioncancel-",
      "confirmsubscriptioncancel-"
    )}`;
  }

  return `${protocol}://${host}/confirmSubscriptionCancel`;
}

function htmlPage(title, body) {
  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    body{margin:0;background:#f5f8fa;color:#172033;font-family:Arial,sans-serif;}
    main{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;}
    section{width:100%;max-width:560px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:28px;box-shadow:0 12px 30px rgba(15,23,42,.08);}
    h1{margin:0 0 14px;font-size:26px;line-height:1.2;color:#0a3d62;}
    p{margin:0 0 16px;font-size:16px;line-height:1.55;color:#4b5563;}
    .actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:22px;}
    button,a.button{border:0;border-radius:6px;background:#0a3d62;color:#fff;font-size:16px;font-weight:700;padding:12px 18px;text-decoration:none;cursor:pointer;}
    a.secondary{color:#0a3d62;text-decoration:underline;}
    .muted{font-size:13px;color:#6b7280;}
  </style>
</head>
<body>
  <main>
    <section>${body}</section>
  </main>
</body>
</html>`;
}

function offerRedirectCleanupCutoff(days = OFFER_REDIRECT_RETENTION_DAYS) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return cutoff;
}

async function requireCallableAdmin(request) {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Login required.");
  }

  const userSnap = await db.collection("users").doc(uid).get();
  if (userSnap.data()?.role !== "admin") {
    throw new HttpsError("permission-denied", "Admin role required.");
  }
}

async function cleanupOldOfferRedirects({
  dryRun = false,
  days = OFFER_REDIRECT_RETENTION_DAYS,
  maxDeletes = OFFER_REDIRECT_MAX_DELETES_PER_RUN,
  source = "unknown",
  requestedBy = null,
} = {}) {
  const runRef = db.collection("offerRedirectCleanupRuns").doc();
  const cutoff = offerRedirectCleanupCutoff(days);
  const cutoffTimestamp = admin.firestore.Timestamp.fromDate(cutoff);
  let scanned = 0;
  let deleted = 0;
  const examples = [];

  await runRef.set({
    source,
    requestedBy,
    dryRun,
    days,
    cutoff: cutoffTimestamp,
    maxDeletes,
    scanned: 0,
    deleted: 0,
    status: "running",
    startedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  try {
    while (scanned < maxDeletes) {
      const remaining = maxDeletes - scanned;
      const limit = Math.min(OFFER_REDIRECT_DELETE_BATCH_SIZE, remaining);
      const snap = await db
        .collection("offerRedirects")
        .where("createdAt", "<", cutoffTimestamp)
        .orderBy("createdAt", "asc")
        .limit(limit)
        .get();

      if (snap.empty) break;

      scanned += snap.size;

      snap.docs.slice(0, Math.max(0, 10 - examples.length)).forEach((docSnap) => {
        const data = docSnap.data() || {};
        examples.push({
          id: docSnap.id,
          uid: data.uid || null,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : null,
          title: data.title || null,
        });
      });

      if (dryRun) break;

      const batch = db.batch();
      snap.docs.forEach((docSnap) => batch.delete(docSnap.ref));
      await batch.commit();
      deleted += snap.size;

      await runRef.set(
        {
          scanned,
          deleted,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    const result = {
      id: runRef.id,
      dryRun,
      days,
      cutoff: cutoff.toISOString(),
      scanned,
      deleted,
      reachedMaxDeletes: scanned >= maxDeletes,
      examples,
    };

    await runRef.set(
      {
        ...result,
        cutoff: cutoffTimestamp,
        status: "completed",
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return result;
  } catch (err) {
    await runRef.set(
      {
        scanned,
        deleted,
        status: "error",
        errorMessage: err?.message || "Unknown error",
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    throw err;
  }
}

async function checkCancelRequestRateLimit(email, ip) {
  const now = Date.now();
  const windowMs = 1000 * 60 * 60;
  const emailKey = hashValue(email);
  const ipKey = hashValue(ip);
  const emailRef = db.collection("subscriptionCancelRateLimits").doc(`email_${emailKey}`);
  const ipRef = db.collection("subscriptionCancelRateLimits").doc(`ip_${ipKey}`);

  await db.runTransaction(async (tx) => {
    const [emailSnap, ipSnap] = await Promise.all([tx.get(emailRef), tx.get(ipRef)]);
    const emailData = emailSnap.data() || {};
    const ipData = ipSnap.data() || {};
    const emailCount = emailData.windowStart && now - emailData.windowStart < windowMs
      ? Number(emailData.count || 0)
      : 0;
    const ipCount = ipData.windowStart && now - ipData.windowStart < windowMs
      ? Number(ipData.count || 0)
      : 0;

    if (emailCount >= 3 || ipCount >= 20) {
      throw new Error("RATE_LIMITED");
    }

    tx.set(emailRef, {
      windowStart: emailCount ? emailData.windowStart : now,
      count: emailCount + 1,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    tx.set(ipRef, {
      windowStart: ipCount ? ipData.windowStart : now,
      count: ipCount + 1,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  });
}

async function sendSubscriptionCancelConfirmEmail(userRecord, token, confirmBaseUrl) {
  const confirmUrl = `${confirmBaseUrl}?token=${encodeURIComponent(token)}`;
  const transporter = getMailer();

  await transporter.sendMail({
    from: `"Immobot" <${SMTP_USER.value()}>`,
    to: userRecord.email,
    subject: "Immobot-Abo kündigen bestätigen",
    html: `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>Abo-Kündigung bestätigen</title>
</head>
<body style="margin:0;padding:0;background-color:#F5F8FA;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#F5F8FA;">
    <tr>
      <td align="center" style="padding:20px 10px;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
               style="max-width:600px;background-color:#ffffff;border-radius:8px;overflow:hidden;">
          <tr>
            <td align="center" style="background-color:#0A3D62;color:#ffffff;padding:20px;">
              <h1 style="margin:0;font-size:24px;font-weight:bold;">Abo-Kündigung bestätigen</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 20px 0 20px;color:#555555;font-size:16px;">Hallo,</td>
          </tr>
          <tr>
            <td style="padding:18px 20px;color:#555555;font-size:16px;line-height:1.5;">
              wir haben eine Anfrage erhalten, dein Immobot-Abo zu kündigen. Bitte bestätige die Kündigung nur, wenn du sie selbst ausgelöst hast.
            </td>
          </tr>
          <tr>
            <td style="padding:0 20px 24px 20px;">
              <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0;">
                <tr>
                  <td style="border-radius:6px;" bgcolor="#0A3D62">
                    <a href="${confirmUrl}" target="_blank"
                       style="display:inline-block;padding:12px 18px;color:#ffffff;text-decoration:none;font-size:16px;font-weight:bold;border-radius:6px;">
                      Kündigung prüfen
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 20px 24px 20px;color:#6b7280;font-size:13px;line-height:1.5;">
              <hr style="border:0;border-top:1px solid #E5E7EB;margin:10px 0 16px 0;" />
              <div style="margin:0 0 12px 0;">Falls du diese Anfrage nicht gestellt hast, ignoriere diese E-Mail.</div>
              <div>Der Link ist 30 Minuten gültig und kann nur einmal verwendet werden.</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  });
}

function formatUnixDate(seconds) {
  if (!seconds) return "";
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(seconds * 1000));
}

async function sendSubscriptionCancelledEmail(userRecord, details = {}) {
  const transporter = getMailer();
  const periodEnd = formatUnixDate(details.periodEnd);

  await transporter.sendMail({
    from: `"Immobot" <${SMTP_USER.value()}>`,
    to: userRecord.email,
    subject: "Dein Immobot-Abo wurde gekündigt",
    html: `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>Abo gekündigt</title>
</head>
<body style="margin:0;padding:0;background-color:#F5F8FA;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#F5F8FA;">
    <tr>
      <td align="center" style="padding:20px 10px;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
               style="max-width:600px;background-color:#ffffff;border-radius:8px;overflow:hidden;">
          <tr>
            <td align="center" style="background-color:#0A3D62;color:#ffffff;padding:20px;">
              <h1 style="margin:0;font-size:24px;font-weight:bold;">Schade, dass du gehst</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 20px 0 20px;color:#555555;font-size:16px;">Hallo,</td>
          </tr>
	          <tr>
	            <td style="padding:18px 20px;color:#555555;font-size:16px;line-height:1.5;">
	              dein Immobot-Abo wurde erfolgreich gekündigt. Es läuft bis zum Ende des bereits bezahlten Zeitraums${periodEnd ? ` am ${periodEnd}` : ""} weiter und wird danach nicht mehr verlängert.
	            </td>
	          </tr>
	          <tr>
	            <td style="padding:0 20px 18px 20px;color:#555555;font-size:16px;line-height:1.5;">
	              Datum der Kündigungserklärung: ${new Date().toLocaleDateString("de-DE")}
	            </td>
	          </tr>
	          <tr>
	            <td style="padding:0 20px 24px 20px;color:#555555;font-size:16px;line-height:1.5;">
	              Danke, dass du Immobot genutzt hast. Wir würden uns freuen, dich irgendwann wiederzusehen.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  });
}

async function sendExtraordinaryCancellationReceivedEmail(userRecord, details = {}) {
  const transporter = getMailer();
  const receivedDate = new Date().toLocaleString("de-DE");

  await transporter.sendMail({
    from: `"Immobot" <${SMTP_USER.value()}>`,
    to: userRecord.email,
    subject: "Deine außerordentliche Kündigung ist eingegangen",
    html: `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>Außerordentliche Kündigung eingegangen</title>
</head>
<body style="margin:0;padding:0;background-color:#F5F8FA;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#F5F8FA;">
    <tr>
      <td align="center" style="padding:20px 10px;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
               style="max-width:600px;background-color:#ffffff;border-radius:8px;overflow:hidden;">
          <tr>
            <td align="center" style="background-color:#0A3D62;color:#ffffff;padding:20px;">
              <h1 style="margin:0;font-size:24px;font-weight:bold;">Kündigung eingegangen</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 20px 0 20px;color:#555555;font-size:16px;">Hallo,</td>
          </tr>
          <tr>
            <td style="padding:18px 20px;color:#555555;font-size:16px;line-height:1.5;">
              deine außerordentliche Kündigung des Immobot-Abos ist elektronisch bei uns eingegangen.
            </td>
          </tr>
          <tr>
            <td style="padding:0 20px 18px 20px;color:#555555;font-size:16px;line-height:1.5;">
              Eingang der Kündigungserklärung: ${receivedDate}
            </td>
          </tr>
          <tr>
            <td style="padding:0 20px 18px 20px;color:#555555;font-size:16px;line-height:1.5;">
              Kündigungswunsch: außerordentliche Kündigung mit sofortiger Wirkung
            </td>
          </tr>
          ${details.reason ? `<tr>
            <td style="padding:0 20px 18px 20px;color:#555555;font-size:16px;line-height:1.5;">
              Angegebener Grund: ${escapeHtml(details.reason)}
            </td>
          </tr>` : ""}
          <tr>
            <td style="padding:0 20px 24px 20px;color:#555555;font-size:16px;line-height:1.5;">
              Wir prüfen den angegebenen Grund und melden uns elektronisch bei dir.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  });
}

async function sendExtraordinaryCancellationReviewEmail(userRecord, details = {}) {
  const transporter = getMailer();

  await transporter.sendMail({
    from: `"Immobot" <${SMTP_USER.value()}>`,
    to: "cd@immobot.pro",
    subject: "Prüfung erforderlich: außerordentliche Abo-Kündigung",
    html: `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>Außerordentliche Kündigung prüfen</title>
</head>
<body style="font-family:Arial,sans-serif;color:#172033;">
  <h1>Außerordentliche Kündigung prüfen</h1>
  <p><strong>E-Mail:</strong> ${escapeHtml(userRecord.email || "")}</p>
  <p><strong>Firebase UID:</strong> ${escapeHtml(userRecord.uid || "")}</p>
  <p><strong>Stripe Subscription:</strong> ${escapeHtml(details.subscriptionId || "")}</p>
  <p><strong>Grund:</strong></p>
  <p style="white-space:pre-wrap;">${escapeHtml(details.reason || "")}</p>
  <p>Diese Kündigung wurde nicht automatisch in Stripe beendet. Bitte manuell prüfen.</p>
</body>
</html>`,
  });
}

function formatCurrencyFromCents(amount, currency = "eur") {
  const value = Number(amount || 0) / 100;
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: String(currency || "eur").toUpperCase(),
  }).format(value);
}

function formatGermanDateFromSeconds(seconds) {
  if (!seconds) return "nicht verfügbar";
  return new Date(seconds * 1000).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatAddress(address) {
  if (!address) return "nicht angegeben";

  const line1 = [address.line1, address.line2].filter(Boolean).join(" ");
  const line2 = [address.postal_code, address.city].filter(Boolean).join(" ");
  const parts = [line1, line2, address.country].filter(Boolean);

  return parts.length ? parts.join(", ") : "nicht angegeben";
}

function getInvoiceSubscriptionLine(invoice) {
  const lines = invoice?.lines?.data || [];
  return lines.find((line) => line.type === "subscription") || lines[0] || {};
}

async function resolvePaymentMethodLabel(stripe, invoice) {
  try {
    if (invoice.payment_intent) {
      const paymentIntent = await stripe.paymentIntents.retrieve(
        typeof invoice.payment_intent === "string"
          ? invoice.payment_intent
          : invoice.payment_intent.id,
        { expand: ["payment_method"] }
      );

      const paymentMethod = paymentIntent.payment_method;
      if (paymentMethod?.type) {
        if (paymentMethod.type === "card") {
          const brand = paymentMethod.card?.brand
            ? paymentMethod.card.brand.toUpperCase()
            : "Karte";
          const last4 = paymentMethod.card?.last4
            ? ` **** ${paymentMethod.card.last4}`
            : "";
          return `${brand}${last4}`;
        }

        if (paymentMethod.type === "sepa_debit") {
          return "SEPA-Lastschrift";
        }

        return paymentMethod.type
          .replace(/_/g, " ")
          .replace(/\b\w/g, (char) => char.toUpperCase());
      }
    }

    return invoice.collection_method === "charge_automatically"
      ? "automatische Abbuchung"
      : "Rechnung";
  } catch (err) {
    console.error("Payment method label could not be resolved", err);
    return "automatische Abbuchung";
  }
}

async function sendSubscriptionWelcomeEmail({
  stripe,
  uid,
  invoice,
  userSnap,
  toEmailOverride = null,
}) {
  const invoiceId = invoice?.id;
  if (!invoiceId) {
    throw new Error("Invoice ID fehlt.");
  }

  const mailRef = db.collection("subscriptionWelcomeEmails").doc(invoiceId);
  const shouldSend = await db.runTransaction(async (tx) => {
    const existing = await tx.get(mailRef);
    if (existing.exists && ["sending", "sent"].includes(existing.data()?.status)) {
      return false;
    }

    tx.set(mailRef, {
      uid,
      invoiceId,
      status: "sending",
      startedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    return true;
  });

  if (!shouldSend) {
    return { ok: true, skipped: true };
  }

  try {
    const userData = userSnap.data() || {};
    const userRecord = await admin.auth().getUser(uid).catch(() => null);
    const customer = invoice.customer
      ? await stripe.customers.retrieve(
          typeof invoice.customer === "string" ? invoice.customer : invoice.customer.id
        ).catch(() => null)
      : null;

    const firstName = userData.firstName || "";
    const lastName = userData.lastName || "";
    const fullName = [firstName, lastName].filter(Boolean).join(" ")
      || customer?.name
      || userRecord?.displayName
      || "Kunde";
    const email = toEmailOverride || userRecord?.email || userData.email || customer?.email;
    const line = getInvoiceSubscriptionLine(invoice);
    const priceText = formatCurrencyFromCents(
      line.price?.unit_amount || line.amount || invoice.amount_paid || 1499,
      invoice.currency || "eur"
    );
    const orderDate = formatGermanDateFromSeconds(invoice.created);
    const contractStart = formatGermanDateFromSeconds(
      line.period?.start || invoice.period_start || invoice.created
    );
    const paymentMethod = await resolvePaymentMethodLabel(stripe, invoice);
    const customerAddress = formatAddress(customer?.address);
    const orderNumber = invoice.number || invoice.id;
    const invoiceUrl = invoice.hosted_invoice_url || "";
    const legalBaseUrl = "https://immobot.pro";
    const transporter = getMailer();

    if (!email) {
      throw new Error("Empfänger-E-Mail fehlt.");
    }

    await transporter.sendMail({
      from: `"Immobot" <${SMTP_USER.value()}>`,
      to: email,
      subject: "Ihre Bestellung / Ihr Abo bei immobot.pro - Bestätigung & Willkommen",
      html: `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>Bestätigung & Willkommen</title>
</head>
<body style="margin:0;padding:0;background-color:#F5F8FA;font-family:Arial,sans-serif;color:#172033;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#F5F8FA;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:640px;background-color:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #E5E7EB;">
          <tr>
            <td align="center" style="background-color:#0A3D62;color:#ffffff;padding:24px 20px;">
              <h1 style="margin:0;font-size:24px;line-height:1.25;font-weight:bold;">Willkommen bei Immobot</h1>
              <p style="margin:8px 0 0 0;font-size:14px;color:#DBEAFE;">Ihre Bestellung und Ihr Abo wurden bestätigt.</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:0;margin:0;">
              <img src="https://immobot.pro/mail-bilder/hero.png" alt="Immobot" width="640" style="display:block;width:100%;max-width:640px;height:auto;border:0;margin:0;" />
            </td>
          </tr>
          <tr>
            <td style="padding:24px 24px 8px 24px;color:#172033;font-size:16px;line-height:1.6;">
              <p style="margin:0 0 14px 0;">Sehr geehrte Kundin, sehr geehrter Kunde,</p>
              <p style="margin:0 0 14px 0;">vielen Dank für Ihre Bestellung bei immobot.pro und Ihr Vertrauen. Mit dieser E-Mail bestätigen wir Ihnen den Abschluss Ihres Abonnements.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 24px 0 24px;">
              <h2 style="margin:0 0 12px 0;font-size:18px;color:#0A3D62;">1. Ihre Bestelldaten / Vertragsbestätigung</h2>
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;font-size:14px;color:#374151;">
                <tr><td style="padding:7px 0;font-weight:bold;width:190px;">Name</td><td style="padding:7px 0;">${escapeHtml(fullName)}</td></tr>
                <tr><td style="padding:7px 0;font-weight:bold;">Anschrift</td><td style="padding:7px 0;">${escapeHtml(customerAddress)}</td></tr>
                <tr><td style="padding:7px 0;font-weight:bold;">E-Mail-Adresse</td><td style="padding:7px 0;">${escapeHtml(email)}</td></tr>
                <tr><td style="padding:7px 0;font-weight:bold;">Vertragspartner</td><td style="padding:7px 0;">Christoph Denlöffel, Krankenhausstr. 4a, 87634 Obergünzburg, Telefon: 0156/78315679, E-Mail: cd@immobot.pro, USt-IdNr.: DE402662980</td></tr>
                <tr><td style="padding:7px 0;font-weight:bold;">Bestelldatum</td><td style="padding:7px 0;">${escapeHtml(orderDate)}</td></tr>
                <tr><td style="padding:7px 0;font-weight:bold;">Bestellnummer</td><td style="padding:7px 0;">${escapeHtml(orderNumber)}</td></tr>
                <tr><td style="padding:7px 0;font-weight:bold;">Inhalt des Abos</td><td style="padding:7px 0;">Standard Plan - Tool zur Suche nach Immobilien via digitalem Zugang</td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:22px 24px 0 24px;">
              <h2 style="margin:0 0 12px 0;font-size:18px;color:#0A3D62;">2. Preis, Zahlungsweise und Abrechnungszeitraum</h2>
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;font-size:14px;color:#374151;">
                <tr><td style="padding:7px 0;font-weight:bold;width:190px;">Preis des Abos</td><td style="padding:7px 0;">${escapeHtml(priceText)} / Monat inkl. MwSt.</td></tr>
                <tr><td style="padding:7px 0;font-weight:bold;">Abrechnungszeitraum</td><td style="padding:7px 0;">monatlich</td></tr>
                <tr><td style="padding:7px 0;font-weight:bold;">Zahlungsart</td><td style="padding:7px 0;">${escapeHtml(paymentMethod)}</td></tr>
              </table>
              <p style="margin:10px 0 0 0;font-size:14px;line-height:1.6;color:#4B5563;">Die Zahlungen werden bis zur Kündigung Ihres Abonnements automatisch zum jeweiligen Fälligkeitstermin abgebucht.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:22px 24px 0 24px;">
              <h2 style="margin:0 0 12px 0;font-size:18px;color:#0A3D62;">3. Laufzeit, Verlängerung und Kündigung</h2>
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;font-size:14px;color:#374151;">
                <tr><td style="padding:7px 0;font-weight:bold;width:190px;">Vertragsbeginn</td><td style="padding:7px 0;">${escapeHtml(contractStart)}</td></tr>
                <tr><td style="padding:7px 0;font-weight:bold;">Mindestlaufzeit</td><td style="padding:7px 0;">1 Monat</td></tr>
                <tr><td style="padding:7px 0;font-weight:bold;">Verlängerung</td><td style="padding:7px 0;">Nach Ablauf der Mindestvertragslaufzeit verlängert sich das Abonnement jeweils um einen weiteren Monat.</td></tr>
                <tr><td style="padding:7px 0;font-weight:bold;">Kündigung</td><td style="padding:7px 0;">Sie können Ihr Abo unter Beachtung der vereinbarten Kündigungsfrist über den Online-Kündigungsbutton auf unserer Website oder per E-Mail in Textform kündigen.</td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:22px 24px 0 24px;">
              <h2 style="margin:0 0 12px 0;font-size:18px;color:#0A3D62;">4. Widerrufsverzicht</h2>
              <p style="margin:0;font-size:14px;line-height:1.6;color:#4B5563;">Sie haben uns im Bestellprozess ausdrücklich darum gebeten, mit der Ausführung des Vertrages bereits vor Ablauf der Widerrufsfrist zu beginnen. Wir weisen darauf hin, dass Ihr Widerrufsrecht erlischt, wenn wir den Vertrag vollständig erfüllt haben, bevor Sie Ihr Widerrufsrecht ausüben. Details finden Sie in der Widerrufsbelehrung.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:22px 24px 0 24px;">
              <h2 style="margin:0 0 12px 0;font-size:18px;color:#0A3D62;">5. AGB und Datenschutz</h2>
              <p style="margin:0 0 14px 0;font-size:14px;line-height:1.6;color:#4B5563;">Es gelten unsere Allgemeinen Geschäftsbedingungen. Informationen zur Verarbeitung Ihrer personenbezogenen Daten finden Sie in unserer Datenschutzerklärung.</p>
              <p style="margin:0;font-size:14px;line-height:1.8;color:#4B5563;">
                <a href="${legalBaseUrl}/agb" style="color:#0A3D62;text-decoration:underline;">AGB</a> &nbsp;|&nbsp;
                <a href="${legalBaseUrl}/widerruf" style="color:#0A3D62;text-decoration:underline;">Widerrufsbelehrung</a> &nbsp;|&nbsp;
                <a href="${legalBaseUrl}/datenschutz" style="color:#0A3D62;text-decoration:underline;">Datenschutz</a>
              </p>
            </td>
          </tr>
          ${invoiceUrl ? `
          <tr>
            <td style="padding:22px 24px 0 24px;">
              <table cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td bgcolor="#0A3D62" style="border-radius:6px;">
                    <a href="${invoiceUrl}" target="_blank" style="display:inline-block;padding:12px 18px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:bold;border-radius:6px;">Stripe-Rechnung anzeigen</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>` : ""}
          <tr>
            <td style="padding:24px;color:#4B5563;font-size:14px;line-height:1.6;">
              <p style="margin:0 0 14px 0;">Wir wünschen Ihnen viel Freude und Erfolg bei Ihrer Suche und bedanken uns für Ihr Vertrauen.</p>
              <p style="margin:0;">Mit freundlichen Grüßen<br />Christoph Denlöffel</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    });

    await mailRef.set({
      status: "sent",
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      to: email,
      uid,
      invoiceId,
      orderNumber,
    }, { merge: true });

    return { ok: true };
  } catch (err) {
    await mailRef.set({
      status: "error",
      errorMessage: err?.message || "Unknown error",
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    throw err;
  }
}

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

    // Prüfen ob gespeicherte Customer-ID noch gültig ist (z.B. Test→Live Wechsel)
    if (customerId) {
      try {
        await stripe.customers.retrieve(customerId);
      } catch (err) {
        if (err.code === "resource_missing") {
          customerId = null; // ungültige ID → neu anlegen
        } else {
          throw err;
        }
      }
    }

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
// RESET CHECKOUT STATUS
// ============================================================================
exports.resetCheckoutStatus = onCall(
  { region: "europe-west1" },
  async ({ auth }) => {
    if (!auth) throw new Error("Login erforderlich.");

    const userRef = db.collection("users").doc(auth.uid);
    const snap = await userRef.get();
    const status = snap.data()?.stripeStatus;

    if (status !== "checkout_started" && status !== "pending") {
      return { ok: true, skipped: true };
    }

    await userRef.set(
      {
        stripeStatus: admin.firestore.FieldValue.delete(),
        stripeCheckoutSessionId: admin.firestore.FieldValue.delete(),
      },
      { merge: true }
    );

    return { ok: true };
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
// REQUEST SUBSCRIPTION CANCELLATION FROM PUBLIC WEBSITE
// ============================================================================
exports.requestSubscriptionCancel = onRequest(
  {
    region: "europe-west1",
    secrets: [SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS],
  },
  async (req, res) => {
    setCorsHeaders(req, res);
    if (req.method === "OPTIONS") return res.status(204).send("");
    if (req.method !== "POST") return res.status(405).json({ ok: false });

    const email = normalizeEmail(req.body?.email);
    const terminationType =
      String(req.body?.terminationType || "ordinary") === "extraordinary"
        ? "extraordinary"
        : "ordinary";
    const terminationDate = String(req.body?.terminationDate || "next").trim().slice(0, 40);
    const extraordinaryReason = String(req.body?.extraordinaryReason || "").trim().slice(0, 2000);
    const genericResponse = {
      ok: true,
      message: "Falls ein passendes aktives Abo existiert, wird die Kündigung verarbeitet.",
    };

    if (!email || !email.includes("@")) {
      return res.status(200).json(genericResponse);
    }

    try {
      await checkCancelRequestRateLimit(email, getClientIp(req));
    } catch (err) {
      if (err.message === "RATE_LIMITED") {
        return res.status(429).json({
          ok: false,
          message: "Bitte versuche es später erneut.",
        });
      }
      console.error("Cancel request rate limit error", err);
      return res.status(500).json({ ok: false });
    }

    try {
      const userRecord = await admin.auth().getUserByEmail(email).catch(() => null);
      if (!userRecord) return res.status(200).json(genericResponse);

      const userRef = db.collection("users").doc(userRecord.uid);
      const userSnap = await userRef.get();
      const userData = userSnap.data() || {};

      if (!userData.stripeSubscriptionId || userData.stripeCancelAtPeriodEnd === true) {
        return res.status(200).json(genericResponse);
      }

      const subId = userData.stripeSubscriptionId;

      if (terminationType === "extraordinary") {
        const reviewRef = await db.collection("subscriptionCancellationReviews").add({
          uid: userRecord.uid,
          email,
          stripeSubscriptionId: subId,
          terminationType: "extraordinary",
          terminationWish: terminationDate || "immediate",
          reason: extraordinaryReason || null,
          status: "pending_review",
          source: "public_website",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        await userRef.set(
          {
            cancelSubscriptionRequestedAt: admin.firestore.FieldValue.serverTimestamp(),
            cancelSubscriptionSource: "public_website",
            cancelSubscriptionTerminationType: "extraordinary",
            cancelSubscriptionTerminationWish: terminationDate || "immediate",
            cancelSubscriptionReviewId: reviewRef.id,
            ...(extraordinaryReason ? { cancelSubscriptionExtraordinaryReason: extraordinaryReason } : {}),
          },
          { merge: true }
        );

        try {
          await sendExtraordinaryCancellationReceivedEmail(userRecord, {
            reason: extraordinaryReason,
          });
        } catch (mailErr) {
          console.error("Extraordinary cancellation receipt mail could not be sent", mailErr);
        }

        try {
          await sendExtraordinaryCancellationReviewEmail(userRecord, {
            subscriptionId: subId,
            reason: extraordinaryReason,
          });
        } catch (mailErr) {
          console.error("Extraordinary cancellation review mail could not be sent", mailErr);
        }

        return res.status(200).json(genericResponse);
      }

      const stripe = getStripe();
      const updated = await stripe.subscriptions.update(subId, {
        cancel_at_period_end: true,
      });

      await userRef.set(
        {
          stripeCancelAtPeriodEnd: true,
          stripeSubscriptionStatus: updated.status,
          cancelSubscriptionRequestedAt: admin.firestore.FieldValue.serverTimestamp(),
          cancelSubscriptionConfirmedAt: admin.firestore.FieldValue.serverTimestamp(),
          cancelSubscriptionSource: "public_website",
          cancelSubscriptionTerminationType: "ordinary",
          cancelSubscriptionTerminationWish: terminationDate || "next",
          ...(updated.current_period_end
            ? { cancelSubscriptionEndsAt: admin.firestore.Timestamp.fromMillis(updated.current_period_end * 1000) }
            : {}),
          cancelSubscriptionToken: admin.firestore.FieldValue.delete(),
          cancelSubscriptionTokenExpiresAt: admin.firestore.FieldValue.delete(),
        },
        { merge: true }
      );

      try {
        await sendSubscriptionCancelledEmail(userRecord, {
          periodEnd: updated.current_period_end,
          subscriptionId: subId,
        });
      } catch (mailErr) {
        console.error("Cancelled confirmation mail could not be sent", mailErr);
      }

      return res.status(200).json(genericResponse);
    } catch (err) {
      console.error("Cancel request error", err);
      return res.status(500).json({
        ok: false,
        message: "Die Kündigung konnte gerade nicht verarbeitet werden.",
      });
    }
  }
);

// ============================================================================
// CONFIRM SUBSCRIPTION CANCELLATION VIA ONE-TIME LINK
// ============================================================================
exports.confirmSubscriptionCancel = onRequest(
  {
    region: "europe-west1",
    secrets: [SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS],
  },
  async (req, res) => {
    const token = String(req.query.token || "");
    if (!token) {
      return res.status(400).send(htmlPage(
        "Link ungültig",
        `<h1>Link ungültig</h1><p>Der Kündigungslink fehlt oder ist unvollständig.</p>`
      ));
    }

    const tokenHash = hashValue(token);
    const snap = await db
      .collection("users")
      .where("cancelSubscriptionToken", "==", tokenHash)
      .limit(1)
      .get();

    if (snap.empty) {
      return res.status(400).send(htmlPage(
        "Link ungültig",
        `<h1>Link ungültig</h1><p>Dieser Kündigungslink ist ungültig oder wurde bereits verwendet.</p>`
      ));
    }

    const userRef = snap.docs[0].ref;
    const uid = snap.docs[0].id;
    const userData = snap.docs[0].data() || {};

    if (!userData.cancelSubscriptionTokenExpiresAt || userData.cancelSubscriptionTokenExpiresAt < Date.now()) {
      return res.status(400).send(htmlPage(
        "Link abgelaufen",
        `<h1>Link abgelaufen</h1><p>Dieser Kündigungslink ist abgelaufen. Bitte fordere über die Website einen neuen Link an.</p>`
      ));
    }

    if (userData.cancelSubscriptionTokenUsedAt || userData.stripeCancelAtPeriodEnd === true) {
      return res.status(200).send(htmlPage(
        "Abo bereits gekündigt",
        `<h1>Abo bereits gekündigt</h1><p>Dein Immobot-Abo ist bereits zur Kündigung vorgemerkt.</p><p class="muted">Du erhältst keine weiteren Abbuchungen nach dem aktuellen Abrechnungszeitraum.</p>`
      ));
    }

    if (req.method === "GET") {
      const action = `?token=${encodeURIComponent(token)}`;
      return res.status(200).send(htmlPage(
        "Abo kündigen",
        `<h1>Abo wirklich kündigen?</h1>
        <p>Wenn du bestätigst, wird dein Immobot-Abo zum Ende des bereits bezahlten Zeitraums gekündigt.</p>
        <p>Bis dahin kannst du Immobot weiter nutzen.</p>
        <form method="POST" action="${action}" class="actions">
          <button type="submit">Abo jetzt kündigen</button>
          <a class="secondary" href="${FRONTEND_BASE_URL.value()}/login">Abbrechen</a>
        </form>
        <p class="muted">Dieser Link ist nur einmal verwendbar.</p>`
      ));
    }

    if (req.method !== "POST") {
      return res.status(405).send("Method not allowed");
    }

    try {
      const subId = userData.stripeSubscriptionId;
      if (!subId) {
        return res.status(400).send(htmlPage(
          "Kein Abo gefunden",
          `<h1>Kein aktives Abo gefunden</h1><p>Für dieses Konto wurde keine Stripe-Subscription gefunden.</p>`
        ));
      }

      const stripe = getStripe();
      const updated = await stripe.subscriptions.update(subId, {
        cancel_at_period_end: true,
      });

      await userRef.set(
        {
          stripeCancelAtPeriodEnd: true,
          stripeSubscriptionStatus: updated.status,
          cancelSubscriptionTokenUsedAt: admin.firestore.FieldValue.serverTimestamp(),
          cancelSubscriptionConfirmedAt: admin.firestore.FieldValue.serverTimestamp(),
          cancelSubscriptionToken: admin.firestore.FieldValue.delete(),
          cancelSubscriptionTokenExpiresAt: admin.firestore.FieldValue.delete(),
        },
        { merge: true }
      );

      const userRecord = await admin.auth().getUser(uid).catch(() => null);
      if (userRecord?.email) {
        try {
          await sendSubscriptionCancelledEmail(userRecord);
        } catch (mailErr) {
          console.error("Cancelled confirmation mail could not be sent", mailErr);
        }
      }

      return res.status(200).send(htmlPage(
        "Abo gekündigt",
        `<h1>Abo erfolgreich gekündigt</h1><p>Dein Immobot-Abo wurde zum Ende des aktuellen Abrechnungszeitraums gekündigt.</p><p>Wir haben dir dazu gerade eine Bestätigung per E-Mail gesendet.</p>`
      ));
    } catch (err) {
      console.error("Cancel confirmation error", err);
      return res.status(500).send(htmlPage(
        "Kündigung fehlgeschlagen",
        `<h1>Kündigung fehlgeschlagen</h1><p>Die Kündigung konnte gerade nicht abgeschlossen werden. Bitte versuche es später erneut oder kontaktiere den Support.</p>`
      ));
    }
  }
);

// ============================================================================
// STRIPE WEBHOOK
// ============================================================================
// ============================================================================
// SHARED HELPER: Double Opt-In Mail senden (intern, für Webhook + onCall)
// ============================================================================
async function sendVerifyEmailForUid(uid) {
  const crypto = require("crypto");
  const userRecord = await admin.auth().getUser(uid);

  if (userRecord.emailVerified) {
    return { ok: true, alreadyVerified: true };
  }

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
    html: `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>E-Mail bestätigen</title>
</head>
<body style="margin:0;padding:0;background-color:#F5F8FA;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#F5F8FA;">
    <tr>
      <td align="center" style="padding:20px 10px;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
               style="max-width:600px;background-color:#ffffff;border-radius:8px;overflow:hidden;">

          <!-- HEADER -->
          <tr>
            <td align="center" style="background-color:#0A3D62;color:#ffffff;padding:20px;">
              <h1 style="margin:0;font-size:24px;font-weight:bold;">
                Willkommen bei Immobot
              </h1>
            </td>
          </tr>

          <!-- HERO IMAGE -->
          <tr>
            <td align="center" style="padding:0;margin:0;">
              <img
                src="https://immobot.pro/mail-bilder/hero.png"
                alt="Immobot"
                width="600"
                style="display:block;width:100%;max-width:600px;height:auto;border:0;margin:0;"
              />
            </td>
          </tr>

          <!-- GREETING -->
          <tr>
            <td style="padding:20px 20px 0 20px;color:#555555;font-size:16px;">
              Hallo,
            </td>
          </tr>

          <!-- CONTENT -->
          <tr>
            <td style="padding:20px;color:#555555;font-size:16px;line-height:1.5;">
              bitte bestätige deine E-Mail-Adresse, um dein Immobot-Konto zu aktivieren und mit der Immobiliensuche zu starten.
            </td>
          </tr>

          <!-- BUTTON -->
          <tr>
            <td style="padding:0 20px 24px 20px;">
              <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0;">
                <tr>
                  <td style="border-radius:6px;" bgcolor="#0A3D62">
                    <a href="${verifyUrl}"
                       target="_blank"
                       style="display:inline-block;padding:12px 18px;color:#ffffff;text-decoration:none;font-size:16px;font-weight:bold;border-radius:6px;">
                      E-Mail-Adresse bestätigen
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="padding:10px 20px 24px 20px;color:#6b7280;font-size:13px;line-height:1.5;">
              <hr style="border:0;border-top:1px solid #E5E7EB;margin:10px 0 16px 0;" />
              <div style="margin:0 0 12px 0;">
                Falls du dich nicht registriert hast, ignoriere diese E-Mail.
              </div>
              <div>
                Falls der Button nicht funktioniert:
                <a href="${verifyUrl}" target="_blank" style="color:#0A3D62;text-decoration:underline;">${verifyUrl}</a>
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  });

  return { ok: true };
}

exports.handleStripeWebhook = onRequest(
  { region: "europe-west1", secrets: [SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS] },
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

            // Double Opt-In Mail nur beim ersten Payment senden
            if (obj.billing_reason === "subscription_create") {
              const uid = snap.docs[0].id;
              try {
                await sendVerifyEmailForUid(uid);
              } catch (e) {
                console.error("❌ Verify-Mail konnte nicht gesendet werden", e);
              }

              try {
                await sendSubscriptionWelcomeEmail({
                  stripe,
                  uid,
                  invoice: obj,
                  userSnap: snap.docs[0],
                });
              } catch (e) {
                console.error("❌ Abo-Willkommensmail konnte nicht gesendet werden", e);
              }
            }
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
    return sendVerifyEmailForUid(auth.uid);
  }
);

exports.sendSubscriptionWelcomeEmailTest = onCall(
  {
    region: "europe-west1",
    secrets: [SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS],
  },
  async (request) => {
    await requireCallableAdmin(request);

    const toEmail = normalizeEmail(request.data?.toEmail);
    if (!toEmail || !toEmail.includes("@")) {
      throw new HttpsError("invalid-argument", "Gültige Test-E-Mail fehlt.");
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    const invoiceId = `test_welcome_${Date.now()}`;
    const mockInvoice = {
      id: invoiceId,
      number: `TEST-${new Date().toISOString().slice(0, 10)}`,
      customer: null,
      created: nowSeconds,
      period_start: nowSeconds,
      currency: "eur",
      collection_method: "charge_automatically",
      amount_paid: 1499,
      hosted_invoice_url: FRONTEND_BASE_URL.value(),
      lines: {
        data: [
          {
            type: "subscription",
            amount: 1499,
            price: { unit_amount: 1499 },
            period: { start: nowSeconds },
          },
        ],
      },
    };
    const mockUserSnap = {
      data: () => ({
        firstName: request.data?.firstName || "Max",
        lastName: request.data?.lastName || "Mustermann",
        email: toEmail,
      }),
    };

    const result = await sendSubscriptionWelcomeEmail({
      stripe: getStripe(),
      uid: request.auth.uid,
      invoice: mockInvoice,
      userSnap: mockUserSnap,
      toEmailOverride: toEmail,
    });

    return {
      ...result,
      toEmail,
      invoiceId,
    };
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
      emailVerifiedAt: admin.firestore.FieldValue.serverTimestamp(),
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

    let paidInvoice = null;
    try {
      const invoiceList = await stripe.invoices.list({
        customer: customerId,
        subscription: subId,
        limit: 20,
      });

      paidInvoice = invoiceList.data.find(
        (inv) =>
          inv.status === "paid" &&
          (inv.period_start === periodStart || inv.period_end === periodEnd)
      );

      if (!paidInvoice) {
        throw new Error(
          "Keine bezahlte Rechnung fuer diesen Zeitraum gefunden."
        );
      }

      await invoiceDocRef.set(
        {
          uid,
          monthKey,
          stripeInvoiceId: paidInvoice.id,
          customerId,
          subscriptionId: subId,
          periodStart,
          periodEnd,
          status: "paid",
          invoiceUrl: paidInvoice.invoice_pdf || null,
          hostedUrl: paidInvoice.hosted_invoice_url || null,
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
      invoiceUrl: paidInvoice.invoice_pdf,
      hostedUrl: paidInvoice.hosted_invoice_url,
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

// ============================================================================
// CLEANUP OLD OFFER REDIRECTS
// ============================================================================
exports.cleanupOldOfferRedirectsPreview = onCall(
  { region: "europe-west1" },
  async (request) => {
    await requireCallableAdmin(request);

    const days = Number(request.data?.days || OFFER_REDIRECT_RETENTION_DAYS);
    const result = await cleanupOldOfferRedirects({
      dryRun: true,
      days: Number.isFinite(days) && days >= OFFER_REDIRECT_RETENTION_DAYS
        ? days
        : OFFER_REDIRECT_RETENTION_DAYS,
      maxDeletes: Number(request.data?.maxDeletes || OFFER_REDIRECT_DELETE_BATCH_SIZE),
      source: "admin-preview",
      requestedBy: request.auth.uid,
    });

    console.log("offerRedirects cleanup preview:", result);
    return result;
  }
);

exports.cleanupOldOfferRedirectsRequested = onDocumentCreated(
  {
    region: "europe-west1",
    document: "offerRedirectCleanupRequests/{requestId}",
    memory: "256MiB",
    timeoutSeconds: 540,
  },
  async (event) => {
    const requestRef = event.data?.ref;
    const requestData = event.data?.data() || {};
    const requestedBy = requestData.requestedBy || null;

    try {
      await requestRef.set(
        {
          status: "running",
          startedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      const days = Number(requestData.days || OFFER_REDIRECT_RETENTION_DAYS);
      const maxDeletes = Number(requestData.maxDeletes || OFFER_REDIRECT_MAX_DELETES_PER_RUN);
      const result = await cleanupOldOfferRedirects({
        dryRun: false,
        days: Number.isFinite(days) && days >= OFFER_REDIRECT_RETENTION_DAYS
          ? days
          : OFFER_REDIRECT_RETENTION_DAYS,
        maxDeletes: Number.isFinite(maxDeletes) && maxDeletes > 0
          ? Math.min(maxDeletes, OFFER_REDIRECT_MAX_DELETES_PER_RUN)
          : OFFER_REDIRECT_MAX_DELETES_PER_RUN,
        source: "admin-firestore-request",
        requestedBy,
      });

      await requestRef.set(
        {
          status: "completed",
          cleanupRunId: result.id,
          scanned: result.scanned,
          deleted: result.deleted,
          cutoff: admin.firestore.Timestamp.fromDate(new Date(result.cutoff)),
          completedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      console.log("offerRedirects requested cleanup:", result);
    } catch (err) {
      await requestRef.set(
        {
          status: "error",
          errorMessage: err?.message || "Unknown error",
          completedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      throw err;
    }
  }
);

exports.cleanupOldOfferRedirectsDaily = onSchedule(
  {
    region: "europe-west1",
    schedule: "30 3 * * *",
    timeZone: "Europe/Madrid",
    memory: "256MiB",
    timeoutSeconds: 540,
  },
  async () => {
    const result = await cleanupOldOfferRedirects({
      dryRun: false,
      days: OFFER_REDIRECT_RETENTION_DAYS,
      maxDeletes: OFFER_REDIRECT_MAX_DELETES_PER_RUN,
      source: "scheduled",
    });

    console.log("offerRedirects daily cleanup:", result);
  }
);

// ============================================================================
// VERWAISTE AUTH-USER AUTOMATISCH LÖSCHEN
// ============================================================================
// Löscht Firebase-Auth-Konten, zu denen es KEIN users/{uid}-Dokument in
// Firestore (mehr) gibt. n8n entfernt das Firestore-Dokument, kann aber den
// Auth-Account nicht löschen – das übernimmt dieser nächtliche Lauf.
//
// SICHERHEIT gegen versehentliches Massen-Löschen:
//  - Liefert die users-Sammlung 0 Dokumente (z. B. Lesefehler), wird sofort
//    ABGEBROCHEN und NICHTS gelöscht. Sonst sähen alle Konten verwaist aus.
//  - Pro Lauf werden höchstens MAX_AUTH_DELETES_PER_RUN Konten gelöscht.
//  - Jeder Lauf (inkl. gelöschter UIDs/E-Mails) wird in authUserCleanupRuns
//    protokolliert, damit nachvollziehbar bleibt, was passiert ist.
const MAX_AUTH_DELETES_PER_RUN = 300;

async function deleteOrphanedAuthUsers({ dryRun = false } = {}) {
  const startedAt = new Date();

  // 1) Alle vorhandenen users/{uid}-IDs einsammeln (nur IDs, keine Felder).
  const firestoreUserIds = new Set();
  const usersSnap = await db.collection("users").select().get();
  usersSnap.forEach((docSnap) => firestoreUserIds.add(docSnap.id));

  // SICHERHEITSABBRUCH: leere users-Sammlung => niemals löschen.
  if (firestoreUserIds.size === 0) {
    const reason =
      "Abbruch: users-Sammlung lieferte 0 Dokumente – es wird nichts gelöscht.";
    console.error("deleteOrphanedAuthUsers:", reason);
    await db.collection("authUserCleanupRuns").add({
      startedAt: startedAt.toISOString(),
      dryRun,
      aborted: true,
      reason,
      scannedAuthUsers: 0,
      firestoreUsers: 0,
      orphanCount: 0,
      deleted: 0,
      finishedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { aborted: true, reason, deleted: 0 };
  }

  // 2) Alle Auth-Konten durchblättern, verwaiste sammeln.
  const orphans = [];
  let scannedAuthUsers = 0;
  let nextPageToken;
  do {
    const page = await admin.auth().listUsers(1000, nextPageToken);
    page.users.forEach((userRecord) => {
      scannedAuthUsers += 1;
      if (!firestoreUserIds.has(userRecord.uid)) {
        orphans.push({
          uid: userRecord.uid,
          email: userRecord.email || null,
        });
      }
    });
    nextPageToken = page.pageToken;
  } while (nextPageToken);

  const orphanCount = orphans.length;
  const toDelete = orphans.slice(0, MAX_AUTH_DELETES_PER_RUN);

  // 3) Löschen (außer dryRun). deleteUsers verarbeitet bis zu 1000 UIDs/Batch.
  let deleted = 0;
  const errors = [];
  if (!dryRun) {
    for (let i = 0; i < toDelete.length; i += 1000) {
      const batch = toDelete.slice(i, i + 1000).map((o) => o.uid);
      const result = await admin.auth().deleteUsers(batch);
      deleted += result.successCount;
      (result.errors || []).forEach((e) => {
        errors.push({ index: e.index, message: e.error?.message || "unknown" });
      });
    }
  }

  const summary = {
    startedAt: startedAt.toISOString(),
    dryRun,
    aborted: false,
    scannedAuthUsers,
    firestoreUsers: firestoreUserIds.size,
    orphanCount,
    capped: orphanCount > MAX_AUTH_DELETES_PER_RUN,
    deleted,
    errorCount: errors.length,
  };

  await db.collection("authUserCleanupRuns").add({
    ...summary,
    deletedAccounts: dryRun ? [] : toDelete.slice(0, 500),
    errors: errors.slice(0, 50),
    finishedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log("deleteOrphanedAuthUsers:", summary);
  return summary;
}

exports.deleteOrphanedAuthUsersDaily = onSchedule(
  {
    region: "europe-west1",
    schedule: "0 4 * * *",
    timeZone: "Europe/Madrid",
    memory: "512MiB",
    timeoutSeconds: 540,
  },
  async () => {
    await deleteOrphanedAuthUsers({ dryRun: false });
  }
);

// Manueller Trigger zum Testen: dryRun:true zeigt nur, was gelöscht würde
// (löscht nichts); dryRun:false führt den Cleanup sofort scharf aus.
exports.runOrphanedAuthCleanup = onCall(
  { region: "europe-west1", memory: "512MiB", timeoutSeconds: 540 },
  async (request) => {
    await requireCallableAdmin(request);

    const dryRun = request.data?.dryRun !== false; // Default: sicher (Dry-Run)
    const result = await deleteOrphanedAuthUsers({ dryRun });
    console.log("runOrphanedAuthCleanup:", {
      by: request.auth.uid,
      dryRun,
      ...result,
    });
    return result;
  }
);

// Admin löscht einen User in der User-Verwaltung: entfernt BEIDES –
// das Firestore-Profil UND das Firebase-Auth-Konto. Sonst bliebe ein
// verwaistes Auth-Konto übrig (siehe deleteOrphanedAuthUsersDaily).
exports.adminDeleteUserAccount = onCall(
  { region: "europe-west1" },
  async (request) => {
    await requireCallableAdmin(request);

    const uid = String(request.data?.uid || "").trim();
    if (!uid) {
      throw new HttpsError("invalid-argument", "uid fehlt.");
    }
    if (uid === request.auth.uid) {
      throw new HttpsError(
        "failed-precondition",
        "Du kannst dein eigenes Konto hier nicht löschen."
      );
    }

    // Firestore-Profil löschen.
    await db.collection("users").doc(uid).delete();

    // Auth-Konto löschen (falls noch vorhanden).
    let authDeleted = false;
    try {
      await admin.auth().deleteUser(uid);
      authDeleted = true;
    } catch (err) {
      if (err?.code !== "auth/user-not-found") {
        throw err;
      }
    }

    console.log("adminDeleteUserAccount:", {
      by: request.auth.uid,
      uid,
      authDeleted,
    });
    return { uid, authDeleted };
  }
);
