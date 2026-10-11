import { describe, expect, it } from 'vitest';
import {
  APP_SESSION_KEY,
  SESSION_LIFETIME_MS,
  clearAppSession,
  isSessionExpired,
  parseAppSession,
  readAppSession,
  saveAppSession,
} from '@/state/app-session';
import type { SessionStorage } from '@/state/app-session';
import type { AppSession } from '@/types/auth';

const NOW = 1_700_000_000_000;

const session: AppSession = {
  displayName: 'Alex Gamer',
  email: 'alex@minigames.com',
  authenticatedAt: NOW,
};

function createMemoryStorage(entries: [string, string][] = []): SessionStorage {
  const map = new Map<string, string>(entries);
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}

function createBrokenStorage(): SessionStorage {
  const fail = (): never => {
    throw new Error('Storage is unavailable');
  };
  return { getItem: fail, setItem: fail, removeItem: fail };
}

describe('parseAppSession', () => {
  it('parses a session without an avatar', () => {
    expect(parseAppSession(JSON.stringify(session))).toEqual(session);
  });

  it('keeps the avatar url when it is present', () => {
    const withAvatar = { ...session, avatarUrl: 'https://example.com/a.png' };
    expect(parseAppSession(JSON.stringify(withAvatar))).toEqual(withAvatar);
  });

  it('drops unrelated fields', () => {
    const raw = JSON.stringify({ ...session, password: 'secret', token: 'abc' });
    expect(parseAppSession(raw)).toEqual(session);
  });

  it.each(['not json', '{broken', '', 'null', '[]', '"text"', '42'])(
    'rejects a value that is not a JSON object: %s',
    (raw) => {
      expect(parseAppSession(raw)).toBeNull();
    },
  );

  it.each(['displayName', 'email', 'authenticatedAt'])('rejects a missing %s', (field) => {
    const data: { [key: string]: unknown } = { ...session };
    delete data[field];
    expect(parseAppSession(JSON.stringify(data))).toBeNull();
  });

  it('rejects fields of the wrong type', () => {
    expect(parseAppSession(JSON.stringify({ ...session, displayName: 42 }))).toBeNull();
    expect(parseAppSession(JSON.stringify({ ...session, email: null }))).toBeNull();
    expect(
      parseAppSession(JSON.stringify({ ...session, authenticatedAt: '1700000000000' })),
    ).toBeNull();
    expect(parseAppSession(JSON.stringify({ ...session, avatarUrl: 5 }))).toBeNull();
  });

  it('rejects a blank display name or email', () => {
    expect(parseAppSession(JSON.stringify({ ...session, displayName: '   ' }))).toBeNull();
    expect(parseAppSession(JSON.stringify({ ...session, email: '' }))).toBeNull();
  });
});

describe('isSessionExpired', () => {
  it('is active while the age is below the lifetime', () => {
    expect(isSessionExpired(NOW, NOW)).toBe(false);
    expect(isSessionExpired(NOW, NOW + SESSION_LIFETIME_MS - 1)).toBe(false);
  });

  it('expires exactly when the lifetime ends', () => {
    expect(isSessionExpired(NOW, NOW + SESSION_LIFETIME_MS)).toBe(true);
    expect(isSessionExpired(NOW, NOW + SESSION_LIFETIME_MS + 1)).toBe(true);
  });

  it('treats a timestamp in the future as expired', () => {
    expect(isSessionExpired(NOW + 1, NOW)).toBe(true);
  });

  it('uses a lifetime of 5 minutes', () => {
    expect(SESSION_LIFETIME_MS).toBe(300_000);
  });
});

describe('readAppSession', () => {
  it('reports none when nothing is stored', () => {
    expect(readAppSession(createMemoryStorage(), NOW)).toEqual({ status: 'none' });
  });

  it('reports none when storage is unavailable', () => {
    expect(readAppSession(createBrokenStorage(), NOW)).toEqual({ status: 'none' });
  });

  it('reports invalid for broken or incomplete data', () => {
    const broken = createMemoryStorage([[APP_SESSION_KEY, '{oops']]);
    const incomplete = createMemoryStorage([
      [APP_SESSION_KEY, JSON.stringify({ email: 'a@b.co' })],
    ]);
    expect(readAppSession(broken, NOW)).toEqual({ status: 'invalid' });
    expect(readAppSession(incomplete, NOW)).toEqual({ status: 'invalid' });
  });

  it('reports expired once the lifetime has passed', () => {
    const storage = createMemoryStorage([[APP_SESSION_KEY, JSON.stringify(session)]]);
    expect(readAppSession(storage, NOW + SESSION_LIFETIME_MS)).toEqual({ status: 'expired' });
  });

  it('returns the stored session untouched while it is active', () => {
    const storage = createMemoryStorage([[APP_SESSION_KEY, JSON.stringify(session)]]);
    const later = NOW + SESSION_LIFETIME_MS - 1000;
    expect(readAppSession(storage, later)).toEqual({ status: 'active', session });
  });

  it('ignores other keys', () => {
    const storage = createMemoryStorage([['user', JSON.stringify(session)]]);
    expect(readAppSession(storage, NOW)).toEqual({ status: 'none' });
  });
});

describe('saveAppSession', () => {
  it('stores one JSON object under the namespaced key', () => {
    const storage = createMemoryStorage();
    saveAppSession(storage, session);
    expect(APP_SESSION_KEY).toBe('minigames:rsschool-minigames:app-session');
    expect(JSON.parse(storage.getItem(APP_SESSION_KEY) ?? 'null')).toEqual(session);
  });

  it('stores the avatar url only when it exists', () => {
    const storage = createMemoryStorage();
    saveAppSession(storage, { ...session, avatarUrl: 'https://example.com/a.png' });
    expect(storage.getItem(APP_SESSION_KEY)).toContain('avatarUrl');

    saveAppSession(storage, session);
    expect(storage.getItem(APP_SESSION_KEY)).not.toContain('avatarUrl');
  });

  it('never stores fields outside the session shape', () => {
    const storage = createMemoryStorage();
    const withExtras = { ...session, password: 'secret', idToken: 'abc' };
    saveAppSession(storage, withExtras);
    const stored = storage.getItem(APP_SESSION_KEY) ?? '';
    expect(stored).not.toContain('secret');
    expect(stored).not.toContain('idToken');
  });

  it('can be read back as an active session', () => {
    const storage = createMemoryStorage();
    saveAppSession(storage, session);
    expect(readAppSession(storage, NOW + 1000)).toEqual({ status: 'active', session });
  });

  it('does not throw when storage is unavailable', () => {
    expect(() => saveAppSession(createBrokenStorage(), session)).not.toThrow();
  });
});

describe('clearAppSession', () => {
  it('removes only the app session key', () => {
    const storage = createMemoryStorage([
      [APP_SESSION_KEY, JSON.stringify(session)],
      ['theme', 'dark'],
    ]);
    clearAppSession(storage);
    expect(storage.getItem(APP_SESSION_KEY)).toBeNull();
    expect(storage.getItem('theme')).toBe('dark');
  });

  it('does not throw when storage is unavailable', () => {
    expect(() => clearAppSession(createBrokenStorage())).not.toThrow();
  });
});
