// src/pages/public/Register.jsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db, functions } from "../../../firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { saveCurrentFiltersForUser } from "./storage/saveFilters";
import { httpsCallable } from "firebase/functions";
const PRICE_MONTHLY = import.meta.env.VITE_STRIPE_PRICE_MONTHLY;

export default function RegisterFinish() {
  const nav = useNavigate();

  const [firstName, setFirst] = useState("");
  const [lastName, setLast] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");

  const [acceptTerms, setAcceptTerms] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const canSubmit =
    !busy &&
    acceptTerms &&
    firstName.trim() &&
    lastName.trim() &&
    email.trim() &&
    pw.trim() &&
    pw2.trim();

  async function onRegister(e) {
    e.preventDefault();
    if (!canSubmit) return;

    if (pw !== pw2) {
      setErr("Die Passwörter stimmen nicht überein.");
      return;
    }

    setBusy(true);
    setErr("");

    try {
      // 1) Auth
      const { user } = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        pw
      );

      // 2) Firestore-Profil
      await setDoc(
        doc(db, "users", user.uid),
        {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim().toLowerCase(),
          role: "user",
          initialSearch: false,

          // Stripe defaults (keine "none"-Falle)
          stripeStatus: "none",
          stripeCustomerId: null,

          // Custom Double Opt-In
          customEmailVerified: false,

          marketingOptIn,
          acceptedTermsAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );

      // 3) Filter sichern
      await saveCurrentFiltersForUser(user.uid);

      // 4) ✅ Custom Double Opt-In Mail senden (nicht blockieren)
const sendVerify = httpsCallable(functions, "sendVerifyEmail");
sendVerify();

// 5)  SOFORT Stripe Checkout (bewusst awaiten, weil redirect)
const createCheckoutSession = httpsCallable(functions, "createCheckoutSession");
const res = await createCheckoutSession({
  priceId: PRICE_MONTHLY,
});

window.location.href = res.data.url;

    } catch (e) {
      console.error(e);
      setErr(e?.message || "Fehler bei der Registrierung");
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-3 py-3 md:py-2 text-base md:text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition";

  return (
    <div
      className="
      w-full mx-auto max-w-lg bg-white
      p-4 mt-2
      md:p-8 md:mt-10 md:border md:rounded-2xl md:shadow-sm
    "
    >
      <h1 className="text-xl md:text-2xl font-semibold text-center leading-tight mb-2">
        Dein Immobot-Konto
      </h1>
      <p className="text-sm text-gray-600 text-center mb-6">
        Lege jetzt dein Konto an. Im nächsten Schritt wählst du dein Abo
        und aktivierst deinen Zugang.
      </p>

      <form onSubmit={onRegister} className="space-y-4">
        {/* Name */}
        <div className="flex gap-3">
          <div className="w-1/2">
            <input
              type="text"
              className={inputClass}
              placeholder="Vorname"
              value={firstName}
              onChange={(e) => setFirst(e.target.value)}
              required
            />
          </div>
          <div className="w-1/2">
            <input
              type="text"
              className={inputClass}
              placeholder="Nachname"
              value={lastName}
              onChange={(e) => setLast(e.target.value)}
              required
            />
          </div>
        </div>

        <input
          type="email"
          className={inputClass}
          placeholder="E-Mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />

        <input
          type="password"
          className={inputClass}
          placeholder="Passwort"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          required
          autoComplete="new-password"
        />

        <input
          type="password"
          className={inputClass}
          placeholder="Passwort wiederholen"
          value={pw2}
          onChange={(e) => setPw2(e.target.value)}
          required
          autoComplete="new-password"
        />

        {/* Checkboxes */}
        <div className="space-y-3 pt-2">
          <label className="flex items-start gap-3 text-sm cursor-pointer">
            <input
              type="checkbox"
              className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              required
            />
            <span className="text-gray-700">
              Ich akzeptiere die{" "}
              <Link
                to="/terms"
                className="underline text-blue-600"
                target="_blank"
              >
                AGB
              </Link>{" "}
              und die{" "}
              <Link
                to="/privacy"
                className="underline text-blue-600"
                target="_blank"
              >
                Datenschutzerklärung
              </Link>
              .
            </span>
          </label>

          <label className="flex items-start gap-3 text-sm cursor-pointer">
            <input
              type="checkbox"
              className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              checked={marketingOptIn}
              onChange={(e) => setMarketingOptIn(e.target.checked)}
            />
            <span className="text-gray-700">
              Ich möchte hilfreiche Updates & Angebote per E-Mail erhalten
              (optional).
            </span>
          </label>
        </div>

        {err && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
            <p className="text-sm text-red-600 text-center">{err}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full px-6 py-3 rounded-xl bg-blue-900 text-white font-medium shadow-sm hover:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed transition active:scale-95"
        >
          {busy ? "Speichere..." : "Kostenpflichtig weiter"}
        </button>

        <p className="text-xs text-gray-500 mt-2 text-center px-2">
          Keine Sorge: Du kannst dein Abo im nächsten Schritt wählen und
          später jederzeit kündigen.
        </p>
      </form>
      {busy && (
  <div className="fixed inset-0 z-50 bg-white/80 backdrop-blur-sm flex items-center justify-center">
    <div className="bg-white rounded-2xl shadow-xl border p-6 text-center">
      <div className="flex justify-center mb-4">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>

      <h2 className="text-lg font-semibold text-slate-900 mb-1">
        Konto wird erstellt
      </h2>

      <p className="text-sm text-slate-600">
        Einen kleinen Moment bitte…
      </p>
    </div>
  </div>
)}

    </div>
  );
}
