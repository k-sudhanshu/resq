// The session token lives in sessionStorage: it clears when the tab closes,
// which is appropriate since there is no account to protect and nothing to
// resume later.
const TOKEN_KEY = 'resq.session.token';
const CONSENT_KEY = 'resq.consent.accepted';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  window.sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  window.sessionStorage.removeItem(TOKEN_KEY);
}

// Consent is remembered across tabs, so a returning user is not asked twice.
export function hasAcceptedConsent(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(CONSENT_KEY) === 'true';
}

export function acceptConsent(): void {
  window.localStorage.setItem(CONSENT_KEY, 'true');
}
