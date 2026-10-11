import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import { MISSING_EMAIL_CODE, createAuthError } from '@/auth/auth-errors';
import { toSessionProfile } from '@/auth/auth-profile';
import { auth } from '@/firebase/firebase';
import type { SessionProfile } from '@/state/session-store';

async function toProfileOrFail(
  user: Pick<User, 'displayName' | 'email' | 'photoURL'>,
): Promise<SessionProfile> {
  const profile = toSessionProfile(user);
  if (profile === null) {
    await signOut(auth).catch(() => undefined);
    throw createAuthError(MISSING_EMAIL_CODE);
  }
  return profile;
}

/** Signs an existing user in. Rejects with a Firebase error (e.g. `auth/invalid-credential`). */
export async function signInWithEmail(email: string, password: string): Promise<SessionProfile> {
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  return toProfileOrFail({
    displayName: user.displayName,
    email: user.email ?? email,
    photoURL: user.photoURL,
  });
}

/**
 * Creates the account and stores the chosen username as the Firebase `displayName`.
 * If only saving the name fails, the account already exists, so the session still starts
 * with the username the user picked rather than leaving them unable to register again.
 */
export async function registerWithEmail(
  username: string,
  email: string,
  password: string,
): Promise<SessionProfile> {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);

  try {
    await updateProfile(user, { displayName: username });
  } catch {
    // Non-fatal, see above.
  }

  return toProfileOrFail({
    displayName: username,
    email: user.email ?? email,
    photoURL: user.photoURL,
  });
}
