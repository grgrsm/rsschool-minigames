import { describe, expect, it } from 'vitest';
import { MISSING_EMAIL_CODE, createAuthError, describeAuthError } from '@/auth/auth-errors';

describe('describeAuthError', () => {
  it.each(['auth/popup-closed-by-user', 'auth/cancelled-popup-request', 'auth/user-cancelled'])(
    'treats %s as a cancellation',
    (code) => {
      expect(describeAuthError({ code }).cancelled).toBe(true);
    },
  );

  it.each([
    ['auth/popup-blocked', 'Allow popups'],
    ['auth/network-request-failed', 'Network error'],
    ['auth/unauthorized-domain', 'not authorized'],
    ['auth/operation-not-allowed', 'not enabled'],
    ['auth/too-many-requests', 'Too many attempts'],
    ['auth/account-exists-with-different-credential', 'already exists'],
    [MISSING_EMAIL_CODE, 'did not provide an email'],
  ])('explains %s without calling it a cancellation', (code, fragment) => {
    const failure = describeAuthError({ code });
    expect(failure.cancelled).toBe(false);
    expect(failure.message).toContain(fragment);
  });

  it('falls back to a generic message for an unknown code', () => {
    expect(describeAuthError({ code: 'auth/something-new' })).toEqual({
      cancelled: false,
      message: 'Google sign-in failed. Please try again.',
    });
  });

  it.each([null, undefined, 'boom', 42, new Error('no code'), { code: 7 }])(
    'falls back to a generic message for %s',
    (error) => {
      expect(describeAuthError(error)).toEqual({
        cancelled: false,
        message: 'Google sign-in failed. Please try again.',
      });
    },
  );
});

describe('createAuthError', () => {
  it('carries the code like a Firebase error does', () => {
    const error = createAuthError(MISSING_EMAIL_CODE);
    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe('app/missing-email');
    expect(describeAuthError(error).cancelled).toBe(false);
  });
});
