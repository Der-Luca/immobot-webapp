const COOKIE_CONSENT_KEY = "immobot_cookie_consent_v1";
export const COOKIE_CONSENT_VERSION = 1;

export function getLocalCookieConsent() {
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.version === COOKIE_CONSENT_VERSION ? parsed : null;
  } catch {
    return null;
  }
}

export function hasAcceptedCookies() {
  return getLocalCookieConsent()?.accepted === true;
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
