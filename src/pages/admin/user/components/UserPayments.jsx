import { useEffect, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { doc, getDoc } from "firebase/firestore";
import { db, functions } from "@/firebase.js";

const APP_STATUS_OPTIONS = [
  { value: "none", label: "none", description: "Kein App-Zugang, Checkout/Payment wird wieder angezeigt." },
  { value: "paid", label: "paid", description: "App-Zugang freischalten, ohne Stripe zu verändern." },
  { value: "cancelled", label: "cancelled", description: "App behandelt das Abo als gekündigt." },
  { value: "payment_failed", label: "payment_failed", description: "Zahlungsproblem erzwingen." },
  { value: "checkout_started", label: "checkout_started", description: "Checkout-Wartezustand setzen." },
  { value: "pending", label: "pending", description: "Zahlungsprüfung simulieren." },
];

const APP_STATUS_VALUES = new Set(APP_STATUS_OPTIONS.map((option) => option.value));

const STRIPE_ACTIONS = [
  {
    action: "sync",
    label: "Stripe synchronisieren",
    tone: "neutral",
    confirm: null,
  },
  {
    action: "cancel_at_period_end",
    label: "Zum Periodenende kündigen",
    tone: "warning",
    confirm: "Soll dieses Abo wirklich bei Stripe zum Periodenende gekündigt werden?",
  },
  {
    action: "reactivate",
    label: "Kündigung zurücknehmen",
    tone: "neutral",
    confirm: "Soll die vorgemerkte Kündigung bei Stripe wirklich zurückgenommen werden?",
  },
  {
    action: "cancel_now",
    label: "Sofort kündigen",
    tone: "danger",
    confirm: "Soll dieses Abo wirklich sofort bei Stripe beendet werden? Diese Aktion kann den Zugang sofort beenden.",
  },
];

function selectableAppStatus(status) {
  const normalizedStatus = status === "canceled" ? "cancelled" : status;
  return APP_STATUS_VALUES.has(normalizedStatus) ? normalizedStatus : "none";
}

export default function UserPayments({ user, onUserUpdated }) {
  const status = user.stripeStatus || "unbekannt";
  const normalizedStatus = status === "canceled" ? "cancelled" : status;
  const [selectedStatus, setSelectedStatus] = useState(selectableAppStatus(normalizedStatus));
  const [busyAction, setBusyAction] = useState(null);
  const [adminMessage, setAdminMessage] = useState(null);
  
  // Status Logik
  const isPaid = status === "paid" || status === "active";
  const isCanceled = normalizedStatus === "cancelled";
  
  const dotColor = isPaid ? "bg-emerald-500" : isCanceled ? "bg-red-500" : "bg-gray-400";

  useEffect(() => {
    setSelectedStatus(selectableAppStatus(normalizedStatus));
  }, [normalizedStatus]);

  // Link zum Stripe Dashboard (Live Mode URL)
  const stripeUrl = user.stripeCustomerId 
    ? `https://dashboard.stripe.com/customers/${user.stripeCustomerId}` 
    : null;

  const refreshUser = async () => {
    if (!user.uid) return;
    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists()) {
      onUserUpdated?.({ uid: user.uid, ...snap.data() });
    }
  };

  const runAdminPaymentAction = async (payload, successMessage) => {
    setBusyAction(payload.action || payload.mode);
    setAdminMessage(null);

    try {
      const fn = httpsCallable(functions, "adminManageUserPaymentState");
      await fn({
        uid: user.uid,
        ...payload,
      });
      await refreshUser();
      setAdminMessage({ type: "success", text: successMessage });
    } catch (err) {
      console.error("Admin payment action failed:", err);
      setAdminMessage({
        type: "error",
        text: err?.message || "Aktion konnte nicht ausgeführt werden.",
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleStripeAction = async ({ action, label, confirm }) => {
    if (confirm && !window.confirm(confirm)) return;

    await runAdminPaymentAction(
      {
        mode: "stripe_action",
        action,
      },
      `${label} wurde ausgeführt.`
    );
  };

  const handleStatusOverride = async () => {
    const current = normalizedStatus || "none";
    if (selectedStatus === current) {
      setAdminMessage({ type: "error", text: "Wähle einen anderen Status." });
      return;
    }

    const confirmed = window.confirm(
      `Immobot-Zugangsstatus wirklich auf "${selectedStatus}" setzen? Stripe selbst wird dadurch nicht verändert.`
    );
    if (!confirmed) return;

    await runAdminPaymentAction(
      {
        mode: "app_status_override",
        stripeStatus: selectedStatus,
      },
      `Immobot-Status wurde auf ${selectedStatus} gesetzt.`
    );
  };

  return (
    <div className="space-y-6">
      
      {/* 1. STATUS HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={`w-3 h-3 rounded-full ${dotColor} relative z-10`}></div>
            {isPaid && <div className="absolute inset-0 w-3 h-3 rounded-full bg-emerald-400 animate-ping opacity-75"></div>}
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Abo-Status</p>
            <p className="text-sm font-bold text-gray-900 capitalize">{status}</p>
          </div>
        </div>

        {/* Letzte Zahlung */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:text-right">
          <StatusMeta label="Stripe-Subscription" value={user.stripeSubscriptionStatus || "—"} />
          <StatusMeta label="Periodenende" value={formatDate(user.stripeCurrentPeriodEnd)} />
          <StatusMeta label="Kündigung vorgemerkt" value={user.stripeCancelAtPeriodEnd ? "Ja" : "Nein"} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-3">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Letzte Zahlung</p>
          <p className="text-sm font-mono text-gray-700">
             {user.stripeLastPayment 
               ? new Date(user.stripeLastPayment).toLocaleDateString("de-DE") 
               : "—"}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-3">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Manueller Override</p>
          <p className="text-sm font-mono text-gray-700">
            {user.stripeStatusManualOverride ? "Aktiv" : "—"}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-3">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Letzte Admin-Aktion</p>
          <p className="text-sm font-mono text-gray-700 truncate" title={user.stripeAdminLastAction || ""}>
            {user.stripeAdminLastAction || "—"}
          </p>
        </div>
      </div>

      {/* 2. STRIPE IDs GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        <CopyField 
          label="Stripe Customer ID" 
          value={user.stripeCustomerId} 
          icon={<UserIcon />}
        />
        
        <CopyField 
          label="Subscription ID" 
          value={user.stripeSubscriptionId} 
          icon={<BadgeIcon />}
        />

        <div className="md:col-span-2">
           <CopyField 
            label="Checkout Session ID" 
            value={user.stripeCheckoutSessionId} 
            icon={<CreditCardIcon />}
            isWide
          />
        </div>
      </div>

      {/* 3. EXTERNAL LINK */}
      {stripeUrl && (
        <div className="pt-2 border-t border-gray-100">
          <a 
            href={stripeUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors group"
          >
            Kunde im Stripe Dashboard öffnen
            <svg className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
          </a>
        </div>
      )}

      {/* 4. ADMIN ACTIONS */}
      <div className="border-t border-gray-100 pt-5">
        <div className="mb-3">
          <h3 className="text-sm font-bold text-gray-900">Admin-Steuerung</h3>
          <p className="mt-1 text-xs text-gray-500">
            Stripe-Aktionen verändern Stripe. Der Immobot-Override verändert nur den App-Zugang.
          </p>
        </div>

        {adminMessage && (
          <div className={`mb-4 rounded-lg border px-3 py-2 text-xs font-medium ${
            adminMessage.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}>
            {adminMessage.text}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">
              Stripe-Aktionen
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {STRIPE_ACTIONS.map((item) => (
                <button
                  key={item.action}
                  type="button"
                  onClick={() => handleStripeAction(item)}
                  disabled={Boolean(busyAction)}
                  className={`rounded-lg border px-3 py-2 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                    item.tone === "danger"
                      ? "border-red-200 bg-white text-red-700 hover:bg-red-50"
                      : item.tone === "warning"
                      ? "border-amber-200 bg-white text-amber-800 hover:bg-amber-50"
                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {busyAction === item.action ? "Wird ausgeführt..." : item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">
              Immobot-Override
            </div>
            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-gray-500">App-Zugangsstatus</span>
                <select
                  value={selectedStatus}
                  onChange={(event) => setSelectedStatus(event.target.value)}
                  disabled={Boolean(busyAction)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                >
                  {APP_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <p className="text-xs text-gray-500">
                {APP_STATUS_OPTIONS.find((option) => option.value === selectedStatus)?.description}
              </p>

              <button
                type="button"
                onClick={handleStatusOverride}
                disabled={Boolean(busyAction)}
                className="w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-bold text-indigo-700 transition-colors hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busyAction === "app_status_override" ? "Speichere..." : "Immobot-Status setzen"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- KLEINE HELFER ---

function formatDate(value) {
  if (!value) return "—";

  const date = value?.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("de-DE");
}

function StatusMeta({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-sm font-mono text-gray-700">{value}</p>
    </div>
  );
}

function CopyField({ label, value, icon, isWide }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group relative bg-white border border-gray-200 rounded-lg p-3 hover:border-indigo-300 transition-all duration-200">
      <div className="flex items-start justify-between mb-1">
        <div className="flex items-center gap-1.5 text-gray-400">
          {icon}
          <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
        </div>
        {value && (
          <button 
            onClick={handleCopy}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-indigo-600"
            title="Kopieren"
          >
            {copied ? (
               <span className="text-[10px] font-bold text-green-600">Kopiert!</span>
            ) : (
               <CopyIcon />
            )}
          </button>
        )}
      </div>
      
      <div className={`text-xs font-mono text-gray-700 truncate ${isWide ? 'w-full' : 'max-w-[200px]'}`} title={value}>
        {value || <span className="text-gray-300 italic">Nicht vorhanden</span>}
      </div>
    </div>
  );
}

// --- ICONS ---

function UserIcon() {
  return <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
}

function BadgeIcon() {
  return <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>;
}

function CreditCardIcon() {
  return <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>;
}

function CopyIcon() {
  return <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>;
}
