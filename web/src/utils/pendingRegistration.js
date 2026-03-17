const STORAGE_KEY = 'pending-register';

function hasSessionStorage() {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

export function getPendingRegistration() {
  if (!hasSessionStorage()) return null;

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function savePendingRegistration(data) {
  if (!hasSessionStorage()) return data;

  const nextValue = {
    ...data,
    updatedAt: Date.now(),
  };

  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(nextValue));
  return nextValue;
}

export function clearPendingRegistration() {
  if (!hasSessionStorage()) return;
  window.sessionStorage.removeItem(STORAGE_KEY);
}

export function getPendingRegistrationCooldown(record) {
  const requestedAt = Number(record?.otpRequestedAt || 0);
  const cooldownSeconds = Number(record?.otpCooldownSeconds || 0);

  if (!requestedAt || !cooldownSeconds) return 0;

  const elapsedSeconds = Math.floor((Date.now() - requestedAt) / 1000);
  return Math.max(0, cooldownSeconds - elapsedSeconds);
}