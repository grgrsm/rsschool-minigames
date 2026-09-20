import type { AuthUser, SessionState } from '@/types/auth';

type Listener = (state: SessionState) => void;

/**
 * Tiny observable store — enough to keep Header and Auth Dialog in sync
 * without pulling in a state-management library for a single value.
 */
class SessionStore {
  private state: SessionState = { status: 'guest' };
  private listeners = new Set<Listener>();

  getState(): SessionState {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  logIn(user: AuthUser): void {
    this.state = { status: 'authenticated', user };
    this.emit();
  }

  logOut(): void {
    this.state = { status: 'guest' };
    this.emit();
  }
}

export const sessionStore = new SessionStore();

export function getInitials(fullName: string): string {
  return fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}
