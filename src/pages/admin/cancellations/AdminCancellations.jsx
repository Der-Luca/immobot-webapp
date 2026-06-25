import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/firebase.js";

function formatDate(value) {
  if (!value) return "—";
  const date = value?.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminCancellations() {
  const [reviews, setReviews] = useState([]);
  const [ordinaryRequests, setOrdinaryRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState("");

  const loadReviews = async () => {
    setLoading(true);
    setError("");

    try {
      const reviewQuery = query(
        collection(db, "subscriptionCancellationReviews"),
        orderBy("createdAt", "desc"),
        limit(100)
      );
      const userQuery = query(
        collection(db, "users"),
        where("cancelSubscriptionTerminationType", "==", "ordinary")
      );
      const [reviewSnap, userSnap] = await Promise.all([
        getDocs(reviewQuery),
        getDocs(userQuery),
      ]);

      setReviews(reviewSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setOrdinaryRequests(
        userSnap.docs
          .map((d) => ({ uid: d.id, ...d.data() }))
          .filter((user) =>
            Boolean(user.cancelSubscriptionRequestedAt) &&
            !user.cancelSubscriptionConfirmedAt &&
            user.stripeCancelAtPeriodEnd !== true
          )
          .sort((a, b) => {
            const aTime = a.cancelSubscriptionRequestedAt?.toDate
              ? a.cancelSubscriptionRequestedAt.toDate().getTime()
              : new Date(a.cancelSubscriptionRequestedAt || 0).getTime();
            const bTime = b.cancelSubscriptionRequestedAt?.toDate
              ? b.cancelSubscriptionRequestedAt.toDate().getTime()
              : new Date(b.cancelSubscriptionRequestedAt || 0).getTime();
            return bTime - aTime;
          })
      );
    } catch (err) {
      console.error("Cancellation reviews could not be loaded", err);
      setError("Kündigungsfälle konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, []);

  const pendingReviews = useMemo(
    () => reviews.filter((review) => review.status === "pending_review"),
    [reviews]
  );

  const markContacted = async (review) => {
    if (!review?.id || updatingId) return;

    setUpdatingId(review.id);
    try {
      await updateDoc(doc(db, "subscriptionCancellationReviews", review.id), {
        status: "contacted",
        contactedAt: serverTimestamp(),
      });
      setReviews((current) =>
        current.map((item) =>
          item.id === review.id ? { ...item, status: "contacted", contactedAt: new Date() } : item
        )
      );
    } catch (err) {
      console.error("Cancellation review could not be marked as contacted", err);
      setError("Status konnte nicht gespeichert werden.");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kündigungen</h1>
          <p className="text-sm text-gray-500">
            Normale Kündigungsanfragen und außerordentliche Fälle im Überblick.
          </p>
        </div>
        <button
          type="button"
          onClick={loadReviews}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Aktualisieren
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
          <strong>{ordinaryRequests.length}</strong> normale Kündigung
          {ordinaryRequests.length === 1 ? "" : "en"} beantragt.
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>{pendingReviews.length}</strong> außerordentliche Kündigung
          {pendingReviews.length === 1 ? "" : "en"} zur Prüfung.
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 bg-gray-50 px-5 py-4">
          <h2 className="font-bold text-gray-900">Normale Kündigungen beantragt</h2>
          <p className="mt-1 text-xs text-gray-500">
            Die Bestätigungs-E-Mail wurde ausgelöst. Nach Bestätigung verschwinden diese Einträge automatisch.
          </p>
        </div>
        <div className="overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-gray-700">
              <tr>
                <th className="px-5 py-3 font-semibold">Beantragt</th>
                <th className="px-5 py-3 font-semibold">Kunde</th>
                <th className="px-5 py-3 font-semibold">Kündigungswunsch</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold text-right">Aktion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-5 py-10 text-center text-gray-500">
                    Lade Kündigungsanfragen...
                  </td>
                </tr>
              ) : ordinaryRequests.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-5 py-10 text-center text-gray-500">
                    Keine offenen normalen Kündigungsanfragen.
                  </td>
                </tr>
              ) : (
                ordinaryRequests.map((user) => (
                  <tr key={user.uid} className="align-top hover:bg-gray-50">
                    <td className="px-5 py-4 text-gray-600 whitespace-nowrap">
                      {formatDate(user.cancelSubscriptionRequestedAt)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-medium text-gray-900">{user.email || user.Email || "—"}</div>
                      <div className="mt-1 font-mono text-xs text-gray-400">{user.uid}</div>
                    </td>
                    <td className="px-5 py-4 text-gray-700">
                      {user.cancelSubscriptionTerminationWish === "next" || !user.cancelSubscriptionTerminationWish
                        ? "Zum Ende des bezahlten Zeitraums"
                        : user.cancelSubscriptionTerminationWish}
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex rounded-full border border-sky-200 bg-sky-100 px-2.5 py-0.5 text-xs font-semibold text-sky-800">
                        Kündigung beantragt
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        to={`/admin/user/${user.uid}`}
                        className="rounded-lg border border-indigo-200 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:border-indigo-400"
                      >
                        User öffnen
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 bg-gray-50 px-5 py-4">
          <h2 className="font-bold text-gray-900">Außerordentliche Kündigungen</h2>
          <p className="mt-1 text-xs text-gray-500">
            Offene Fälle, die manuell geprüft und kontaktiert werden müssen.
          </p>
        </div>
        <div className="overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-gray-700">
              <tr>
                <th className="px-5 py-3 font-semibold">Eingang</th>
                <th className="px-5 py-3 font-semibold">Kunde</th>
                <th className="px-5 py-3 font-semibold">Grund</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold text-right">Aktion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-5 py-10 text-center text-gray-500">
                    Lade Kündigungsfälle...
                  </td>
                </tr>
              ) : pendingReviews.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-5 py-10 text-center text-gray-500">
                    Keine offenen außerordentlichen Kündigungen.
                  </td>
                </tr>
              ) : (
                pendingReviews.map((review) => {
                  const mailSubject = encodeURIComponent("Außerordentliche Kündigung Immobot");
                  const mailBody = encodeURIComponent(
                    `Hallo,\n\nwir melden uns wegen deiner außerordentlichen Kündigung deines Immobot-Abos.\n\nAngegebener Grund:\n${review.reason || ""}\n`
                  );

                  return (
                    <tr key={review.id} className="align-top hover:bg-gray-50">
                      <td className="px-5 py-4 text-gray-600 whitespace-nowrap">
                        {formatDate(review.createdAt)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-medium text-gray-900">{review.email || "—"}</div>
                        <div className="mt-1 font-mono text-xs text-gray-400">{review.uid}</div>
                        {review.uid && (
                          <Link
                            to={`/admin/user/${review.uid}`}
                            className="mt-2 inline-flex text-xs font-medium text-indigo-600 hover:underline"
                          >
                            User öffnen
                          </Link>
                        )}
                      </td>
                      <td className="max-w-xl px-5 py-4 text-gray-700">
                        <div className="whitespace-pre-wrap break-words">
                          {review.reason || "Kein Grund angegeben."}
                        </div>
                        {review.stripeSubscriptionId && (
                          <div className="mt-2 font-mono text-xs text-gray-400">
                            {review.stripeSubscriptionId}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-full border border-amber-200 bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                          Prüfung offen
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex flex-col items-end gap-2">
                          {review.email && (
                            <a
                              href={`mailto:${review.email}?subject=${mailSubject}&body=${mailBody}`}
                              className="rounded-lg border border-indigo-200 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:border-indigo-400"
                            >
                              Kontaktieren
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => markContacted(review)}
                            disabled={updatingId === review.id}
                            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                          >
                            {updatingId === review.id ? "Speichere..." : "Als kontaktiert markieren"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
