// src/components/payment/PaymentOverlay.jsx

export default function PaymentOverlay({
  loading,
  error,
  onSelectMonthly,
}) {
  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-md flex justify-center items-center z-50 px-4">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
        <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900 text-center mb-2">
          Fast geschafft!
        </h2>

        <p className="text-slate-600 text-center mb-6">
          Aktiviere Immobot&nbsp;Pro und starte direkt mit deiner automatischen
          Immobiliensuche.
        </p>

        {/* MONATLICH */}
        <button
          type="button"
          onClick={onSelectMonthly}
          disabled={loading}
          className="group w-full border rounded-2xl p-6 text-left hover:border-sky-500 hover:shadow-md transition flex justify-between items-center"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-600 mb-1">
              Monatlich
            </p>
            <p className="text-2xl font-semibold text-slate-900">12,99 €</p>
            <p className="text-sm text-slate-500">
              pro Monat, jederzeit kündbar
            </p>
          </div>

          <span className="text-sm font-medium text-sky-600 group-hover:translate-x-0.5 transition">
            Jetzt starten →
          </span>
        </button>

        {error && (
          <p className="text-sm text-red-600 text-center mt-4">
            {error}
          </p>
        )}

        {loading && (
          <p className="text-xs text-slate-500 text-center mt-3">
            Weiterleitung zu Stripe…
          </p>
        )}
      </div>
    </div>
  );
}
