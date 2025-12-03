// src/pages/public/Register.jsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../../../firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { saveCurrentFiltersForUser } from "./storage/saveFilters";

export default function RegisterFinish() {
  const nav = useNavigate();

  const [firstName, setFirst] = useState("");
  const [lastName,  setLast]  = useState("");
  const [email,     setEmail] = useState("");
  const [pw,        setPw]    = useState("");
  const [pw2,       setPw2]   = useState("");

  const [acceptTerms, setAcceptTerms]       = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);

  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState("");

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
          lastName:  lastName.trim(),
          email:     email.trim().toLowerCase(),
          role:           "user",
          stripeStatus:   "none",
          stripeCustomerId: null,
          marketingOptIn,
          acceptedTermsAt: serverTimestamp(),
          createdAt:        serverTimestamp(),
        },
        { merge: true }
      );

      // 3) Filter sichern
      await saveCurrentFiltersForUser(user.uid);

      // 4) Weiter zum Dashboard (Payment-Overlay greift dort)
      nav("/dashboard");
    } catch (e) {
      setErr(e.message || "Fehler bei der Registrierung");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border p-6 w-2/3 mx-auto mt-10 bg-white">
      <h1 className="text-xl font-semibold text-center">
        Dein Immobot-Konto
      </h1>
      <p className="text-sm text-gray-600 text-center">
        Lege jetzt dein Konto an. Im nächsten Schritt wählst du dein Abo
        und aktivierst deinen Zugang.
      </p>

      <form onSubmit={onRegister} className="space-y-3 max-w-md mx-auto">
        <div className="flex gap-2">
          <input
            type="text"
            className="w-1/2 rounded-lg border px-3 py-2"
            placeholder="Vorname"
            value={firstName}
            onChange={(e) => setFirst(e.target.value)}
            required
          />
          <input
            type="text"
            className="w-1/2 rounded-lg border px-3 py-2"
            placeholder="Nachname"
            value={lastName}
            onChange={(e) => setLast(e.target.value)}
            required
          />
        </div>

        <input
          type="email"
          className="w-full rounded-lg border px-3 py-2"
          placeholder="E-Mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />

        <input
          type="password"
          className="w-full rounded-lg border px-3 py-2"
          placeholder="Passwort"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          required
          autoComplete="new-password"
        />

        <input
          type="password"
          className="w-full rounded-lg border px-3 py-2"
          placeholder="Passwort wiederholen"
          value={pw2}
          onChange={(e) => setPw2(e.target.value)}
          required
          autoComplete="new-password"
        />

        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={acceptTerms}
            onChange={(e) => setAcceptTerms(e.target.checked)}
            required
          />
          <span>
            Ich akzeptiere die{" "}
            <Link
              to="/terms"
              className="underline"
              target="_blank"
              rel="noreferrer"
            >
              AGB
            </Link>{" "}
            und die{" "}
            <Link
              to="/privacy"
              className="underline"
              target="_blank"
              rel="noreferrer"
            >
              Datenschutzerklärung
            </Link>
            .
          </span>
        </label>

        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={marketingOptIn}
            onChange={(e) => setMarketingOptIn(e.target.checked)}
          />
          <span>
            Ich möchte hilfreiche Updates & Angebote per E-Mail erhalten
            (optional).
          </span>
        </label>

        {err && (
          <p className="text-sm text-red-600 text-center">{err}</p>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full px-4 py-3 rounded-xl bg-blue-900 text-white disabled:opacity-60"
        >
          {busy ? "Speichere…" : "Weiter"}
        </button>

        <p className="text-xs text-gray-500 mt-2 text-center">
          Keine Sorge: Du kannst dein Abo im nächsten Schritt wählen und
          später jederzeit kündigen.
        </p>
      </form>
    </div>
  );
}
