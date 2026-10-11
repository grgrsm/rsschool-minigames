import { beforeEach, describe, expect, it, vi } from 'vitest';
import { signInWithGoogle } from '@/auth/google-auth';

const { signInWithPopupMock, signOutMock, setCustomParametersMock, firebaseAuth } = vi.hoisted(
  () => ({
    signInWithPopupMock: vi.fn<(auth: unknown, provider: unknown) => Promise<{ user: unknown }>>(),
    signOutMock: vi.fn<(auth: unknown) => Promise<void>>(),
    setCustomParametersMock: vi.fn<(parameters: { [key: string]: string }) => void>(),
    firebaseAuth: { name: 'firebase-auth' },
  }),
);

vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: class {
    setCustomParameters = setCustomParametersMock;
  },
  signInWithPopup: signInWithPopupMock,
  signOut: signOutMock,
}));
vi.mock('@/firebase/firebase', () => ({ auth: firebaseAuth }));

beforeEach(() => {
  signInWithPopupMock.mockReset();
  signOutMock.mockReset();
  signOutMock.mockResolvedValue(undefined);
  setCustomParametersMock.mockReset();
});

describe('signInWithGoogle', () => {
  it('opens the account chooser and resolves with the session profile', async () => {
    signInWithPopupMock.mockResolvedValue({
      user: {
        displayName: 'Alex Gamer',
        email: 'alex@gmail.com',
        photoURL: 'https://x.test/a.png',
      },
    });

    await expect(signInWithGoogle()).resolves.toEqual({
      displayName: 'Alex Gamer',
      email: 'alex@gmail.com',
      avatarUrl: 'https://x.test/a.png',
    });

    expect(setCustomParametersMock).toHaveBeenCalledWith({ prompt: 'select_account' });
    expect(signInWithPopupMock).toHaveBeenCalledTimes(1);
    expect(signInWithPopupMock.mock.calls[0]?.[0]).toBe(firebaseAuth);
    expect(signOutMock).not.toHaveBeenCalled();
  });

  it('signs out of Firebase and rejects when Google returns no email', async () => {
    signInWithPopupMock.mockResolvedValue({
      user: { displayName: 'Alex', email: null, photoURL: null },
    });

    await expect(signInWithGoogle()).rejects.toMatchObject({ code: 'app/missing-email' });
    expect(signOutMock).toHaveBeenCalledWith(firebaseAuth);
  });

  it('still rejects with the missing-email error if the sign-out itself fails', async () => {
    signInWithPopupMock.mockResolvedValue({
      user: { displayName: 'Alex', email: '', photoURL: null },
    });
    signOutMock.mockRejectedValue(new Error('offline'));

    await expect(signInWithGoogle()).rejects.toMatchObject({ code: 'app/missing-email' });
  });

  it('passes a cancelled or failed popup on to the caller', async () => {
    const popupError = Object.assign(new Error('closed'), { code: 'auth/popup-closed-by-user' });
    signInWithPopupMock.mockRejectedValue(popupError);

    await expect(signInWithGoogle()).rejects.toBe(popupError);
    expect(signOutMock).not.toHaveBeenCalled();
  });
});
