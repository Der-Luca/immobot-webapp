export default function PaymentOverlay({ onCheckout }) {
  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-md flex flex-col justify-center items-center text-center p-6 z-50">
      <h2 className="text-3xl font-semibold mb-3 text-slate-800">
        Dein Zugang ist noch nicht aktiviert
      </h2>
      <p className="text-slate-600 mb-6 max-w-sm">
        Um Immobot Pro nutzen zu können, musst du deinen Zugang aktivieren.
      </p>

      <button
        onClick={onCheckout}
        className="bg-sky-600 text-white px-6 py-3 rounded-xl shadow-lg hover:bg-sky-500 transition"
      >
        Immobot Pro jetzt freischalten
      </button>
    </div>
  );
}
