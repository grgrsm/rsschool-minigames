import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerWithEmail, signInWithEmail } from '@/auth/email-auth';

const mocks = vi.hoisted(() => ({
  signIn: vi.fn<(auth: unknown, email: string, password: string) => Promise<{ user: unknown }>>(),
  createUser:
    vi.fn<(auth: unknown, email: string, password: string) => Promise<{ user: unknown }>>(),
  updateProfile: vi.fn<(user: unknown, profile: { displayName: string }) => Promise<void>>(),
  signOut: vi.fn<(auth: unknown) => Promise<void>>(),
  firebaseAuth: { name: 'firebase-auth' },
}));

vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: mocks.signIn,
  createUserWithEmailAndPassword: mocks.createUser,
  updateProfile: mocks.updateProfile,
  signOut: mocks.signOut,
}));
vi.mock('@/firebase/firebase', () => ({ auth: mocks.firebaseAuth }));

beforeEach(() => {
  mocks.signIn.mockReset();
  mocks.createUser.mockReset();
  mocks.updateProfile.mockReset().mockResolvedValue(undefined);
  mocks.signOut.mockReset().mockResolvedValue(undefined);
});

describe('signInWithEmail', () => {
  it('signs in with the typed credentials and uses the account profile', async () => {
    mocks.signIn.mockResolvedValue({
      user: { displayName: 'Alex', email: 'alex@school.dev', photoURL: null },
    });

    await expect(signInWithEmail('alex@school.dev', 'Secret1!')).resolves.toEqual({
      displayName: 'Alex',
      email: 'alex@school.dev',
    });
    expect(mocks.signIn).toHaveBeenCalledWith(mocks.firebaseAuth, 'alex@school.dev', 'Secret1!');
  });

  it('falls back to the email name for an account that never saved a display name', async () => {
    mocks.signIn.mockResolvedValue({
      user: { displayName: null, email: 'alex.gamer@school.dev', photoURL: null },
    });

    await expect(signInWithEmail('alex.gamer@school.dev', 'Secret1!')).resolves.toMatchObject({
      displayName: 'alex.gamer',
    });
  });

  it('passes a wrong password on to the caller', async () => {
    const failure = Object.assign(new Error('bad'), { code: 'auth/invalid-credential' });
    mocks.signIn.mockRejectedValue(failure);

    await expect(signInWithEmail('alex@school.dev', 'nope')).rejects.toBe(failure);
  });
});

describe('registerWithEmail', () => {
  it('creates the account and saves the username as the display name', async () => {
    const user = { displayName: null, email: 'alex@school.dev', photoURL: null };
    mocks.createUser.mockResolvedValue({ user });

    await expect(registerWithEmail('Alex1', 'alex@school.dev', 'Secret1!')).resolves.toEqual({
      displayName: 'Alex1',
      email: 'alex@school.dev',
    });
    expect(mocks.createUser).toHaveBeenCalledWith(
      mocks.firebaseAuth,
      'alex@school.dev',
      'Secret1!',
    );
    expect(mocks.updateProfile).toHaveBeenCalledWith(user, { displayName: 'Alex1' });
  });

  it('still starts the session when only saving the display name fails', async () => {
    mocks.createUser.mockResolvedValue({
      user: { displayName: null, email: 'alex@school.dev', photoURL: null },
    });
    mocks.updateProfile.mockRejectedValue(new Error('offline'));

    await expect(registerWithEmail('Alex1', 'alex@school.dev', 'Secret1!')).resolves.toMatchObject({
      displayName: 'Alex1',
    });
  });

  it('passes an existing email on to the caller', async () => {
    const failure = Object.assign(new Error('taken'), { code: 'auth/email-already-in-use' });
    mocks.createUser.mockRejectedValue(failure);

    await expect(registerWithEmail('Alex1', 'alex@school.dev', 'Secret1!')).rejects.toBe(failure);
    expect(mocks.updateProfile).not.toHaveBeenCalled();
  });

  it('falls back to the typed email when Firebase does not echo it back', async () => {
    mocks.createUser.mockResolvedValue({
      user: { displayName: null, email: null, photoURL: null },
    });

    await expect(registerWithEmail('Alex1', 'alex@school.dev', 'Secret1!')).resolves.toMatchObject({
      email: 'alex@school.dev',
    });
  });
});

describe('accounts without a usable email', () => {
  it('signs out and rejects instead of starting a session without an email', async () => {
    mocks.signIn.mockResolvedValue({ user: { displayName: 'Alex', email: null, photoURL: null } });

    await expect(signInWithEmail('', 'Secret1!')).rejects.toMatchObject({
      code: 'app/missing-email',
    });
    expect(mocks.signOut).toHaveBeenCalledWith(mocks.firebaseAuth);
  });

  it('still rejects with the missing-email error if that sign-out fails too', async () => {
    mocks.signIn.mockResolvedValue({ user: { displayName: 'Alex', email: null, photoURL: null } });
    mocks.signOut.mockRejectedValue(new Error('offline'));

    await expect(signInWithEmail('', 'Secret1!')).rejects.toMatchObject({
      code: 'app/missing-email',
    });
  });
});
