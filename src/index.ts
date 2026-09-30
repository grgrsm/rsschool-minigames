import './styles/main.scss';

import type { GameItem, GamesResponse } from '@/types/game';
import type { LeaderboardResponse } from '@/types/leaderboard';
import { createAuthDialog } from '@/components/auth-dialog/auth-dialog';
import { createBurgerMenu } from '@/components/burger-menu/burger-menu';
import { createFooter } from '@/components/footer/footer';
import { createGameDetailsDialog } from '@/components/game-details-dialog/game-details-dialog';
import { createHeader } from '@/components/header/header';
import { createHomeMain } from '@/pages/home/home';
import { createLibraryPage } from '@/pages/library/library';
import { createNotFoundPage } from '@/pages/not-found/not-found';
import { getGameSlug, getLocation, initRouter, subscribe, updateActiveNavLinks } from '@/router';
import type { RouteLocation } from '@/router';
import { sessionStore } from '@/state/session-store';

import gamesData from './mocks/games.json';
import leaderboardData from './mocks/leaderboard.json';

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

  const burgerMenu = createBurgerMenu({
    onLoginClick: () => authDialog.open('login'),
    onSignUpClick: () => authDialog.open('register'),
    onLogOutClick: () => sessionStore.logOut(),
  });

  const header = createHeader({
    onAuthClick: (tab) => authDialog.open(tab), // Открывает модалку с переданной вкладкой ('login' или 'register')
    onLogOutClick: () => sessionStore.logOut(),
    onBurgerClick: () => burgerMenu.open(),
  });

  const games = (gamesData as GamesResponse).data;
  const players = (leaderboardData as LeaderboardResponse).data;

  const main = document.createElement('main');
  root.append(header, burgerMenu.element, main, createFooter());

  let cleanupCurrentRoute: (() => void) | null = null;
  let currentGameSlug: string | null = null;

  const onDetails = (game: GameItem): void => gameDetailsDialog.open(game);

  function findGameBySlug(slug: string): GameItem | undefined {
    return games.find((game) => game.slug === slug);
  }

  /** Deep link / Back-Forward for `?game=<slug>`, independent from which page is under it. */
  function syncGameModal(params: URLSearchParams): void {
    const slug = getGameSlug(params);

    if (slug === currentGameSlug) {
      return;
    }
    currentGameSlug = slug;

    if (slug === null) {
      gameDetailsDialog.close();
      return;
    }

    const game = findGameBySlug(slug);
    if (game) {
      gameDetailsDialog.open(game);
    } else {
      // Unknown slug: drop the param rather than show a broken modal.
      currentGameSlug = null;
      history.replaceState(history.state, '', location.pathname);
    }
  }

  function renderRoute({ route, params }: RouteLocation): void {
    cleanupCurrentRoute?.();
    cleanupCurrentRoute = null;

    if (route === 'library') {
      main.replaceChildren(createLibraryPage(games, onDetails));
    } else if (route === 'home') {
      const home = createHomeMain(games, players, onDetails);
      main.replaceChildren(home.element);
      cleanupCurrentRoute = home.destroy;
    } else {
      main.replaceChildren(createNotFoundPage());
    }

    updateActiveNavLinks(route);
    syncGameModal(params);
  }

  initRouter();
  subscribe(renderRoute);
  renderRoute(getLocation());
}

mountApp();
