import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { APP_SESSION_KEY, SESSION_LIFETIME_MS } from '@/state/app-session';
import type { SessionStorage } from '@/state/app-session';
import { SessionStore, getInitials } from '@/state/session-store';
import type { SessionState } from '@/types/auth';

const NOW = 1_700_000_000_000;

const profile = { displayName: 'Alex Gamer', email: 'alex@minigames.com' };

function createMemoryStorage(): SessionStorage & { dump: () => string | null } {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
    dump: () => map.get(APP_SESSION_KEY) ?? null,
  };
}

function setup() {
  const storage = createMemoryStorage();
  const signOut = vi.fn<() => Promise<void>>(() => Promise.resolve());
  const onExpired = vi.fn<() => void>();
  const store = new SessionStore({ storage, now: () => Date.now(), signOut, onExpired });
  return { storage, signOut, onExpired, store };
}

function storedSession(overrides: { [key: string]: unknown } = {}): string {
  return JSON.stringify({ ...profile, authenticatedAt: NOW, ...overrides });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('getInitials', () => {
  it('uses the first letters of the first two words in upper case', () => {
    expect(getInitials('Alex Gamer')).toBe('AG');
    expect(getInitials('alex gamer junior')).toBe('AG');
  });

  it('handles a single word and extra whitespace', () => {
    expect(getInitials('  alex  ')).toBe('A');
    expect(getInitials('alex    gamer')).toBe('AG');
  });

  it('returns an empty string for an empty name', () => {
    expect(getInitials('   ')).toBe('');
  });
});

describe('SessionStore.logIn', () => {
  it('starts as a guest', () => {
    expect(setup().store.getState()).toEqual({ status: 'guest' });
  });

  it('switches to authenticated and exposes the user', () => {
    const { store } = setup();
    store.logIn(profile);
    expect(store.getState()).toEqual({
      status: 'authenticated',
      user: { fullName: 'Alex Gamer', initials: 'AG', email: 'alex@minigames.com' },
    });
  });

  it('keeps the avatar url when the provider supplies one', () => {
    const { store } = setup();
    store.logIn({ ...profile, avatarUrl: 'https://example.com/a.png' });
    const state = store.getState();
    expect(state.status === 'authenticated' && state.user.avatarUrl).toBe(
      'https://example.com/a.png',
    );
  });

  it('persists the session with the login timestamp and nothing else', () => {
    const { store, storage } = setup();
    store.logIn(profile);
    expect(JSON.parse(storage.dump() ?? 'null')).toEqual({ ...profile, authenticatedAt: NOW });
  });

  it('notifies subscribers, immediately and on every change', () => {
    const { store } = setup();
    const states: SessionState[] = [];
    store.subscribe((state) => states.push(state));
    store.logIn(profile);
    expect(states.map((state) => state.status)).toEqual(['guest', 'authenticated']);
  });

  it('stops notifying after unsubscribe', () => {
    const { store } = setup();
    const listener = vi.fn<(state: SessionState) => void>();
    const unsubscribe = store.subscribe(listener);
    unsubscribe();
    store.logIn(profile);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('SessionStore.logOut', () => {
  it('returns to guest, clears the session and signs out of Firebase', () => {
    const { store, storage, signOut, onExpired } = setup();
    store.logIn(profile);
    store.logOut();
    expect(store.getState()).toEqual({ status: 'guest' });
    expect(storage.dump()).toBeNull();
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(onExpired).not.toHaveBeenCalled();
  });

  it('does not notify subscribers again when already a guest', () => {
    const { store } = setup();
    const listener = vi.fn<(state: SessionState) => void>();
    store.subscribe(listener);
    store.logOut();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('cancels the pending expiry', () => {
    const { store, onExpired } = setup();
    store.logIn(profile);
    store.logOut();
    vi.advanceTimersByTime(SESSION_LIFETIME_MS * 2);
    expect(onExpired).not.toHaveBeenCalled();
  });

  it('ignores a Firebase sign-out failure', async () => {
    const { store, signOut } = setup();
    signOut.mockRejectedValueOnce(new Error('network'));
    store.logIn(profile);
    expect(() => store.logOut()).not.toThrow();
    await vi.advanceTimersByTimeAsync(0);
    expect(store.getState()).toEqual({ status: 'guest' });
  });
});

describe('SessionStore.restore', () => {
  it('stays a guest when nothing is stored, without signing out', () => {
    const { store, signOut } = setup();
    store.restore();
    expect(store.getState()).toEqual({ status: 'guest' });
    expect(signOut).not.toHaveBeenCalled();
  });

  it('restores an active session without extending its lifetime', () => {
    const { store, storage } = setup();
    const authenticatedAt = NOW - 60_000;
    storage.setItem(APP_SESSION_KEY, storedSession({ authenticatedAt }));

    store.restore();

    expect(store.getState().status).toBe('authenticated');
    expect(JSON.parse(storage.dump() ?? 'null')).toEqual({ ...profile, authenticatedAt });
  });

  it('returns to guest with one notification when the stored session expired', () => {
    const { store, storage, signOut, onExpired } = setup();
    storage.setItem(APP_SESSION_KEY, storedSession({ authenticatedAt: NOW - SESSION_LIFETIME_MS }));

    store.restore();

    expect(store.getState()).toEqual({ status: 'guest' });
    expect(storage.dump()).toBeNull();
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(onExpired).toHaveBeenCalledTimes(1);
  });

  it.each(['{broken', 'null', JSON.stringify({ email: 'a@b.co' })])(
    'drops invalid stored data and signs out silently: %s',
    (raw) => {
      const { store, storage, signOut, onExpired } = setup();
      storage.setItem(APP_SESSION_KEY, raw);

      store.restore();

      expect(store.getState()).toEqual({ status: 'guest' });
      expect(storage.dump()).toBeNull();
      expect(signOut).toHaveBeenCalledTimes(1);
      expect(onExpired).not.toHaveBeenCalled();
    },
  );
});

describe('SessionStore.validate', () => {
  it('returns false for a guest without side effects', () => {
    const { store, signOut, onExpired } = setup();
    expect(store.validate()).toBe(false);
    expect(signOut).not.toHaveBeenCalled();
    expect(onExpired).not.toHaveBeenCalled();
  });

  it('returns true while the session is active', () => {
    const { store } = setup();
    store.logIn(profile);
    vi.setSystemTime(NOW + SESSION_LIFETIME_MS - 1);
    expect(store.validate()).toBe(true);
    expect(store.getState().status).toBe('authenticated');
  });

  it('ends an expired session once, with a single notification', () => {
    const { store, storage, signOut, onExpired } = setup();
    store.logIn(profile);
    storage.setItem(APP_SESSION_KEY, storedSession({ authenticatedAt: NOW - SESSION_LIFETIME_MS }));

    expect(store.validate()).toBe(false);
    expect(store.validate()).toBe(false);

    expect(store.getState()).toEqual({ status: 'guest' });
    expect(storage.dump()).toBeNull();
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(onExpired).toHaveBeenCalledTimes(1);
  });

  it('ends the session without a notification when the stored data was removed', () => {
    const { store, storage, signOut, onExpired } = setup();
    store.logIn(profile);
    storage.removeItem(APP_SESSION_KEY);

    expect(store.validate()).toBe(false);

    expect(store.getState()).toEqual({ status: 'guest' });
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(onExpired).not.toHaveBeenCalled();
  });

  it('ends the session without a notification when the stored data was corrupted', () => {
    const { store, storage, onExpired } = setup();
    store.logIn(profile);
    storage.setItem(APP_SESSION_KEY, '{broken');

    expect(store.validate()).toBe(false);

    expect(store.getState()).toEqual({ status: 'guest' });
    expect(onExpired).not.toHaveBeenCalled();
  });
});

describe('SessionStore automatic expiry', () => {
  it('switches to guest exactly when the lifetime ends', () => {
    const { store, onExpired } = setup();
    store.logIn(profile);

    vi.advanceTimersByTime(SESSION_LIFETIME_MS - 1);
    expect(store.getState().status).toBe('authenticated');
    expect(onExpired).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(store.getState()).toEqual({ status: 'guest' });
    expect(onExpired).toHaveBeenCalledTimes(1);
  });

  it('counts the remaining time of a restored session', () => {
    const { store, storage, onExpired } = setup();
    storage.setItem(APP_SESSION_KEY, storedSession({ authenticatedAt: NOW - 240_000 }));
    store.restore();

    vi.advanceTimersByTime(59_999);
    expect(store.getState().status).toBe('authenticated');

    vi.advanceTimersByTime(1);
    expect(store.getState()).toEqual({ status: 'guest' });
    expect(onExpired).toHaveBeenCalledTimes(1);
  });

  it('follows the stored timestamp when it was moved forward, without polling', () => {
    const { store, storage, onExpired } = setup();
    const reads = vi.spyOn(storage, 'getItem');
    store.logIn(profile);
    storage.setItem(APP_SESSION_KEY, storedSession({ authenticatedAt: NOW + 60_000 }));

    vi.advanceTimersByTime(SESSION_LIFETIME_MS);
    expect(store.getState().status).toBe('authenticated');

    // The next check waits for the stored session's own end instead of re-running right away.
    reads.mockClear();
    vi.advanceTimersByTime(30_000);
    expect(reads).not.toHaveBeenCalled();

    vi.advanceTimersByTime(30_000);
    expect(store.getState()).toEqual({ status: 'guest' });
    expect(onExpired).toHaveBeenCalledTimes(1);
  });

  it('starts a fresh lifetime on a new login', () => {
    const { store, onExpired } = setup();
    store.logIn(profile);
    vi.advanceTimersByTime(SESSION_LIFETIME_MS - 1000);

    store.logIn(profile);
    vi.advanceTimersByTime(SESSION_LIFETIME_MS - 1);

    expect(store.getState().status).toBe('authenticated');
    expect(onExpired).not.toHaveBeenCalled();
  });
});
