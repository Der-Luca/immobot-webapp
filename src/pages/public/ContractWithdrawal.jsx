import { useEffect, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { doc, getDoc } from "firebase/firestore";
import { functions, db } from "@/firebase.js";
import { useAuth } from "@/contexts/AuthContext";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DECLARATION =
  "Hiermit widerrufe ich den von mir online abgeschlossenen Vertrag über Immobot Pro.";

function getFunctionMessage(error) {
  if (error?.code === "functions/resource-exhausted") {
    return "Bitte versuche es später erneut.";
  }

  return error?.message || "Der Widerruf konnte gerade nicht übermittelt werden.";
}

export default function ContractWithdrawal() {
  const { user, ready } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [contractReference, setContractReference] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    async function prefill() {
      if (!ready || !user) return;
      setEmail((current) => current || user.email || "");

      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        const data = snap.data() || {};
        const fullName = [data.firstName, data.lastName].filter(Boolean).join(" ").trim();
        if (fullName) setName((current) => current || fullName);
        if (data.stripeSubscriptionId) {
          setContractReference((current) => current || data.stripeSubscriptionId);
        }
      } catch (err) {
        console.error("Withdrawal prefill failed", err);
      }
    }

    prefill();
  }, [ready, user]);

  async function handleSubmit(event) {
    event.preventDefault();
    setFieldError("");
    setNotice("");

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedReference = contractReference.trim();

    if (trimmedName.length < 2) {
      setFieldError("Bitte gib deinen Namen ein.");
      return;
    }

    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setFieldError("Bitte gib eine gültige E-Mail-Adresse ein.");
      return;
    }

    setSubmitting(true);
    try {
      const requestContractWithdrawal = httpsCallable(functions, "requestContractWithdrawal");
      const result = await requestContractWithdrawal({
        name: trimmedName,
        email: trimmedEmail,
        contractReference: trimmedReference || undefined,
      });
      setSubmitted(true);
      setNotice(
        result.data?.message ||
          "Dein Widerruf ist eingegangen. Du erhältst eine Bestätigung per E-Mail."
      );
    } catch (err) {
      console.error("Withdrawal request failed", err);
      setFieldError(getFunctionMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 text-slate-950 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <a
          href="https://immobot.pro"
          className="inline-flex items-center text-sm font-medium text-blue-700 hover:text-blue-900"
        >
          Zurück zu immobot.pro
        </a>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
            Widerrufsfunktion
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            Vertrag widerrufen
          </h1>
          <p className="mt-4 text-sm leading-6 text-slate-600 sm:text-base">
            Hier kannst du den online abgeschlossenen Vertrag über Immobot Pro widerrufen.
            Der Widerruf wird elektronisch übermittelt und per E-Mail bestätigt.
          </p>

          <div className="mt-8 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-950">
            Der Klick auf <strong>Widerruf bestätigen</strong> übermittelt deine
            Widerrufserklärung. Die Wirksamkeit und Reichweite des Widerrufs wird anschließend
            geprüft.
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div>
              <label htmlFor="withdrawal-name" className="text-sm font-medium text-slate-900">
                Name
              </label>
              <input
                id="withdrawal-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                autoComplete="name"
                disabled={submitting || submitted}
                required
              />
            </div>

            <div>
              <label htmlFor="withdrawal-email" className="text-sm font-medium text-slate-900">
                E-Mail-Adresse
              </label>
              <input
                id="withdrawal-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                autoComplete="email"
                disabled={submitting || submitted}
                required
              />
            </div>

            <div>
              <label
                htmlFor="withdrawal-reference"
                className="text-sm font-medium text-slate-900"
              >
                Vertrags- oder Bestellnummer
                <span className="font-normal text-slate-500"> optional</span>
              </label>
              <input
                id="withdrawal-reference"
                value={contractReference}
                onChange={(event) => setContractReference(event.target.value)}
                placeholder="Falls bekannt"
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                disabled={submitting || submitted}
              />
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              <p className="font-semibold text-slate-950">Widerrufserklärung</p>
              <p className="mt-2">{DECLARATION}</p>
              <p className="mt-2">Produkt: Immobot Pro</p>
              <p>E-Mail: {email.trim() || "noch nicht angegeben"}</p>
            </div>

            {fieldError && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {fieldError}
              </div>
            )}

            {notice && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                {notice}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || submitted}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-blue-300 sm:w-auto"
            >
              {submitting ? "Wird übermittelt..." : "Widerruf bestätigen"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
