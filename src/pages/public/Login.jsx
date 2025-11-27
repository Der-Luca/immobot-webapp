// src/pages/public/Login.jsx
import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../firebase";
import { useNavigate, Link } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 via-white to-sky-100 px-4">
      {/* Farbige Blobs im Hintergrund */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-24 h-80 w-80 rounded-full bg-sky-300/50 blur-3xl" />
        <div className="absolute bottom-[-60px] right-[-40px] h-80 w-80 rounded-full bg-indigo-300/50 blur-3xl" />
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
              <input
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                type="password"
                placeholder="••••••••"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                autoComplete="current-password"
                required
              />
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
    </div>
  );
}
