import type { SessionProfile } from '@/state/session-store';

/** The fields of a Firebase user the app cares about. */
export interface ProviderUser {
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

const FALLBACK_NAME = 'Player';

/**
 * Maps a provider user to the profile stored in the app session.
 * Returns `null` when there is no email — a session cannot be created without one.
 */
export function toSessionProfile(user: ProviderUser): SessionProfile | null {
  const email = user.email?.trim() ?? '';
  if (email === '') {
    return null;
  }

  const profile: SessionProfile = {
    displayName: user.displayName?.trim() || email.split('@')[0] || FALLBACK_NAME,
    email,
  };

  const avatarUrl = user.photoURL?.trim() ?? '';
  if (avatarUrl !== '') {
    profile.avatarUrl = avatarUrl;
  }

  return profile;
}
