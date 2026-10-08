import {
  SESSION_LIFETIME_MS,
  clearAppSession,
  readAppSession,
  saveAppSession,
} from '@/state/app-session';
import type { SessionStorage } from '@/state/app-session';
import type { AppSession, AuthUser, SessionState } from '@/types/auth';

type Listener = (state: SessionState) => void;

/** What the identity provider tells us about a freshly authenticated user. */
export interface SessionProfile {
  displayName: string;
  email: string;
  avatarUrl?: string;
}

export interface SessionStoreDeps {
  storage: SessionStorage;
  now: () => number;
  /** Ends the Firebase identity so it cannot bring the user back after the app session ended. */
  signOut: () => Promise<void>;
  /** Called once when a session ends because its lifetime ran out. */
  onExpired: () => void;
}

export function getInitials(fullName: string): string {
  return fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function toAuthUser(session: AppSession): AuthUser {
  const user: AuthUser = {
    fullName: session.displayName,
    initials: getInitials(session.displayName),
    email: session.email,
  };
  return session.avatarUrl === undefined ? user : { ...user, avatarUrl: session.avatarUrl };
}

/**
 * Tiny observable store — enough to keep Header and Auth Dialog in sync
 * without pulling in a state-management library for a single value.
 *
 * The app session (not Firebase's own persisted identity) is the source of truth for
 * whether the UI treats the user as authenticated. It lasts a fixed time from login.
 */
export class SessionStore {
  private state: SessionState = { status: 'guest' };
  private listeners = new Set<Listener>();
  private expiryTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly deps: SessionStoreDeps;

  constructor(deps: SessionStoreDeps) {
    this.deps = deps;
  }

  getState(): SessionState {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  /** Starts a new session after a successful authentication. */
  logIn(profile: SessionProfile): void {
    const session: AppSession = {
      displayName: profile.displayName,
      email: profile.email,
      authenticatedAt: this.deps.now(),
    };
    if (profile.avatarUrl !== undefined) {
      session.avatarUrl = profile.avatarUrl;
    }

    saveAppSession(this.deps.storage, session);
    this.start(session);
  }

  /** Explicit logout: ends the session without any "expired" notification. */
  logOut(): void {
    this.end();
  }

  /**
   * Called once at startup. Restores a still-valid session without extending it,
   * and falls back to Guest Mode for missing, invalid or expired data.
   * Firebase's own persisted user is deliberately ignored.
   */
  restore(): void {
    const stored = readAppSession(this.deps.storage, this.deps.now());

    if (stored.status === 'active') {
      this.start(stored.session);
    } else if (stored.status === 'expired') {
      this.end();
      this.deps.onExpired();
    } else if (stored.status === 'invalid') {
      this.end();
    }
  }

  /**
   * Re-checks the stored session. Returns `true` while the user is still authenticated;
   * otherwise switches to Guest Mode (with one notification if it expired) and returns `false`.
   */
  validate(): boolean {
    if (this.state.status !== 'authenticated') {
      return false;
    }

    const stored = readAppSession(this.deps.storage, this.deps.now());
    if (stored.status === 'active') {
      return true;
    }

    this.end();
    if (stored.status === 'expired') {
      this.deps.onExpired();
    }
    return false;
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  private start(session: AppSession): void {
    this.state = { status: 'authenticated', user: toAuthUser(session) };
    this.scheduleExpiry(session);
    this.emit();
  }

  private end(): void {
    this.cancelExpiry();
    clearAppSession(this.deps.storage);
    this.deps.signOut().catch(() => undefined);

    if (this.state.status === 'authenticated') {
      this.state = { status: 'guest' };
      this.emit();
    }
  }

  /** Switches to Guest Mode at the exact moment the lifetime ends, even without any user action. */
  private scheduleExpiry(session: AppSession): void {
    this.cancelExpiry();

    const remaining = session.authenticatedAt + SESSION_LIFETIME_MS - this.deps.now();
    this.expiryTimer = setTimeout(
      () => {
        this.expiryTimer = null;
        if (!this.validate()) {
          return;
        }

        // Still valid (the timer fired early, or the stored timestamp was moved forward):
        // wait for the stored session's own end instead of the stale captured one.
        const stored = readAppSession(this.deps.storage, this.deps.now());
        if (stored.status === 'active') {
          this.scheduleExpiry(stored.session);
        }
      },
      Math.max(0, remaining),
    );
  }

  private cancelExpiry(): void {
    if (this.expiryTimer !== null) {
      clearTimeout(this.expiryTimer);
      this.expiryTimer = null;
    }
  }
}
