import { useState } from "react";

export default function UserPayments({ user }) {
  const status = user.stripeStatus || "unbekannt";
  
  // Status Logik
  const isPaid = status === "paid" || status === "active";
  const isCanceled = status === "canceled";
  
  const statusColor = isPaid
    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
    : isCanceled
    ? "bg-red-50 text-red-700 border-red-100"
    : "bg-gray-100 text-gray-600 border-gray-200";

  const dotColor = isPaid ? "bg-emerald-500" : isCanceled ? "bg-red-500" : "bg-gray-400";

  // Link zum Stripe Dashboard (Live Mode URL)
  const stripeUrl = user.stripeCustomerId 
    ? `https://dashboard.stripe.com/customers/${user.stripeCustomerId}` 
    : null;

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
        <div className="sm:text-right">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Letzte Zahlung</p>
          <p className="text-sm font-mono text-gray-700">
             {user.stripeLastPayment 
               ? new Date(user.stripeLastPayment).toLocaleDateString("de-DE") 
               : "—"}
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
    </div>
  );
}

// --- KLEINE HELFER ---

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