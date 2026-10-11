import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  openAuthModal: vi.fn<(tab: string) => void>(),
  showSnackbar: vi.fn<(message: string, variant?: string) => void>(),
  validate: vi.fn<() => boolean>(),
}));

vi.mock('@/router', () => ({ openAuthModal: mocks.openAuthModal }));
vi.mock('@/components/feedback/snackbar', () => ({ showSnackbar: mocks.showSnackbar }));
vi.mock('@/state/session', () => ({ sessionStore: { validate: mocks.validate } }));

const { openAuthDialog } = await import('@/state/auth-entry');

beforeEach(() => {
  mocks.openAuthModal.mockReset();
  mocks.showSnackbar.mockReset();
  mocks.validate.mockReset();
});

describe('openAuthDialog', () => {
  it('opens the requested tab for a guest', () => {
    mocks.validate.mockReturnValue(false);

    openAuthDialog('register');

    expect(mocks.openAuthModal).toHaveBeenCalledWith('register');
    expect(mocks.showSnackbar).not.toHaveBeenCalled();
  });

  it('tells a signed-in user so instead of opening anything', () => {
    mocks.validate.mockReturnValue(true);

    openAuthDialog('login');

    expect(mocks.openAuthModal).not.toHaveBeenCalled();
    expect(mocks.showSnackbar).toHaveBeenCalledTimes(1);
    expect(mocks.showSnackbar).toHaveBeenCalledWith('You are already logged in.', 'warning');
  });
});
