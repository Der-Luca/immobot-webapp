import { useEffect, useState } from "react";
import {
  acceptLocalCookies,
  getLocalCookieConsent,
  hasCookieConsentChoice,
  revokeLocalCookies,
} from "@/lib/cookieConsent";

function getInitialState() {
  const consent = getLocalCookieConsent();
  return {
    accepted: consent?.accepted === true,
    hasChoice: hasCookieConsentChoice(),
  };
}

export default function CookieConsentManager() {
  const [state, setState] = useState(getInitialState);
  const [panelOpen, setPanelOpen] = useState(!state.hasChoice);

  useEffect(() => {
    function refresh(event) {
      const consent = event?.detail || getLocalCookieConsent();
      setState({
        accepted: consent?.accepted === true,
        hasChoice: Boolean(consent),
      });
      setPanelOpen(false);
    }

    window.addEventListener("cookie-consent-updated", refresh);
    return () => window.removeEventListener("cookie-consent-updated", refresh);
  }, []);

  useEffect(() => {
    function openPanel() {
      setPanelOpen(true);
    }

    window.addEventListener("open-cookie-settings", openPanel);
    return () => window.removeEventListener("open-cookie-settings", openPanel);
  }, []);

  useEffect(() => {
    function syncSharedCookie() {
      const next = getInitialState();
      setState((current) => {
        if (
          current.accepted === next.accepted &&
          current.hasChoice === next.hasChoice
        ) {
          return current;
        }

        window.dispatchEvent(
          new CustomEvent("cookie-consent-updated", {
            detail: getLocalCookieConsent(),
          })
        );
        return next;
      });
    }

    window.addEventListener("focus", syncSharedCookie);
    const interval = window.setInterval(syncSharedCookie, 1500);

    return () => {
      window.removeEventListener("focus", syncSharedCookie);
      window.clearInterval(interval);
    };
  }, []);

  function accept() {
    const next = acceptLocalCookies();
    setState({ accepted: true, hasChoice: true });
    setPanelOpen(false);
    return next;
  }

  function decline() {
    const next = revokeLocalCookies();
    setState({ accepted: false, hasChoice: true });
    setPanelOpen(false);
    return next;
  }

  return (
    <>
      {panelOpen && (
        <div className="fixed inset-x-0 bottom-0 z-[10000] border-t border-gray-200 bg-white px-4 py-4 shadow-2xl">
          <div className="mx-auto flex max-w-5xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="max-w-3xl">
              <h2 className="text-base font-bold text-gray-950">Cookie-Einstellungen</h2>
              <p className="mt-1 text-sm leading-relaxed text-gray-600">
                Wir laden Karten- und Suchdienste von Drittanbietern erst nach deiner Zustimmung.
                Ohne Zustimmung kannst du die Website weiter nutzen. Die Registrierung ist erst nach
                Zustimmung möglich, weil Standortsuche und Karte Teil des Suchprofils sind.
              </p>
              {state.hasChoice && (
                <p className="mt-2 text-sm font-semibold text-gray-900">
                  Aktuell: {state.accepted ? "zugestimmt" : "abgelehnt"}
                </p>
              )}
              <a
                href="https://immobot.pro/datenschutz"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex text-sm font-semibold text-blue-600 underline underline-offset-2 hover:text-blue-700"
              >
                Datenschutzerklärung
              </a>
            </div>
            <div className="flex shrink-0 flex-wrap gap-3">
              <button
                type="button"
                onClick={decline}
                className={`rounded-xl px-5 py-3 text-sm font-bold transition ${
                  state.accepted
                    ? "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                    : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                {state.accepted ? "Zustimmung ablehnen" : "Ablehnen"}
              </button>
              <button
                type="button"
                onClick={accept}
                className={`rounded-xl px-5 py-3 text-sm font-bold shadow-sm transition ${
                  state.accepted
                    ? "bg-blue-600 text-white shadow-blue-600/20 hover:bg-blue-700"
                    : "bg-blue-600 text-white shadow-blue-600/20 hover:bg-blue-700"
                }`}
              >
                {state.accepted ? "Zustimmung behalten" : "Zustimmen"}
              </button>
            </div>
          </div>
        </div>
      )}

      {state.hasChoice && !panelOpen && (
        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          className="fixed bottom-4 left-4 z-[9999] flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 bg-white text-xl shadow-lg transition hover:scale-105 hover:bg-gray-50"
          aria-label="Cookie-Einstellungen bearbeiten"
          title={`Cookie-Einstellungen (${state.accepted ? "zugestimmt" : "abgelehnt"})`}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2a4 4 0 0 0 4 4 4 4 0 0 0 4 4 8 8 0 1 1-8-8" />
            <path d="M8.5 8.5h.01" />
            <path d="M14.5 13.5h.01" />
            <path d="M9.5 15.5h.01" />
          </svg>
        </button>
      )}
    </>
  );
}
