import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createModalCoordinator } from '@/app/modal-coordinator';
import type { ModalCoordinator } from '@/app/modal-coordinator';
import { ApiError } from '@/api/apiService';
import type { SessionState } from '@/types/auth';
import type { GameDetails } from '@/types/game';

const game = { slug: 'tetris', name: 'Tetris' } as GameDetails;
const otherGame = { slug: 'chess', name: 'Chess' } as GameDetails;

const alex: SessionState = {
  status: 'authenticated',
  user: { fullName: 'Alex Gamer', initials: 'AG', email: 'alex@minigames.com' },
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

const authDialog = { open: vi.fn<(tab: string) => void>(), close: vi.fn<() => void>() };
const gameDialog = {
  openLoading: vi.fn<(slug: string) => void>(),
  open: vi.fn<(details: GameDetails) => void>(),
  showError: vi.fn<(message: string, onRetry: () => void) => void>(),
  showNotFound: vi.fn<() => void>(),
  close: vi.fn<() => void>(),
};
const fetchGame =
  vi.fn<
    (slug: string, options: { userEmail?: string; signal: AbortSignal }) => Promise<GameDetails>
  >();
const clearAuthParam = vi.fn<() => void>();
const notify = vi.fn<(message: string, variant: 'warning') => void>();

let session: SessionState;
let signedIn: boolean;
let coordinator: ModalCoordinator;

/** What the coordinator passes to `fetchGame`: the user's email (if any) and an abort signal. */
function fetchOptions(userEmail?: string) {
  return { userEmail, signal: expect.any(AbortSignal) as AbortSignal };
}

function at(search: string): URLSearchParams {
  return new URLSearchParams(search);
}

beforeEach(() => {
  for (const mock of [
    ...Object.values(authDialog),
    ...Object.values(gameDialog),
    fetchGame,
    clearAuthParam,
    notify,
  ]) {
    mock.mockReset();
  }
  fetchGame.mockResolvedValue(game);
  session = { status: 'guest' };
  signedIn = false;
  coordinator = createModalCoordinator({
    authDialog,
    gameDialog,
    fetchGame,
    getSessionState: () => session,
    isAuthenticated: () => signedIn,
    clearAuthParam,
    notify,
  });
});

describe('game dialog', () => {
  it('loads and shows the game from a deep link', async () => {
    coordinator.sync(at('?game=tetris'));

    expect(gameDialog.openLoading).toHaveBeenCalledWith('tetris');
    await vi.waitFor(() => {
      expect(gameDialog.open).toHaveBeenCalledWith(game);
    });
  });

  it('requests the game without an email for a guest', () => {
    coordinator.sync(at('?game=tetris'));

    expect(fetchGame).toHaveBeenCalledWith('tetris', fetchOptions());
  });

  it('requests the game with the email of a signed-in user', () => {
    session = alex;

    coordinator.sync(at('?game=tetris'));

    expect(fetchGame).toHaveBeenCalledWith('tetris', fetchOptions('alex@minigames.com'));
  });

  it('does nothing when the URL did not change', () => {
    coordinator.sync(at('?game=tetris'));
    coordinator.sync(at('?game=tetris&page=2'));

    expect(gameDialog.openLoading).toHaveBeenCalledTimes(1);
  });

  it('closes the dialog when the game leaves the URL', () => {
    coordinator.sync(at('?game=tetris'));

    coordinator.sync(at(''));

    expect(gameDialog.close).toHaveBeenCalledTimes(1);
  });

  it('shows Game Not Found for an unknown slug', async () => {
    fetchGame.mockRejectedValue(new ApiError('missing', 'http', 404));

    coordinator.sync(at('?game=nope'));

    await vi.waitFor(() => {
      expect(gameDialog.showNotFound).toHaveBeenCalledTimes(1);
    });
    expect(gameDialog.showError).not.toHaveBeenCalled();
  });

  it('shows the real cause of a failed request', async () => {
    fetchGame.mockRejectedValue(new ApiError('Network error', 'network'));

    coordinator.sync(at('?game=tetris'));

    await vi.waitFor(() => {
      expect(gameDialog.showError).toHaveBeenCalledTimes(1);
    });
    expect(gameDialog.showError.mock.calls[0]?.[0]).toEqual(expect.any(String));
    expect(gameDialog.showNotFound).not.toHaveBeenCalled();
  });

  it('explains an unexpected error', async () => {
    fetchGame.mockRejectedValue(new Error('bad shape'));

    coordinator.sync(at('?game=tetris'));

    await vi.waitFor(() => {
      expect(gameDialog.showError).toHaveBeenCalledWith(
        'Unexpected error: bad shape',
        expect.any(Function),
      );
    });
  });

  it('explains a thrown value that is not an Error', async () => {
    fetchGame.mockRejectedValue('weird');

    coordinator.sync(at('?game=tetris'));

    await vi.waitFor(() => {
      expect(gameDialog.showError).toHaveBeenCalledWith(
        'Unexpected error: weird',
        expect.any(Function),
      );
    });
  });

  it('retries the same game when Retry is pressed', async () => {
    fetchGame.mockRejectedValueOnce(new ApiError('Network error', 'network'));
    coordinator.sync(at('?game=tetris'));
    await vi.waitFor(() => {
      expect(gameDialog.showError).toHaveBeenCalledTimes(1);
    });

    fetchGame.mockResolvedValueOnce(game);
    gameDialog.showError.mock.calls[0]?.[1]();

    expect(fetchGame).toHaveBeenCalledTimes(2);
    expect(gameDialog.openLoading).toHaveBeenCalledTimes(2);
    await vi.waitFor(() => {
      expect(gameDialog.open).toHaveBeenCalledWith(game);
    });
  });

  it('ignores the answer for a game that is no longer requested', async () => {
    const first = deferred<GameDetails>();
    fetchGame.mockReturnValueOnce(first.promise).mockResolvedValueOnce(otherGame);

    coordinator.sync(at('?game=tetris'));
    coordinator.sync(at('?game=chess'));
    first.resolve(game);
    await vi.waitFor(() => {
      expect(gameDialog.open).toHaveBeenCalledWith(otherGame);
    });

    expect(gameDialog.open).not.toHaveBeenCalledWith(game);
  });

  it('ignores a request that was cancelled by closing the dialog', async () => {
    const pending = deferred<GameDetails>();
    fetchGame.mockReturnValue(pending.promise);
    coordinator.sync(at('?game=tetris'));

    coordinator.sync(at(''));
    pending.reject(new DOMException('', 'AbortError'));
    await Promise.resolve();
    await Promise.resolve();

    expect(gameDialog.showError).not.toHaveBeenCalled();
    expect(gameDialog.open).not.toHaveBeenCalled();
  });
});

describe('auth dialog', () => {
  it('opens for a guest from a deep link', () => {
    coordinator.sync(at('?auth=register'));

    expect(authDialog.open).toHaveBeenCalledWith('register');
    expect(clearAuthParam).not.toHaveBeenCalled();
  });

  it('closes when the parameter leaves the URL', () => {
    coordinator.sync(at('?auth=login'));

    coordinator.sync(at(''));

    expect(authDialog.close).toHaveBeenCalledTimes(1);
  });

  it('switches tabs without closing', () => {
    coordinator.sync(at('?auth=login'));

    coordinator.sync(at('?auth=register'));

    expect(authDialog.open).toHaveBeenLastCalledWith('register');
    expect(authDialog.close).not.toHaveBeenCalled();
  });

  it('ignores an unknown tab', () => {
    coordinator.sync(at('?auth=nonsense'));

    expect(authDialog.open).not.toHaveBeenCalled();
  });

  it('never opens for a signed-in user: one Snackbar and the parameter is removed', () => {
    signedIn = true;
    session = alex;

    coordinator.sync(at('?auth=login'));

    expect(authDialog.open).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith('You are already logged in.', 'warning');
    expect(clearAuthParam).toHaveBeenCalledTimes(1);
  });

  it('does not repeat the Snackbar when the cleaned URL is processed', () => {
    signedIn = true;
    session = alex;
    coordinator.sync(at('?auth=register'));

    coordinator.sync(at(''));

    expect(notify).toHaveBeenCalledTimes(1);
    expect(authDialog.close).not.toHaveBeenCalled();
  });

  it('opens once an expired session has been recovered into a guest', () => {
    signedIn = false;
    session = { status: 'guest' };

    coordinator.sync(at('?auth=login'));

    expect(authDialog.open).toHaveBeenCalledWith('login');
    expect(notify).not.toHaveBeenCalled();
  });
});

describe('Auth on top of Game Details', () => {
  it('shows only one dialog: the game steps aside while Auth is open', () => {
    coordinator.sync(at('?game=tetris'));

    coordinator.sync(at('?game=tetris&auth=login'));

    expect(gameDialog.close).toHaveBeenCalledTimes(1);
    expect(authDialog.open).toHaveBeenCalledWith('login');
  });

  it('shows the game again, reloaded as a guest, when Auth is cancelled', () => {
    coordinator.sync(at('?game=tetris'));
    coordinator.sync(at('?game=tetris&auth=login'));
    gameDialog.openLoading.mockClear();
    fetchGame.mockClear();

    coordinator.sync(at('?game=tetris'));

    expect(authDialog.close).toHaveBeenCalledTimes(1);
    expect(gameDialog.openLoading).toHaveBeenCalledWith('tetris');
    expect(fetchGame).toHaveBeenCalledWith('tetris', fetchOptions());
  });

  it('shows the game again, reloaded as the signed-in user, after a successful login', () => {
    coordinator.sync(at('?game=tetris'));
    coordinator.sync(at('?game=tetris&auth=login'));
    fetchGame.mockClear();

    session = alex;
    coordinator.sync(at('?game=tetris'));

    expect(fetchGame).toHaveBeenCalledWith('tetris', fetchOptions('alex@minigames.com'));
  });

  it('does not touch the game URL itself', () => {
    coordinator.sync(at('?game=tetris'));
    coordinator.sync(at('?game=tetris&auth=login'));

    expect(clearAuthParam).not.toHaveBeenCalled();
  });

  it('opens Auth first for a deep link that has both, and the game after it closes', () => {
    coordinator.sync(at('?game=tetris&auth=login'));

    expect(authDialog.open).toHaveBeenCalledWith('login');
    expect(gameDialog.openLoading).not.toHaveBeenCalled();
    expect(gameDialog.close).not.toHaveBeenCalled();

    coordinator.sync(at('?game=tetris'));

    expect(gameDialog.openLoading).toHaveBeenCalledWith('tetris');
  });

  it('abandons the game when Back leaves both parameters at once', () => {
    coordinator.sync(at('?game=tetris'));
    coordinator.sync(at('?game=tetris&auth=login'));

    coordinator.sync(at(''));

    expect(gameDialog.close).toHaveBeenCalledTimes(2);
    expect(gameDialog.openLoading).toHaveBeenCalledTimes(1);
  });

  it('loads a different game directly when the URL jumps to it', async () => {
    coordinator.sync(at('?game=tetris'));
    coordinator.sync(at('?game=tetris&auth=login'));
    fetchGame.mockResolvedValue(otherGame);

    coordinator.sync(at('?game=chess'));

    expect(gameDialog.openLoading).toHaveBeenLastCalledWith('chess');
    await vi.waitFor(() => {
      expect(gameDialog.open).toHaveBeenCalledWith(otherGame);
    });
  });
});

describe('session changes', () => {
  async function openGame(): Promise<void> {
    coordinator.sync(at('?game=tetris'));
    await vi.waitFor(() => {
      expect(gameDialog.open).toHaveBeenCalledTimes(1);
    });
    gameDialog.openLoading.mockClear();
    fetchGame.mockClear();
  }

  it('refreshes an open game in place when the session ends', async () => {
    session = alex;
    await openGame();
    session = { status: 'guest' };

    coordinator.handleSessionChange();

    expect(fetchGame).toHaveBeenCalledWith('tetris', fetchOptions());
    expect(gameDialog.openLoading).not.toHaveBeenCalled();
    await vi.waitFor(() => {
      expect(gameDialog.open).toHaveBeenCalledTimes(2);
    });
  });

  it('keeps what is on screen if the background refresh fails', async () => {
    await openGame();
    fetchGame.mockRejectedValue(new ApiError('Network error', 'network'));

    coordinator.handleSessionChange();
    await Promise.resolve();
    await Promise.resolve();

    expect(gameDialog.showError).not.toHaveBeenCalled();
    expect(gameDialog.showNotFound).not.toHaveBeenCalled();
  });

  it('does nothing without an open game', () => {
    coordinator.handleSessionChange();

    expect(fetchGame).not.toHaveBeenCalled();
  });

  it('waits while Auth is on top, because closing it reloads the game anyway', async () => {
    await openGame();
    coordinator.sync(at('?game=tetris&auth=login'));

    coordinator.handleSessionChange();

    expect(fetchGame).not.toHaveBeenCalled();
  });
});
