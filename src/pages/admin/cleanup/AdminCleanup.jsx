import { useCallback, useEffect, useMemo, useState } from "react";
import { httpsCallable } from "firebase/functions";
import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { db, functions } from "@/firebase.js";
import { useAuth } from "@/contexts/AuthContext.jsx";

function toDate(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  if (typeof value.seconds === "number") return new Date(value.seconds * 1000);

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value) {
  const date = toDate(value);
  if (!date) return "-";

  return date.toLocaleString("de-DE", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default function AdminCleanup() {
  const { user } = useAuth();
  const [runs, setRuns] = useState([]);
  const [requests, setRequests] = useState([]);
  const [preview, setPreview] = useState(null);
  const [testEmail, setTestEmail] = useState(user?.email || "");
  const [testMessage, setTestMessage] = useState("");
  const [loadingRuns, setLoadingRuns] = useState(true);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");

  const latestRun = runs[0] || null;

  const loadRuns = useCallback(async () => {
    setLoadingRuns(true);
    try {
      const snap = await getDocs(
        query(
          collection(db, "offerRedirectCleanupRuns"),
          orderBy("startedAt", "desc"),
          limit(25)
        )
      );
      const requestSnap = await getDocs(
        query(
          collection(db, "offerRedirectCleanupRequests"),
          orderBy("requestedAt", "desc"),
          limit(10)
        )
      );

      setRuns(snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
      setRequests(requestSnap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
    } catch (err) {
      setError(err?.message || "Cleanup-Logs konnten nicht geladen werden.");
    } finally {
      setLoadingRuns(false);
    }
  }, []);

  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  const runPreview = async () => {
    setBusy("preview");
    setError("");
    try {
      const fn = httpsCallable(functions, "cleanupOldOfferRedirectsPreview");
      const result = await fn({ days: 31, maxDeletes: 450 });
      setPreview(result.data);
      await loadRuns();
    } catch (err) {
      setError(err?.message || "Preview fehlgeschlagen.");
    } finally {
      setBusy(null);
    }
  };

  const requestCleanup = async () => {
    const ok = window.confirm(
      "Cleanup serverseitig anfordern? Es wird kein öffentlicher Endpunkt aufgerufen; der Firestore-Trigger löscht nur offerRedirects älter als 31 Tage."
    );
    if (!ok) return;

    setBusy("request");
    setError("");
    try {
      await addDoc(collection(db, "offerRedirectCleanupRequests"), {
        requestedAt: serverTimestamp(),
        requestedBy: user?.uid || null,
        requestedByEmail: user?.email || null,
        days: 31,
        maxDeletes: 10000,
        status: "queued",
      });
      await loadRuns();
    } catch (err) {
      setError(err?.message || "Cleanup-Anforderung fehlgeschlagen.");
    } finally {
      setBusy(null);
    }
  };

  const sendWelcomeTest = async () => {
    setBusy("welcome-test");
    setError("");
    setTestMessage("");
    try {
      const fn = httpsCallable(functions, "sendSubscriptionWelcomeEmailTest");
      await fn({ toEmail: testEmail });
      setTestMessage(`Testmail wurde an ${testEmail} gesendet.`);
    } catch (err) {
      setError(err?.message || "Testmail konnte nicht gesendet werden.");
    } finally {
      setBusy(null);
    }
  };

  const latestCleanupRun = useMemo(() => {
    return runs.find((run) => !run.dryRun) || null;
  }, [runs]);

  const latestRequest = requests[0] || null;

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 md:p-10 space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
          Cleanup
        </h1>
        <p className="text-gray-500 mt-1">
          Alte Suchergebnisse aus offerRedirects bereinigen und Läufe prüfen.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <StatCard label="Letzter scharfer Lauf" value={latestCleanupRun ? formatDate(latestCleanupRun.startedAt) : "-"} />
        <StatCard label="Zuletzt gelöscht" value={latestCleanupRun ? latestCleanupRun.deleted || 0 : 0} />
        <StatCard label="Letzte Anforderung" value={latestRequest ? formatDate(latestRequest.requestedAt) : "-"} sub={latestRequest?.status || ""} />
      </div>

      <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Offer Redirects älter als 31 Tage</h2>
            <p className="text-sm text-gray-500 mt-1">
              Preview prüft nur den ersten Block. Das Löschen läuft ausschließlich automatisch per Scheduler.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={runPreview}
              disabled={!!busy}
              className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {busy === "preview" ? "Prüfe..." : "Preview"}
            </button>
            <button
              onClick={requestCleanup}
              disabled={!!busy}
              className="px-4 py-2 rounded-lg bg-amber-600 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {busy === "request" ? "Fordere an..." : "Cleanup anfordern"}
            </button>
          </div>
        </div>

        {preview && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <PreviewItem label="Modus" value={preview.dryRun ? "Preview" : "Gelöscht"} />
              <PreviewItem label="Cutoff" value={formatDate(preview.cutoff)} />
              <PreviewItem label="Geprüft" value={preview.scanned} />
              <PreviewItem label="Gelöscht" value={preview.deleted} />
            </div>
            {!!preview.examples?.length && (
              <div className="mt-4">
                <div className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">
                  Beispiele
                </div>
                <div className="space-y-1">
                  {preview.examples.map((example) => (
                    <div key={example.id} className="text-xs text-gray-600">
                      {example.createdAt} · {example.uid || "-"} · {example.title || example.id}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-lg font-bold text-gray-900">Abo-Mail testen</h2>
            <p className="text-sm text-gray-500 mt-1">
              Sendet eine Testversion der Willkommens- und Bestellbestätigungs-Mail an die angegebene Adresse.
            </p>
            <input
              type="email"
              value={testEmail}
              onChange={(event) => setTestEmail(event.target.value)}
              className="mt-4 block w-full max-w-md rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="test@example.com"
            />
            {testMessage && (
              <p className="mt-3 text-sm font-medium text-emerald-700">
                {testMessage}
              </p>
            )}
          </div>
          <button
            onClick={sendWelcomeTest}
            disabled={!!busy || !testEmail}
            className="px-4 py-2 rounded-lg bg-blue-600 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {busy === "welcome-test" ? "Sende..." : "Testmail senden"}
          </button>
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Letzte Anforderungen</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-6 py-3 text-left font-bold">Angefordert</th>
                <th className="px-6 py-3 text-left font-bold">Status</th>
                <th className="px-6 py-3 text-right font-bold">Geprüft</th>
                <th className="px-6 py-3 text-right font-bold">Gelöscht</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {requests.map((request) => (
                <tr key={request.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                    {formatDate(request.requestedAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={request.status} dryRun={false} />
                  </td>
                  <td className="px-6 py-4 text-right text-gray-700">
                    {request.scanned || 0}
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-gray-900">
                    {request.deleted || 0}
                  </td>
                </tr>
              ))}
              {!requests.length && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                    Noch keine manuellen Anforderungen.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Letzte Cleanup-Läufe</h2>
        </div>

        {loadingRuns ? (
          <div className="p-6 text-sm text-gray-500 animate-pulse">Lade Logs...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-6 py-3 text-left font-bold">Start</th>
                  <th className="px-6 py-3 text-left font-bold">Quelle</th>
                  <th className="px-6 py-3 text-left font-bold">Status</th>
                  <th className="px-6 py-3 text-right font-bold">Geprüft</th>
                  <th className="px-6 py-3 text-right font-bold">Gelöscht</th>
                  <th className="px-6 py-3 text-left font-bold">Cutoff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {runs.map((run) => (
                  <tr key={run.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">{formatDate(run.startedAt)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">{run.source || "-"}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={run.status} dryRun={run.dryRun} />
                    </td>
                    <td className="px-6 py-4 text-right text-gray-700">{run.scanned || 0}</td>
                    <td className="px-6 py-4 text-right font-bold text-gray-900">{run.deleted || 0}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">{formatDate(run.cutoff)}</td>
                  </tr>
                ))}
                {!runs.length && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                      Noch keine Cleanup-Läufe.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      <div className="text-xs font-bold uppercase tracking-wide text-gray-400">{label}</div>
      <div className="mt-2 text-2xl font-extrabold text-gray-900">{value}</div>
      {sub && <div className="mt-1 text-xs text-gray-500">{sub}</div>}
    </div>
  );
}

function PreviewItem({ label, value }) {
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-wide text-gray-400">{label}</div>
      <div className="mt-1 font-bold text-gray-900">{value}</div>
    </div>
  );
}

function StatusBadge({ status, dryRun }) {
  const classes =
    status === "error"
      ? "bg-red-50 text-red-700 border-red-100"
      : status === "running"
        ? "bg-amber-50 text-amber-700 border-amber-100"
        : dryRun
          ? "bg-blue-50 text-blue-700 border-blue-100"
          : "bg-emerald-50 text-emerald-700 border-emerald-100";

  const label =
    status === "error"
      ? "Fehler"
      : status === "running"
        ? "Läuft"
        : dryRun
          ? "Preview"
          : "Abgeschlossen";

  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-bold ${classes}`}>
      {label}
    </span>
  );
}
