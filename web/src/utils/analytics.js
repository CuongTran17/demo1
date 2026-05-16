import { analyticsAPI } from '../api';

const ANON_KEY = 'ptit_anon_id';
const CONSENT_KEY = 'ptit_cookie_consent';
const DEDUPE_PREFIX = 'ptit_analytics_dedupe:';

function storageAvailable(storage) {
  try {
    const key = '__ptit_storage_test__';
    storage.setItem(key, key);
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

function createId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getAnalyticsConsent() {
  if (!storageAvailable(localStorage)) return '';
  return localStorage.getItem(CONSENT_KEY) || '';
}

export function setAnalyticsConsent(value) {
  if (!storageAvailable(localStorage)) return;
  localStorage.setItem(CONSENT_KEY, value === 'accepted' ? 'accepted' : 'necessary');
}

export function getAnonymousId() {
  if (!storageAvailable(localStorage)) return createId();
  let id = localStorage.getItem(ANON_KEY);
  if (!id) {
    id = createId();
    localStorage.setItem(ANON_KEY, id);
  }
  return id;
}

export function canTrackAnalytics() {
  return getAnalyticsConsent() === 'accepted';
}

export function shouldTrackOnce(key, ttlMs) {
  if (!storageAvailable(sessionStorage)) return true;
  const storageKey = `${DEDUPE_PREFIX}${key}`;
  const now = Date.now();
  const previous = Number(sessionStorage.getItem(storageKey) || 0);
  if (previous && now - previous < ttlMs) return false;
  sessionStorage.setItem(storageKey, String(now));
  return true;
}

export async function trackEvent(eventType, payload = {}) {
  if (!canTrackAnalytics()) return;
  try {
    await analyticsAPI.track({
      eventType,
      anonymousId: getAnonymousId(),
      courseId: payload.courseId || null,
      orderId: payload.orderId || null,
      metadata: payload.metadata || {},
      pageUrl: window.location.href,
      referrer: document.referrer || null,
    });
  } catch {
    // Analytics must never block the user journey.
  }
}
