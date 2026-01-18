import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/firebase.js";

import {
  getAuth,
  updateEmail as fbUpdateEmail,
  sendPasswordResetEmail,
} from "firebase/auth";

import { httpsCallable } from "firebase/functions";
import { functions } from "@/firebase.js";

export default function UserProfile() {
  const { user, logout } = useAuth();
  const auth = useMemo(() => getAuth(), []);

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Edit states
  const [editOpen, setEditOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const [firstNameDraft, setFirstNameDraft] = useState("");
  const [lastNameDraft, setLastNameDraft] = useState("");

  const [emailDraft, setEmailDraft] = useState("");
  const [updatingEmail, setUpdatingEmail] = useState(false);

  // Billing
  const [billingLoading, setBillingLoading] = useState(false);

  // UX
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  // ------------------------------------------------------------------
  // Load profile
  // ------------------------------------------------------------------
  useEffect(() => {
    async function loadProfile() {
      if (!user?.uid) return;
      setLoading(true);
      setError("");
      setNotice("");

      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const data = snap.data();
          setProfile(data);
          setFirstNameDraft(data?.firstName || "");
          setLastNameDraft(data?.lastName || "");
          setEmailDraft(user?.email || "");
        }
      } catch (e) {
        console.error(e);
        setError("Profil konnte nicht geladen werden.");
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [user]);

  if (loading) {
    return (
      <div className="p-10 text-center animate-pulse text-gray-400">
        Lade Profil…
      </div>
    );
  }

  // ------------------------------------------------------------------
  // Derived data
  // ------------------------------------------------------------------
  const firstName = profile?.firstName || "User";
  const lastName = profile?.lastName || "";
  const initial = firstName.charAt(0).toUpperCase();

  const stripeStatus = profile?.stripeStatus || "free";
  const subscriptionStatus = profile?.stripeSubscriptionStatus || "";

  const isPremium =
    stripeStatus === "paid" &&
    !["past_due", "unpaid", "canceled"].includes(subscriptionStatus);

  const needsAction =
    stripeStatus === "payment_failed" ||
    ["past_due", "unpaid"].includes(subscriptionStatus);

  const statusLabel = isPremium
    ? "PRO AKTIV"
    : needsAction
    ? "ZAHLUNG PROBLEM"
    : stripeStatus === "pending"
    ? "WIRD GEPRÜFT"
    : stripeStatus === "cancelled"
    ? "GEKÜNDIGT"
    : "FREE";

  const statusColor = isPremium
    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
    : needsAction
    ? "bg-rose-100 text-rose-700 border-rose-200"
    : "bg-gray-100 text-gray-600 border-gray-200";

  async function refreshProfile() {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists()) setProfile(snap.data());
  }

  // ------------------------------------------------------------------
  // Actions
  // ------------------------------------------------------------------
  async function saveProfile() {
    setSavingProfile(true);
    setError("");
    setNotice("");

    try {
      await updateDoc(doc(db, "users", user.uid), {
        firstName: firstNameDraft.trim(),
        lastName: lastNameDraft.trim(),
      });
      setNotice("Profil gespeichert.");
      setEditOpen(false);
      await refreshProfile();
    } catch {
      setError("Profil konnte nicht gespeichert werden.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function updateEmail() {
    setUpdatingEmail(true);
    setError("");
    setNotice("");

    try {
      const newEmail = emailDraft.trim().toLowerCase();
      await fbUpdateEmail(auth.currentUser, newEmail);
      await updateDoc(doc(db, "users", user.uid), { email: newEmail });
      setNotice("E-Mail-Adresse aktualisiert.");
    } catch (e) {
      setError(
        "Aus Sicherheitsgründen ist ein erneutes Einloggen erforderlich, um die E-Mail zu ändern."
      );
    } finally {
      setUpdatingEmail(false);
    }
  }

  async function resetPassword() {
    await sendPasswordResetEmail(auth, user.email);
    setNotice("Passwort-Reset-Link wurde per E-Mail versendet.");
  }

  async function openBillingPortal() {
    setBillingLoading(true);
    setError("");

    try {
      const fn = httpsCallable(functions, "createCustomerPortal");
      const res = await fn({ returnPath: "/profile" });
      window.location.href = res.data.url;
    } catch {
      setError("Stripe-Portal konnte nicht geöffnet werden.");
    } finally {
      setBillingLoading(false);
    }
  }

  // ------------------------------------------------------------------
  // UI
  // ------------------------------------------------------------------
  return (
    <div className="min-h-[80vh] bg-gray-50/50 p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-3xl font-extrabold text-gray-900">Mein Profil</h1>

        {(error || notice) && (
          <div
            className={`rounded-2xl p-4 text-sm border ${
              error
                ? "bg-rose-50 border-rose-200 text-rose-800"
                : "bg-emerald-50 border-emerald-200 text-emerald-800"
            }`}
          >
            {error || notice}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* LEFT */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between mb-6">
                <h2 className="font-bold text-gray-900">
                  Persönliche Daten
                </h2>
                <button
                  onClick={() => setEditOpen(!editOpen)}
                  className="text-indigo-600 text-sm font-medium hover:underline"
                >
                  {editOpen ? "Schließen" : "Bearbeiten"}
                </button>
              </div>

              <div className="flex gap-8">
                <div className="h-24 w-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-3xl font-bold shadow-lg">
                  {initial}
                </div>

                <div className="flex-1 space-y-6">
                  {!editOpen ? (
                    <>
                      <div>
                        <div className="font-medium text-gray-900">
                          {firstName} {lastName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {user.email}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <input
                          value={firstNameDraft}
                          onChange={(e) => setFirstNameDraft(e.target.value)}
                          placeholder="Vorname"
                          className="px-4 py-3 rounded-xl border border-gray-200"
                        />
                        <input
                          value={lastNameDraft}
                          onChange={(e) => setLastNameDraft(e.target.value)}
                          placeholder="Nachname"
                          className="px-4 py-3 rounded-xl border border-gray-200"
                        />
                      </div>

                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                        <input
                          value={emailDraft}
                          onChange={(e) => setEmailDraft(e.target.value)}
                          placeholder="E-Mail-Adresse"
                          className="w-full px-4 py-3 rounded-xl border border-gray-200"
                        />

                        <div className="flex flex-wrap gap-3">
                          <button
                            onClick={updateEmail}
                            disabled={updatingEmail}
                            className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold disabled:opacity-60"
                          >
                            {updatingEmail ? "Speichern…" : "E-Mail speichern"}
                          </button>

                          <button
                            onClick={resetPassword}
                            className="px-4 py-2 rounded-xl border border-gray-200 text-sm"
                          >
                            Passwort zurücksetzen
                          </button>
                        </div>

                        <p className="text-xs text-gray-500">
                          Hinweis: Firebase kann aus Sicherheitsgründen ein erneutes Einloggen verlangen.
                        </p>
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={saveProfile}
                          disabled={savingProfile}
                          className="px-5 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold"
                        >
                          {savingProfile ? "Speichere…" : "Profil speichern"}
                        </button>
                        <button
                          onClick={() => setEditOpen(false)}
                          className="px-5 py-2 rounded-xl border border-gray-200 text-sm"
                        >
                          Abbrechen
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={logout}
              className="text-red-600 text-sm font-medium"
            >
              Vom Konto abmelden
            </button>
          </div>

          {/* RIGHT */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="font-bold text-gray-900 mb-4">Mitgliedschaft</h2>

            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase border ${statusColor}`}
            >
              {statusLabel}
            </span>

            <p className="text-sm text-gray-500 mt-4 mb-6">
              {isPremium
                ? "Du hast vollen Zugriff auf alle Pro-Funktionen."
                : needsAction
                ? "Bitte überprüfe deine Zahlungsmethode."
                : "Du nutzt aktuell den kostenlosen Basis-Plan."}
            </p>

            <button
              onClick={openBillingPortal}
              disabled={billingLoading}
              className="w-full py-2.5 rounded-xl bg-gray-900 text-white font-semibold hover:bg-black disabled:opacity-60"
            >
              {billingLoading ? "Öffne Portal…" : "Abo verwalten"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
