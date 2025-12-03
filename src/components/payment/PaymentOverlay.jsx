// src/components/payment/PaymentOverlay.jsx

export default function PaymentOverlay({
  loading,
  error,
  onSelectMonthly,
  onSelectYearly,
}) {
  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-md flex justify-center items-center z-50 px-4">
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
        <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900 text-center mb-2">
          Fast geschafft!
        </h2>
        <p className="text-slate-600 text-center mb-6">
          Wähle dein Immobot&nbsp;Pro-Abo aus und starte direkt mit deiner
          automatischen Immobiliensuche.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          {/* Monatlich */}
          <button
            type="button"
            onClick={onSelectMonthly}
            disabled={loading}
            className="group border rounded-2xl p-5 text-left hover:border-sky-500 hover:shadow-md transition flex flex-col justify-between"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-600 mb-1">
                Monatlich
              </p>
              <p className="text-2xl font-semibold text-slate-900">6,99 €</p>
              <p className="text-sm text-slate-500">
                pro Monat, flexibel kündbar
              </p>
            </div>
            <span className="mt-4 inline-flex items-center text-sm font-medium text-sky-600 group-hover:translate-x-0.5 transition">
              Monatlich starten →
            </span>
          </button>

          {/* Jährlich */}
          <button
            type="button"
            onClick={onSelectYearly}
            disabled={loading}
            className="group border rounded-2xl p-5 text-left hover:border-amber-500 hover:shadow-md transition flex flex-col justify-between bg-slate-50"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 mb-1">
                Jährlich
              </p>
              <p className="text-2xl font-semibold text-slate-900">59,90 €</p>
              <p className="text-sm text-slate-500">
                12 Monate Immobot&nbsp;Pro – günstiger als monatlich
              </p>
            </div>
            <span className="mt-4 inline-flex items-center text-sm font-medium text-amber-600 group-hover:translate-x-0.5 transition">
              Jährlich abschließen →
            </span>
          </button>
        </div>

        {error && (
          <p className="text-sm text-red-600 text-center mb-2">{error}</p>
        )}

        {loading && (
          <p className="text-xs text-slate-500 text-center">
            Weiterleitung zu Stripe…
          </p>
        )}
      </div>
    </div>
  );
}
