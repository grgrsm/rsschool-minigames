import './styles/main.scss';

import { ApiError, apiService, isAbortError } from '@/api/apiService';
import { toGameDetails } from '@/api/mappers';
import type { AuthTab } from '@/types/auth';
import type { GameItem } from '@/types/game';
import { createAuthDialog } from '@/components/auth-dialog/auth-dialog';
import { createBurgerMenu } from '@/components/burger-menu/burger-menu';
import { getErrorMessage } from '@/components/feedback/error-banner';
import { showSnackbar } from '@/components/feedback/snackbar';
import { createFooter } from '@/components/footer/footer';
import { createGameDetailsDialog } from '@/components/game-details-dialog/game-details-dialog';
import { createHeader } from '@/components/header/header';
import { createHomeMain } from '@/pages/home/home';
import { createLibraryPage } from '@/pages/library/library';
import { createNotFoundPage } from '@/pages/not-found/not-found';
import {
  getAuthTab,
  getGameSlug,
  getLocation,
  initRouter,
  openAuthModal,
  openGameModal,
  subscribe,
  updateActiveNavLinks,
} from '@/router';
import type { RouteLocation } from '@/router';
import { sessionStore } from '@/state/session-store';

function getAppRoot(): HTMLElement {
  const root = document.getElementById('app');
  if (!root) {
    throw new Error('Root element #app was not found.');
  }
  return root;
}

function mountApp(): void {
  const root = getAppRoot();

  const authDialog = createAuthDialog();
  const gameDetailsDialog = createGameDetailsDialog();

  // Same reasoning as `onDetails` below: go through the URL, not `authDialog.open()`
  // directly, so `?auth=login`/`?auth=register` stays the single source of truth.
  const burgerMenu = createBurgerMenu({
    onLoginClick: () => openAuthModal('login'),
    onSignUpClick: () => openAuthModal('register'),
    onLogOutClick: () => sessionStore.logOut(),
  });

  const header = createHeader({
    onAuthClick: (tab: AuthTab) => openAuthModal(tab),
    onLogOutClick: () => sessionStore.logOut(),
    onBurgerClick: () => burgerMenu.open(),
  });

  const main = document.createElement('main');
  root.append(header, burgerMenu.element, main, createFooter());

  let cleanupCurrentRoute: (() => void) | null = null;
  let currentGameSlug: string | null = null;
  let gameModalController: AbortController | null = null;
  let currentAuthTab: AuthTab | null = null;

  /** Deep link / Back-Forward for `?auth=login|register`, independent from the active page. */
  function syncAuthModal(params: URLSearchParams): void {
    const tab = getAuthTab(params);

    if (tab === currentAuthTab) {
      return;
    }
    currentAuthTab = tab;

    if (tab === null) {
      authDialog.close();
    } else {
      authDialog.open(tab);
    }
  }

  // Always go through the URL rather than calling `gameDetailsDialog.open()` directly:
  // `openGameModal` is what actually shows the dialog (via `syncGameModal` below), and
  // it's also what keeps Back/Forward and deep links consistent with an in-app click.
  const onDetails = (game: GameItem): void => openGameModal(game.slug);

  /** Deep link / Back-Forward for `?game=<slug>`, independent from which page is under it. */
  function syncGameModal(params: URLSearchParams): void {
    const slug = getGameSlug(params);

    if (slug === currentGameSlug) {
      return;
    }
    currentGameSlug = slug;
    gameModalController?.abort();

    if (slug === null) {
      gameDetailsDialog.close();
      return;
    }

    const controller = new AbortController();
    gameModalController = controller;

    gameDetailsDialog.openLoading(slug);

    apiService
      .getGameBySlug(slug, controller.signal)
      .then((dto) => {
        if (controller.signal.aborted) {
          return;
        }
        gameDetailsDialog.open(toGameDetails(dto));
      })
      .catch((error: unknown) => {
        if (isAbortError(error)) {
          return;
        }

        if (error instanceof ApiError && error.isNotFound) {
          // Unknown slug: drop the param rather than leave a broken modal open.
          // There's no content area left to show an error banner in once the dialog
          // closes, so this is exactly what the Snackbar is for.
          currentGameSlug = null;
          gameDetailsDialog.close();
          const url = new URL(location.href);
          url.searchParams.delete('game');
          history.replaceState(history.state, '', `${url.pathname}${url.search}`);
          showSnackbar("This game couldn't be found.", 'error');
          return;
        }

        // Show the real cause (network/timeout/5xx, or an unexpected shape/parse error)
        // instead of one generic sentence — it's the fastest way to tell those apart.
        const message =
          error instanceof ApiError
            ? getErrorMessage(error)
            : `Unexpected error: ${error instanceof Error ? error.message : String(error)}`;

        gameDetailsDialog.showError(
          message,
          () => void syncGameModal(new URLSearchParams(location.search)),
        );
      });
  }

  function renderRoute({ route, params }: RouteLocation): void {
    cleanupCurrentRoute?.();
    cleanupCurrentRoute = null;

    if (route === 'library') {
      const library = createLibraryPage(params, onDetails);
      main.replaceChildren(library.element);
      cleanupCurrentRoute = library.destroy;
    } else if (route === 'home') {
      const home = createHomeMain(onDetails);
      main.replaceChildren(home.element);
      cleanupCurrentRoute = home.destroy;
    } else {
      main.replaceChildren(createNotFoundPage());
    }

    updateActiveNavLinks(route);
    syncGameModal(params);
    syncAuthModal(params);
  }

  initRouter();
  subscribe(renderRoute);
  renderRoute(getLocation());
}

mountApp();
