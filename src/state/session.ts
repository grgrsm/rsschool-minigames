import { signOut } from 'firebase/auth';
import { showSnackbar } from '@/components/feedback/snackbar';
import { auth } from '@/firebase/firebase';
import type { SessionStorage } from '@/state/app-session';
import { SessionStore } from '@/state/session-store';

/** Used when the browser does not expose `localStorage` at all. */
const unavailableStorage: SessionStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

function getLocalStorage(): SessionStorage {
  try {
    return window.localStorage;
  } catch {
    return unavailableStorage;
  }
}

/** The app-wide session, wired to the browser's `localStorage`, Firebase and the Snackbar. */
export const sessionStore = new SessionStore({
  storage: getLocalStorage(),
  now: () => Date.now(),
  signOut: () => signOut(auth),
  onExpired: () => showSnackbar('Your session has expired. Please log in again.', 'warning'),
});
