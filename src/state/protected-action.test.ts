import { beforeEach, describe, expect, it, vi } from 'vitest';

const { openAuthModalMock, showSnackbarMock, validateMock, getStateMock } = vi.hoisted(() => ({
  openAuthModalMock: vi.fn<(tab: string) => void>(),
  showSnackbarMock: vi.fn<(message: string, variant?: string) => void>(),
  validateMock: vi.fn<() => boolean>(),
  getStateMock: vi.fn<() => unknown>(),
}));

vi.mock('@/router', () => ({ openAuthModal: openAuthModalMock }));
vi.mock('@/components/feedback/snackbar', () => ({ showSnackbar: showSnackbarMock }));
vi.mock('@/state/session', () => ({
  sessionStore: { validate: validateMock, getState: getStateMock },
}));

const { requireAuthenticatedUser } = await import('@/state/protected-action');

const user = { fullName: 'Alex Gamer', initials: 'AG', email: 'alex@minigames.com' };

beforeEach(() => {
  openAuthModalMock.mockClear();
  showSnackbarMock.mockClear();
  validateMock.mockReset();
  getStateMock.mockReset();
});

describe('requireAuthenticatedUser', () => {
  it('lets an authenticated user through without opening Auth', () => {
    getStateMock.mockReturnValue({ status: 'authenticated', user });
    validateMock.mockReturnValue(true);

    expect(requireAuthenticatedUser()).toEqual(user);
    expect(openAuthModalMock).not.toHaveBeenCalled();
    expect(showSnackbarMock).not.toHaveBeenCalled();
  });

  it('opens Auth with a warning Snackbar for a guest', () => {
    getStateMock.mockReturnValue({ status: 'guest' });
    validateMock.mockReturnValue(false);

    expect(requireAuthenticatedUser()).toBeNull();
    expect(openAuthModalMock).toHaveBeenCalledWith('login');
    expect(showSnackbarMock).toHaveBeenCalledTimes(1);
    expect(showSnackbarMock).toHaveBeenCalledWith('Please log in to use this feature.', 'warning');
  });

  it('opens Auth without a second Snackbar when the session just expired', () => {
    getStateMock.mockReturnValue({ status: 'authenticated', user });
    validateMock.mockReturnValue(false);

    expect(requireAuthenticatedUser()).toBeNull();
    expect(openAuthModalMock).toHaveBeenCalledWith('login');
    expect(showSnackbarMock).not.toHaveBeenCalled();
  });
});
