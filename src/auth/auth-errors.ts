/** Raised when the identity provider returns no usable email address. */
export const MISSING_EMAIL_CODE = 'app/missing-email';

export interface AuthFailure {
  /** The user closed or cancelled the provider flow — not an error worth a notification. */
  cancelled: boolean;
  message: string;
}

const DEFAULT_MESSAGE = 'Google sign-in failed. Please try again.';

const CANCELLED_CODES = new Set([
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
  'auth/user-cancelled',
]);

const MESSAGES = new Map<string, string>([
  [
    'auth/popup-blocked',
    'The sign-in popup was blocked. Allow popups for this site and try again.',
  ],
  ['auth/network-request-failed', 'Network error. Check your connection and try again.'],
  ['auth/unauthorized-domain', 'This website is not authorized for Google sign-in.'],
  ['auth/operation-not-allowed', 'Google sign-in is not enabled for this project.'],
  ['auth/too-many-requests', 'Too many attempts. Please try again later.'],
  [
    'auth/account-exists-with-different-credential',
    'An account with this email already exists. Sign in with your original method.',
  ],
  [MISSING_EMAIL_CODE, 'Your Google account did not provide an email address.'],
]);

/** Creates an error carrying a machine-readable `code`, like Firebase errors do. */
export function createAuthError(code: string): Error & { code: string } {
  return Object.assign(new Error(code), { code });
}

function getErrorCode(error: unknown): string | null {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const { code } = error;
    return typeof code === 'string' ? code : null;
  }
  return null;
}

/** Turns anything thrown by an authentication request into a user-facing result. */
export function describeAuthError(error: unknown): AuthFailure {
  const code = getErrorCode(error);

  if (code !== null && CANCELLED_CODES.has(code)) {
    return { cancelled: true, message: 'Sign-in was cancelled.' };
  }

  return { cancelled: false, message: (code && MESSAGES.get(code)) || DEFAULT_MESSAGE };
}
