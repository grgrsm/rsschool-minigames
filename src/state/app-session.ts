import type { AppSession } from '@/types/auth';

/** Namespaced `localStorage` key of the app session (documented in the README). */
export const APP_SESSION_KEY = 'minigames:rsschool-minigames:app-session';

/** The app session lasts 5 minutes from successful authentication. */
export const SESSION_LIFETIME_MS = 5 * 60 * 1000;

/** The subset of `Storage` the session needs — lets tests pass a simple fake. */
export type SessionStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export type StoredSession =
  | { status: 'none' }
  | { status: 'invalid' }
  | { status: 'expired' }
  | { status: 'active'; session: AppSession };

function isRecord(value: unknown): value is { [key: string]: unknown } {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Returns the session only if every required field is present and correctly typed. */
export function parseAppSession(raw: string): AppSession | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!isRecord(data)) {
    return null;
  }

  const { displayName, email, authenticatedAt, avatarUrl } = data;

  if (typeof displayName !== 'string' || displayName.trim() === '') {
    return null;
  }
  if (typeof email !== 'string' || email.trim() === '') {
    return null;
  }
  if (typeof authenticatedAt !== 'number' || !Number.isFinite(authenticatedAt)) {
    return null;
  }
  if (avatarUrl !== undefined && typeof avatarUrl !== 'string') {
    return null;
  }

  return avatarUrl === undefined
    ? { displayName, email, authenticatedAt }
    : { displayName, email, authenticatedAt, avatarUrl };
}

/** A timestamp in the future is treated as expired: it could otherwise stretch the lifetime. */
export function isSessionExpired(authenticatedAt: number, now: number): boolean {
  const age = now - authenticatedAt;
  return age < 0 || age >= SESSION_LIFETIME_MS;
}

export function readAppSession(storage: SessionStorage, now: number): StoredSession {
  let raw: string | null;
  try {
    raw = storage.getItem(APP_SESSION_KEY);
  } catch {
    return { status: 'none' };
  }

  if (raw === null) {
    return { status: 'none' };
  }

  const session = parseAppSession(raw);
  if (session === null) {
    return { status: 'invalid' };
  }

  return isSessionExpired(session.authenticatedAt, now)
    ? { status: 'expired' }
    : { status: 'active', session };
}

/** Stores only the known fields, even if the caller passes an object with extra data. */
export function saveAppSession(storage: SessionStorage, session: AppSession): void {
  const { displayName, email, authenticatedAt, avatarUrl } = session;
  const record: AppSession =
    avatarUrl === undefined
      ? { displayName, email, authenticatedAt }
      : { displayName, email, authenticatedAt, avatarUrl };

  try {
    storage.setItem(APP_SESSION_KEY, JSON.stringify(record));
  } catch {
    // Storage is unavailable (private mode, quota): the session then lives in memory only.
  }
}

/** Removes only this app's session key and leaves every other key untouched. */
export function clearAppSession(storage: SessionStorage): void {
  try {
    storage.removeItem(APP_SESSION_KEY);
  } catch {
    // Nothing to clean up when storage is unavailable.
  }
}
