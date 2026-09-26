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
import { getRouteFromHash, updateActiveNavLinks } from '@/router';
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

  function renderRoute(): void {
    cleanupCurrentRoute?.();
    cleanupCurrentRoute = null;

    const route = getRouteFromHash(window.location.hash);
    const onDetails = (game: GameItem) => gameDetailsDialog.open(game);

    if (route === 'library') {
      main.replaceChildren(createLibraryPage(games, onDetails));
    } else {
      const home = createHomeMain(games, players, onDetails);
      main.replaceChildren(home.element);
      cleanupCurrentRoute = home.destroy;
    }

    updateActiveNavLinks(route);
  }

  window.addEventListener('hashchange', renderRoute);
  renderRoute();
}

mountApp();
