// src/pages/public/Register.jsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../../../firebase"; // Pfad ggf. anpassen
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { saveCurrentFiltersForUser } from "./storage/saveFilters"; // Pfad ggf. anpassen

export default function RegisterFinish() {
  const nav = useNavigate();

  const [firstName, setFirst] = useState("");
  const [lastName,  setLast]  = useState("");
  const [email,     setEmail] = useState("");
  const [pw,        setPw]    = useState("");

  const [acceptTerms, setAcceptTerms]       = useState(false); // Pflicht
  const [marketingOptIn, setMarketingOptIn] = useState(false); // optional

  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState("");

  const canSubmit =
    !busy &&
    acceptTerms &&
    firstName.trim() &&
    lastName.trim() &&
    email.trim() &&
    pw.trim();

  async function onRegister(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true); setErr("");

    try {
      // 1) User in Firebase Auth anlegen
      const { user } = await createUserWithEmailAndPassword(auth, email, pw);

      // 2) User-Profil in Firestore (merge, falls vorhanden)
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, {
        firstName: firstName.trim(),
        lastName:  lastName.trim(),
        email:     email.trim().toLowerCase(),
        marketingOptIn,
        acceptedTermsAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      }, { merge: true });

      // 3) Aktuelle Filter-JSON sichern (aus deinem Storage aggregiert)
      await saveCurrentFiltersForUser(user.uid);

      // 4) Weiterleitung
      nav("/dashboard");
    } catch (e) {
      setErr(e.message || "Fehler bei der Registrierung");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-md mx-auto rounded-2xl border p-6">
      <h1 className="text-xl font-semibold mb-4 text-center">Registrieren</h1>

      <form onSubmit={onRegister} className="space-y-3">
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
        />

        <input
          type="password"
          className="w-full rounded-lg border px-3 py-2"
          placeholder="Passwort"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          required
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
            <Link to="/terms" className="underline" target="_blank" rel="noreferrer">
              AGB
            </Link>{" "}
            und die{" "}
            <Link to="/privacy" className="underline" target="_blank" rel="noreferrer">
              Datenschutzerklärung
            </Link>.
          </span>
        </label>

        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={marketingOptIn}
            onChange={(e) => setMarketingOptIn(e.target.checked)}
          />
          <span>Ich möchte hilfreiche Updates & Angebote per E-Mail erhalten (optional).</span>
        </label>

        {err && <p className="text-sm text-red-600">{err}</p>}

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full px-4 py-3 rounded-xl bg-blue-900 text-white disabled:opacity-60"
        >
          {busy ? "Speichere…" : "Konto erstellen & Filter sichern"}
        </button>
      </form>
    </div>
  );
}
