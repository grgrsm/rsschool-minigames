import './styles/main.scss';

import type { GamesResponse } from '@/types/game';
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

  function renderRoute(): void {
    const route = getRouteFromHash(window.location.hash);
    main.replaceChildren(
      route === 'library'
        ? createLibraryPage(games, (game) => gameDetailsDialog.open(game))
        : createHomeMain(games, players),
    );
    updateActiveNavLinks(route);
  }

  window.addEventListener('hashchange', renderRoute);
  renderRoute();
}

mountApp();
