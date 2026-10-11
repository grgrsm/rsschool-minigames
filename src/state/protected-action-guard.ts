import type { AuthUser, SessionState } from '@/types/auth';

export interface ProtectedActionGuardDeps {
  /** Re-checks the stored session, ending it if it expired. Returns `true` while it is active. */
  validate: () => boolean;
  getState: () => SessionState;
  /**
   * Called when the action may not run. `expired` is true when the user *was* signed in a
   * moment ago, in which case the session store has already announced the expiration.
   */
  onUnauthenticated: (details: { expired: boolean }) => void;
}

/**
 * Builds the check every protected action (favorite, comment, comment like) runs first.
 * Returns the signed-in user, or `null` after asking the user to authenticate — in which
 * case the action must not send any request.
 */
export function createProtectedActionGuard(deps: ProtectedActionGuardDeps): () => AuthUser | null {
  return () => {
    const wasAuthenticated = deps.getState().status === 'authenticated';

    if (deps.validate()) {
      const state = deps.getState();
      if (state.status === 'authenticated') {
        return state.user;
      }
    }

    deps.onUnauthenticated({ expired: wasAuthenticated });
    return null;
  };
}
