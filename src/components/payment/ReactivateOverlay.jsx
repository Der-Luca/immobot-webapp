export default function ReactivateOverlay({ onReactivate, loading }) {
  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-md flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-3xl shadow-xl border p-8 max-w-md text-center">
        <h2 className="text-2xl font-semibold text-slate-900 mb-2">
          Dein Abo ist pausiert
        </h2>

        <p className="text-slate-600 mb-6">
          Dein Immobot Pro-Abo wurde beendet.
          Du kannst es jederzeit wieder aktivieren.
        </p>

        <button
          onClick={onReactivate}
          disabled={loading}
          className="w-full px-5 py-3 rounded-xl bg-sky-600 text-white font-medium hover:bg-sky-700 transition"
        >
          Immobot Pro reaktivieren
        </button>
      </div>
    </div>
  );
}
