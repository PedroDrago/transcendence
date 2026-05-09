export const DEFAULT_AUTH_BASE = 'http://localhost:4000';
export const AUTH_BASE_STORAGE_KEY = 'transcendence.auth.base';
export const APP_TOKEN_STORAGE_KEY = 'transcendence.auth.token';
export const HANDOFF_TOKEN_STORAGE_KEY = 'transcendence.auth.handoff-token';

export function getStoredAuthBase() {
  if (typeof window === 'undefined') return DEFAULT_AUTH_BASE;
  return window.localStorage.getItem(AUTH_BASE_STORAGE_KEY) ?? DEFAULT_AUTH_BASE;
}

export function setStoredAuthBase(value: string) {
  window.localStorage.setItem(AUTH_BASE_STORAGE_KEY, value);
}

export function getStoredAppToken() {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(APP_TOKEN_STORAGE_KEY) ?? '';
}

export function setStoredAppToken(value: string) {
  if (value) {
    window.localStorage.setItem(APP_TOKEN_STORAGE_KEY, value);
  } else {
    window.localStorage.removeItem(APP_TOKEN_STORAGE_KEY);
  }
}

export function getStoredHandoffToken() {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(HANDOFF_TOKEN_STORAGE_KEY) ?? '';
}

export function setStoredHandoffToken(value: string) {
  if (value) {
    window.localStorage.setItem(HANDOFF_TOKEN_STORAGE_KEY, value);
  } else {
    window.localStorage.removeItem(HANDOFF_TOKEN_STORAGE_KEY);
  }
}

export function clearStoredAuth() {
  window.localStorage.removeItem(APP_TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(HANDOFF_TOKEN_STORAGE_KEY);
}

export function decodeJwt(token: string) {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - (normalized.length % 4)) % 4);
    const json = decodeURIComponent(
      atob(`${normalized}${padding}`)
        .split('')
        .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
        .join(''),
    );
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}
