import './styles/main.scss';

import { apiService } from '@/api/apiService';
import { toGameDetails } from '@/api/mappers';
import { createModalCoordinator } from '@/app/modal-coordinator';
import type { AuthTab } from '@/types/auth';
import type { GameItem } from '@/types/game';
import { createAuthDialog } from '@/components/auth-dialog/auth-dialog';
import { createBurgerMenu } from '@/components/burger-menu/burger-menu';
import { showSnackbar } from '@/components/feedback/snackbar';
import { createFooter } from '@/components/footer/footer';
import { createGameDetailsDialog } from '@/components/game-details-dialog/game-details-dialog';
import { createHeader } from '@/components/header/header';
import '@/firebase/firebase';
import { createHomeMain } from '@/pages/home/home';
import { createLibraryPage } from '@/pages/library/library';
import { createNotFoundPage } from '@/pages/not-found/not-found';
import {
  clearAuthParam,
  getLocation,
  initRouter,
  openGameModal,
  subscribe,
  updateActiveNavLinks,
} from '@/router';
import type { RouteLocation } from '@/router';
import { openAuthDialog } from '@/state/auth-entry';
import { sessionStore } from '@/state/session';
import { watchPageActivity } from '@/state/session-checks';

function getAppRoot(): HTMLElement {
  const root = document.getElementById('app');
  if (!root) {
    throw new Error('Root element #app was not found.');
  }
  return root;
}

function mountApp(): void {
  const root = getAppRoot();

  // Restore (or drop) the stored app session before anything renders, so the very first
  // paint already shows the right Guest/Authenticated state. Re-check whenever the page
  // becomes active again — a session can end while the tab was in the background.
  sessionStore.restore();
  watchPageActivity(() => sessionStore.validate(), document, window);

  const authDialog = createAuthDialog();
  const gameDetailsDialog = createGameDetailsDialog();

  // Same reasoning as `onDetails` below: go through the URL, not `authDialog.open()`
  // directly, so `?auth=login`/`?auth=register` stays the single source of truth.
  const burgerMenu = createBurgerMenu({
    onLoginClick: () => openAuthDialog('login'),
    onSignUpClick: () => openAuthDialog('register'),
    onLogOutClick: () => sessionStore.logOut(),
  });

  const header = createHeader({
    onAuthClick: (tab: AuthTab) => openAuthDialog(tab),
    onLogOutClick: () => sessionStore.logOut(),
    onBurgerClick: () => burgerMenu.open(),
  });

  const main = document.createElement('main');
  root.append(header, burgerMenu.element, main, createFooter());

  let cleanupCurrentRoute: (() => void) | null = null;

  const modals = createModalCoordinator({
    authDialog,
    gameDialog: gameDetailsDialog,
    fetchGame: async (slug, options) =>
      toGameDetails(await apiService.getGameBySlug(slug, options)),
    getSessionState: () => sessionStore.getState(),
    isAuthenticated: () => sessionStore.validate(),
    clearAuthParam,
    notify: showSnackbar,
  });
  sessionStore.subscribe(() => modals.handleSessionChange());

  // Always go through the URL rather than calling `gameDetailsDialog.open()` directly:
  // `openGameModal` is what actually shows the dialog (via `modals.sync` below), and
  // it's also what keeps Back/Forward and deep links consistent with an in-app click.
  const onDetails = (game: GameItem): void => openGameModal(game.slug);

  function renderRoute({ route, params }: RouteLocation): void {
    // Every page and dialog navigation passes through here: an expired session
    // switches to Guest Mode first, and the requested public navigation continues.
    sessionStore.validate();

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
    modals.sync(params);
  }

  initRouter();
  subscribe(renderRoute);
  renderRoute(getLocation());
}

mountApp();
