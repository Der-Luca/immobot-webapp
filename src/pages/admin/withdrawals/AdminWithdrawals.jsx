import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/firebase.js";

const statusConfig = {
  pending_review: {
    label: "Prüfung offen",
    className: "border-amber-200 bg-amber-50 text-amber-800",
  },
  in_review: {
    label: "In Bearbeitung",
    className: "border-blue-200 bg-blue-50 text-blue-800",
  },
  completed: {
    label: "Erledigt",
    className: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
};

function formatDate(value) {
  if (!value) return "-";
  const date = value?.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ status }) {
  const config = statusConfig[status] || {
    label: status || "Unbekannt",
    className: "border-gray-200 bg-gray-100 text-gray-700",
  };

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${config.className}`}>
      {config.label}
    </span>
  );
}

export default function AdminWithdrawals() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState("");
  const [error, setError] = useState("");

  async function loadWithdrawals() {
    setLoading(true);
    setError("");

    try {
      const snap = await getDocs(
        query(
          collection(db, "contractWithdrawalRequests"),
          orderBy("createdAt", "desc"),
          limit(100)
        )
      );
      setItems(snap.docs.map((entry) => ({ id: entry.id, ...entry.data() })));
    } catch (err) {
      console.error("Withdrawal requests could not be loaded", err);
      setError("Widerrufe konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWithdrawals();
  }, []);

  const openCount = useMemo(
    () => items.filter((item) => item.status === "pending_review").length,
    [items]
  );

  async function updateStatus(item, status) {
    if (!item?.id || updatingId) return;
    setUpdatingId(item.id);
    setError("");

    try {
      const patch = {
        status,
        updatedAt: serverTimestamp(),
      };

      if (status === "in_review") patch.reviewStartedAt = serverTimestamp();
      if (status === "completed") patch.completedAt = serverTimestamp();

      await updateDoc(doc(db, "contractWithdrawalRequests", item.id), patch);
      setItems((current) =>
        current.map((entry) =>
          entry.id === item.id ? { ...entry, status, updatedAt: new Date() } : entry
        )
      );
    } catch (err) {
      console.error("Withdrawal status could not be updated", err);
      setError("Status konnte nicht gespeichert werden.");
    } finally {
      setUpdatingId("");
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Widerrufe</h1>
          <p className="text-sm text-gray-500">
            Online eingegangene Widerrufserklärungen für Immobot Pro.
          </p>
        </div>
        <button
          type="button"
          onClick={loadWithdrawals}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Aktualisieren
        </button>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <strong>{openCount}</strong> Widerruf{openCount === 1 ? "" : "e"} offen.
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-gray-700">
              <tr>
                <th className="px-5 py-3 font-semibold">Eingang</th>
                <th className="px-5 py-3 font-semibold">Kunde</th>
                <th className="px-5 py-3 font-semibold">Vertrag</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Mails</th>
                <th className="px-5 py-3 font-semibold">Aktion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-5 py-10 text-center text-gray-500">
                    Lade Widerrufe...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-5 py-10 text-center text-gray-500">
                    Noch keine Widerrufe eingegangen.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="align-top hover:bg-gray-50">
                    <td className="px-5 py-4 text-gray-600 whitespace-nowrap">
                      <div>{item.receivedAt || formatDate(item.createdAt)}</div>
                      <div className="mt-1 text-xs text-gray-400">{item.id}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-medium text-gray-900">{item.name || "-"}</div>
                      <div className="mt-1 text-gray-600">{item.normalizedEmail || item.enteredEmail || "-"}</div>
                      {item.uid && (
                        <div className="mt-1 text-xs text-gray-400">UID: {item.uid}</div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-gray-700">
                      <div>Produkt: Immobot Pro</div>
                      <div className="mt-1">
                        Referenz: {item.contractReference || "nicht angegeben"}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        Stripe: {item.stripeSubscriptionId || "nicht gefunden"}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        Status: {item.stripeSubscriptionStatus || item.stripeStatus || "-"}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-600">
                      <div>Kunde: {item.customerReceiptEmailSentAt ? "gesendet" : "offen/Fehler"}</div>
                      <div>Intern: {item.internalReviewEmailSentAt ? "gesendet" : "offen/Fehler"}</div>
                      {(item.customerReceiptEmailError || item.internalReviewEmailError) && (
                        <div className="mt-2 max-w-xs text-red-600">
                          {item.customerReceiptEmailError || item.internalReviewEmailError}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-2">
                        {item.status !== "in_review" && (
                          <button
                            type="button"
                            onClick={() => updateStatus(item, "in_review")}
                            disabled={updatingId === item.id}
                            className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-60"
                          >
                            In Bearbeitung
                          </button>
                        )}
                        {item.status !== "completed" && (
                          <button
                            type="button"
                            onClick={() => updateStatus(item, "completed")}
                            disabled={updatingId === item.id}
                            className="rounded-lg border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                          >
                            Erledigt
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
