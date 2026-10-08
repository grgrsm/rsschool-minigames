import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { APP_SESSION_KEY, SESSION_LIFETIME_MS } from '@/state/app-session';

const NOW = 1_700_000_000_000;

const { signOutMock, showSnackbarMock, firebaseAuth } = vi.hoisted(() => ({
  signOutMock: vi.fn<(auth: unknown) => Promise<void>>(() => Promise.resolve()),
  showSnackbarMock: vi.fn<(message: string, variant?: string) => void>(),
  firebaseAuth: { name: 'firebase-auth' },
}));

vi.mock('firebase/auth', () => ({ signOut: signOutMock }));
vi.mock('@/firebase/firebase', () => ({ auth: firebaseAuth }));
vi.mock('@/components/feedback/snackbar', () => ({ showSnackbar: showSnackbarMock }));

function createLocalStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key) => map.get(key) ?? null,
    key: (index) => Array.from(map.keys())[index] ?? null,
    removeItem: (key) => {
      map.delete(key);
    },
    setItem: (key, value) => {
      map.set(key, value);
    },
  };
}

async function loadSession() {
  vi.resetModules();
  return (await import('@/state/session')).sessionStore;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  signOutMock.mockClear();
  showSnackbarMock.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('sessionStore wiring', () => {
  it('persists the session in localStorage and signs out of Firebase on logout', async () => {
    const localStorage = createLocalStorage();
    vi.stubGlobal('window', { localStorage });
    const sessionStore = await loadSession();

    sessionStore.logIn({ displayName: 'Alex Gamer', email: 'alex@minigames.com' });
    expect(localStorage.getItem(APP_SESSION_KEY)).toContain('alex@minigames.com');

    sessionStore.logOut();
    expect(localStorage.getItem(APP_SESSION_KEY)).toBeNull();
    expect(signOutMock).toHaveBeenCalledWith(firebaseAuth);
  });

  it('shows one warning Snackbar when the session expires', async () => {
    vi.stubGlobal('window', { localStorage: createLocalStorage() });
    const sessionStore = await loadSession();

    sessionStore.logIn({ displayName: 'Alex Gamer', email: 'alex@minigames.com' });
    vi.advanceTimersByTime(SESSION_LIFETIME_MS);

    expect(showSnackbarMock).toHaveBeenCalledTimes(1);
    expect(showSnackbarMock).toHaveBeenCalledWith(
      'Your session has expired. Please log in again.',
      'warning',
    );
    expect(sessionStore.getState()).toEqual({ status: 'guest' });
  });

  it('still works as an in-memory session when localStorage is not accessible', async () => {
    vi.stubGlobal('window', {
      get localStorage(): Storage {
        throw new Error('Access denied');
      },
    });
    const sessionStore = await loadSession();

    sessionStore.logIn({ displayName: 'Alex Gamer', email: 'alex@minigames.com' });
    expect(sessionStore.getState().status).toBe('authenticated');

    sessionStore.restore();
    expect(sessionStore.getState().status).toBe('authenticated');
  });
});
