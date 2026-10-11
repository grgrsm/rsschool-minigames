import { ApiError, isAbortError } from '@/api/apiService';
import { getErrorMessage } from '@/components/feedback/error-banner';
import { getAuthTab, getGameSlug } from '@/router';
import type { AuthTab, SessionState } from '@/types/auth';
import type { GameDetails } from '@/types/game';

export interface AuthDialogPort {
  open: (tab: AuthTab) => void;
  close: () => void;
}

export interface GameDialogPort {
  openLoading: (slug: string) => void;
  open: (game: GameDetails) => void;
  showError: (message: string, onRetry: () => void) => void;
  showNotFound: () => void;
  /** Closes the dialog without touching the URL. */
  close: () => void;
}

export interface ModalCoordinatorDeps {
  authDialog: AuthDialogPort;
  gameDialog: GameDialogPort;
  fetchGame: (
    slug: string,
    options: { userEmail?: string; signal: AbortSignal },
  ) => Promise<GameDetails>;
  getSessionState: () => SessionState;
  /** Re-checks the session (recovering an expired or invalid one). `true` while signed in. */
  isAuthenticated: () => boolean;
  /** Removes only `auth` from the URL, in place. */
  clearAuthParam: () => void;
  notify: (message: string, variant: 'warning') => void;
}

export interface ModalCoordinator {
  /** Brings both dialogs in line with the URL. Call it on every navigation. */
  sync: (params: URLSearchParams) => void;
  /** Call when the session changed (login, logout, expiration). */
  handleSessionChange: () => void;
}

/**
 * Keeps the Game Details and Auth dialogs in line with `?game=` and `?auth=`:
 * - only one dialog is ever active: Auth takes over from Game Details and hands it back when it
 *   closes, reloading the game so it reflects whether the user is now signed in or still a guest;
 * - an already signed-in user never sees Auth, and `?auth=` is removed from the URL in place;
 * - a session that ends while a game is open refreshes it for a guest.
 */
export function createModalCoordinator(deps: ModalCoordinatorDeps): ModalCoordinator {
  let currentGameSlug: string | null = null;
  let currentAuthTab: AuthTab | null = null;
  let gameController: AbortController | null = null;
  /** Auth is on top of a game that is still in the URL, waiting to be shown again. */
  let isGameSuspended = false;

  function getUserEmail(): string | undefined {
    const state = deps.getSessionState();
    return state.status === 'authenticated' ? state.user.email : undefined;
  }

  /** `silent` refreshes an open game in place instead of showing the loading skeleton. */
  function showGame(slug: string, silent: boolean): void {
    gameController?.abort();
    const controller = new AbortController();
    gameController = controller;

    if (!silent) {
      deps.gameDialog.openLoading(slug);
    }

    deps
      .fetchGame(slug, { userEmail: getUserEmail(), signal: controller.signal })
      .then((game) => {
        if (!controller.signal.aborted) {
          deps.gameDialog.open(game);
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || isAbortError(error) || silent) {
          // Cancelled, or a background refresh that failed: what is on screen stays.
          return;
        }

        if (error instanceof ApiError && error.isNotFound) {
          // The dialog stays open; closing it is what clears the bad slug from the URL.
          deps.gameDialog.showNotFound();
          return;
        }

        // Show the real cause instead of one generic sentence — it is the fastest way to tell
        // network, timeout, 5xx and unexpected-shape problems apart.
        const message =
          error instanceof ApiError
            ? getErrorMessage(error)
            : `Unexpected error: ${error instanceof Error ? error.message : String(error)}`;

        deps.gameDialog.showError(message, () => showGame(slug, false));
      });
  }

  function sync(params: URLSearchParams): void {
    const tab = getAuthTab(params);

    if (tab !== null && deps.isAuthenticated()) {
      // Signed in already: no dialog. Clearing the param re-enters `sync` without it.
      deps.notify('You are already logged in.', 'warning');
      deps.clearAuthParam();
      return;
    }

    const slug = getGameSlug(params);
    const slugChanged = slug !== currentGameSlug;
    const tabChanged = tab !== currentAuthTab;
    currentAuthTab = tab;

    if (slugChanged) {
      currentGameSlug = slug;
      gameController?.abort();
      isGameSuspended = false;

      if (slug === null) {
        deps.gameDialog.close();
      } else if (tab === null) {
        showGame(slug, false);
      } else {
        // `?game=…&auth=…` together: Auth first, the game once Auth closes.
        isGameSuspended = true;
      }
    }

    if (!tabChanged) {
      return;
    }

    if (tab !== null) {
      if (currentGameSlug !== null && !isGameSuspended) {
        gameController?.abort();
        deps.gameDialog.close();
        isGameSuspended = true;
      }
      deps.authDialog.open(tab);
      return;
    }

    deps.authDialog.close();
    if (isGameSuspended && currentGameSlug !== null) {
      isGameSuspended = false;
      showGame(currentGameSlug, false);
    }
  }

  function handleSessionChange(): void {
    if (currentGameSlug === null || isGameSuspended || currentAuthTab !== null) {
      return;
    }
    showGame(currentGameSlug, true);
  }

  return { sync, handleSessionChange };
}
