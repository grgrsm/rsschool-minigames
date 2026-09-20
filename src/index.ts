import './styles/main.scss';

import type { GamesResponse } from '@/types/game';
import type { LeaderboardResponse } from '@/types/leaderboard';
import { createAuthDialog } from '@/components/auth-dialog/auth-dialog';
import { createBurgerMenu } from '@/components/burger-menu/burger-menu';
import { createDevSection } from '@/components/dev-section/dev-section';
import { createFooter } from '@/components/footer/footer';
import { createHeader } from '@/components/header/header';
import { createHero } from '@/components/hero/hero';
import { createLeaderboard } from '@/components/leaderboard/leaderboard';
import { createNewGamesSection } from '@/components/new-games/new-games';
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
  main.append(
    createHero(),
    createNewGamesSection(games),
    createLeaderboard(players),
    createDevSection(),
  );

  root.append(header, burgerMenu.element, main, createFooter());
}

mountApp();