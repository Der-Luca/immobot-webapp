import { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";
import { useAuth } from "../contexts/AuthContext";

export default function EmailVerificationOverlay() {
  const { user, logout } = useAuth();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function resendEmail() {
    setSending(true);
    setError("");
    setSent(false);
    try {
      const fn = httpsCallable(functions, "sendVerifyEmail");
      await fn();
      setSent(true);
    } catch (err) {
      setError(err.message || "Fehler beim Senden der E-Mail");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-white/90 backdrop-blur-md flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-8 max-w-md w-full text-center">

        {/* Icon */}
        <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-6">
          <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          E-Mail-Adresse bestätigen
        </h2>

        <p className="text-gray-500 text-sm mb-2">
          Wir haben eine Bestätigungs-E-Mail an folgende Adresse gesendet:
        </p>

        <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-4 inline-block w-full">
          <span className="font-semibold text-gray-900 break-all text-sm">
            {user?.email}
          </span>
        </div>

        <p className="text-gray-500 text-sm mb-6">
          Klicke auf den Link in der E-Mail, um dein Konto zu aktivieren.
          Überprüfe auch deinen Spam-Ordner.
        </p>

        {sent ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4">
            <p className="text-emerald-700 font-semibold text-sm">
              E-Mail wurde erneut gesendet!
            </p>
            <p className="text-emerald-600 text-xs mt-1">
              Bitte überprüfe dein Postfach.
            </p>
          </div>
        ) : (
          <button
            onClick={resendEmail}
            disabled={sending}
            className="w-full py-3 px-6 bg-[#0A3D62] text-white rounded-xl font-semibold text-sm hover:bg-[#0c4a75] disabled:opacity-50 disabled:cursor-not-allowed transition-colors mb-3"
          >
            {sending ? "Wird gesendet…" : "E-Mail erneut senden"}
          </button>
        )}

        {error && (
          <p className="text-red-500 text-sm mb-3">{error}</p>
        )}

        <button
          onClick={logout}
          className="text-xs text-gray-400 hover:text-gray-600 underline mt-2"
        >
          Vom Konto abmelden
        </button>
      </div>
    </div>
  );
}
