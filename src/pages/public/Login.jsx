// src/pages/public/Login.jsx
import { useState } from "react";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../firebase";
import { useNavigate, Link } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  // Reset UI
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMsg, setResetMsg] = useState("");

  const navigate = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), pass);
      navigate("/dashboard");
    } catch (err) {
      setError("Login fehlgeschlagen. Bitte E-Mail und Passwort prüfen.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openReset = () => {
    setResetMsg("");
    setResetEmail(email.trim()); // convenience: übernimmt das Feld, wenn vorhanden
    setResetOpen(true);
  };

  const sendReset = async (e) => {
    e.preventDefault();
    setResetMsg("");
    setError("");
    setNotice("");

    const mail = resetEmail.trim().toLowerCase();
    if (!mail || !mail.includes("@")) {
      setResetMsg("Bitte gib eine gültige E-Mail-Adresse ein.");
      return;
    }

    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, mail);
      setResetMsg("Reset-Link wurde versendet. Bitte prüfe dein Postfach.");
      // optional: nach kurzer Zeit schließen
      // setTimeout(() => setResetOpen(false), 1200);
    } catch (err) {
      console.error(err);
      // bewusst generisch, damit keine Account-Enumeration möglich ist
      setResetMsg("Wenn die E-Mail existiert, bekommst du gleich einen Reset-Link.");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-sky-50 via-white to-sky-100 px-4">
      {/* Farbige Blobs im Hintergrund */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-24 h-80 w-80 rounded-full bg-sky-300/50 blur-3xl" />
        <div className="absolute bottom-[-60px] -right-10 h-80 w-80 rounded-full bg-indigo-300/50 blur-3xl" />
        <div className="absolute top-1/2 -right-24 h-64 w-64 -translate-y-1/2 rounded-full bg-emerald-200/60 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Branding / Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs text-slate-600 border border-slate-200 shadow-sm">
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-sky-500 text-[9px] font-bold text-white">
              I
            </span>
            <span>Immobot • Login</span>
          </div>

          <h1 className="mt-4 text-3xl font-semibold text-slate-900">
            Willkommen zurück
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Melde dich an, um deine Immobot-Suche und gespeicherten Filter fortzusetzen.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-white/95 border border-slate-200 shadow-xl backdrop-blur-sm p-6">
          <form onSubmit={onSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}
            {notice && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {notice}
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-800">
                E-Mail
              </label>
              <input
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                type="email"
                placeholder="beispiel@immobot.pro"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-800">
                Passwort
              </label>
              <div className="relative">
                <input
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                  aria-label={showPass ? "Passwort verbergen" : "Passwort anzeigen"}
                >
                  {showPass ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9-4-9-7s4-7 9-7a9.95 9.95 0 016.072 2.028M9.878 9.878A3 3 0 0114.12 14.12M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Passwort vergessen? */}
            <div className="-mt-1 text-right">
              <button
                type="button"
                onClick={openReset}
                className="text-xs font-medium text-sky-600 hover:text-sky-500"
              >
                Passwort vergessen?
              </button>
            </div>

            <button
              className="mt-2 w-full rounded-lg bg-sky-600 py-2.5 text-sm font-medium text-white shadow-md shadow-sky-400/40 hover:bg-sky-500 transition disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? "Einloggen…" : "Einloggen"}
            </button>
          </form>

          <div className="mt-4 text-center text-xs text-slate-500">
            Noch kein Account?{" "}
            <Link
              to="/register"
              className="font-medium text-sky-600 hover:text-sky-500"
            >
              Jetzt registrieren
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-[11px] text-slate-400">
          Mit dem Login akzeptierst du unsere Nutzungsbedingungen & Datenschutzerklärung.
        </p>
      </div>

      {/* Reset Overlay */}
      {resetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-white/80 backdrop-blur-md"
            onClick={() => setResetOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-2xl bg-white/95 border border-slate-200 shadow-xl backdrop-blur-sm p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Passwort zurücksetzen
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Wir schicken dir einen Reset-Link per E-Mail.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setResetOpen(false)}
                className="text-slate-400 hover:text-slate-600"
                aria-label="Schließen"
              >
                ✕
              </button>
            </div>

            <form onSubmit={sendReset} className="mt-5 space-y-4">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-800">
                  E-Mail
                </label>
                <input
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  type="email"
                  placeholder="beispiel@immobot.pro"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>

              {resetMsg && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  {resetMsg}
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setResetOpen(false)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Abbrechen
                </button>
                <button
                  disabled={resetLoading}
                  className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-md shadow-sky-400/40 hover:bg-sky-500 transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {resetLoading ? "Sende…" : "Reset-Link senden"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
