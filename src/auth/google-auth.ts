import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { MISSING_EMAIL_CODE, createAuthError } from '@/auth/auth-errors';
import { toSessionProfile } from '@/auth/auth-profile';
import { auth } from '@/firebase/firebase';
import type { SessionProfile } from '@/state/session-store';

/**
 * Opens the Google account chooser in a popup and resolves with the profile for the app session.
 * Rejects with a Firebase error (e.g. `auth/popup-closed-by-user`) if the flow fails or is cancelled.
 */
export async function signInWithGoogle(): Promise<SessionProfile> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  const { user } = await signInWithPopup(auth, provider);

  const profile = toSessionProfile(user);
  if (profile === null) {
    await signOut(auth).catch(() => undefined);
    throw createAuthError(MISSING_EMAIL_CODE);
  }

  return profile;
}
