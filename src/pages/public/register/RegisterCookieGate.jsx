import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { hasAcceptedCookies } from "@/lib/cookieConsent.js";

export default function RegisterCookieGate() {
  const navigate = useNavigate();
  const [cookiesAccepted, setCookiesAccepted] = useState(hasAcceptedCookies());

  useEffect(() => {
    function syncCookieConsent(event) {
      setCookiesAccepted(event?.detail?.accepted === true || hasAcceptedCookies());
    }

    window.addEventListener("cookie-consent-updated", syncCookieConsent);
    return () => window.removeEventListener("cookie-consent-updated", syncCookieConsent);
  }, []);

  if (!cookiesAccepted) {
    return (
      <div className="
        w-full mx-auto max-w-2xl bg-white space-y-6 md:space-y-8
        p-4 mt-2
        md:p-6 md:mt-10 md:w-2/3
      ">
        <div className="flex min-h-[360px] flex-col items-center justify-center gap-6 rounded-xl bg-blue-50/70 p-8 text-center md:p-12">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-blue-100">
            <img src="/logo.png" alt="" className="h-12 w-12 object-contain" />
          </div>

          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-gray-950 md:text-4xl">
              Cookie-Zustimmung erforderlich
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-gray-600 md:text-xl">
              Für die Registrierung müssen Standortsuche und Karte geladen werden.
              Ohne Zustimmung kann die Registrierung nicht gestartet oder fortgesetzt werden.
            </p>
          </div>

          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event("open-cookie-settings"))}
            className="rounded-xl bg-blue-600 px-8 py-4 text-base font-bold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 md:text-lg"
          >
            Cookie-Einstellungen öffnen
          </button>
        </div>

        <div className="flex justify-start">
          <button
            className="px-6 py-3 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium"
            onClick={() => navigate("/")}
          >
            Zur Startseite
          </button>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
