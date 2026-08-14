const COOKIE_CONSENT_KEY = "immobot_cookie_consent_v1";
export const COOKIE_CONSENT_VERSION = 1;
const COOKIE_NAME = "immobot_cookie_consent";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 180;

function dispatchConsentUpdate(next) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("cookie-consent-updated", { detail: next }));
}

function writeConsentCookie(accepted) {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  const domain = window.location.hostname.endsWith("immobot.pro")
    ? "; Domain=.immobot.pro"
    : "";
  document.cookie = `${COOKIE_NAME}=${accepted ? "accepted" : "declined"}; Max-Age=${COOKIE_MAX_AGE}; Path=/${domain}; SameSite=Lax${secure}`;
}

function readConsentCookie() {
  if (typeof document === "undefined") return null;
  const value = document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${COOKIE_NAME}=`))
    ?.split("=")[1];

  if (value === "accepted") {
    return {
      accepted: true,
      acceptedAt: null,
      updatedAt: null,
      version: COOKIE_CONSENT_VERSION,
    };
  }

  if (value === "declined") {
    return {
      accepted: false,
      acceptedAt: null,
      revokedAt: null,
      updatedAt: null,
      version: COOKIE_CONSENT_VERSION,
    };
  }

  return null;
}

export function getLocalCookieConsent() {
  const cookieConsent = readConsentCookie();
  if (cookieConsent) return cookieConsent;

  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.version !== COOKIE_CONSENT_VERSION) return null;
    writeConsentCookie(parsed.accepted === true);
    return parsed;
  } catch {
    // localStorage kann in restriktiven Browser-Kontexten blockiert sein.
  }

  return null;
}

export function hasAcceptedCookies() {
  return getLocalCookieConsent()?.accepted === true;
}

export function hasCookieConsentChoice() {
  return getLocalCookieConsent() !== null;
}

export function acceptLocalCookies() {
  const now = new Date().toISOString();
  const current = getLocalCookieConsent();
  const next = {
    accepted: true,
    acceptedAt: current?.acceptedAt || now,
    updatedAt: now,
    version: COOKIE_CONSENT_VERSION,
  };

  try {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(next));
  } catch {
    // localStorage kann in restriktiven Browser-Kontexten blockiert sein.
  }
  writeConsentCookie(true);
  dispatchConsentUpdate(next);

  return next;
}

export function revokeLocalCookies() {
  const now = new Date().toISOString();
  const next = {
    accepted: false,
    acceptedAt: null,
    revokedAt: now,
    updatedAt: now,
    version: COOKIE_CONSENT_VERSION,
  };

  try {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(next));
  } catch {
    // localStorage kann in restriktiven Browser-Kontexten blockiert sein.
  }
  writeConsentCookie(false);
  dispatchConsentUpdate(next);

  return next;
}

export function buildCookieConsentPayload(consent = getLocalCookieConsent()) {
  if (!consent) return undefined;

  return {
    accepted: consent.accepted === true,
    acceptedAt: consent.acceptedAt || null,
    revokedAt: consent.revokedAt || null,
    updatedAt: consent.updatedAt || null,
    version: COOKIE_CONSENT_VERSION,
  };
}
