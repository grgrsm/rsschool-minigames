import type { GameItem } from '@/types/game';
import type { LeaderboardPlayer } from '@/types/leaderboard';
import { createDevSection } from '@/components/dev-section/dev-section';
import { createHero } from '@/components/hero/hero';
import { createLeaderboard } from '@/components/leaderboard/leaderboard';
import { createNewGamesSection } from '@/components/new-games/new-games';

/** Builds the Home route content: Hero → New Games → Leaderboard → Dev section. */
export function createHomeMain(games: GameItem[], players: LeaderboardPlayer[]): DocumentFragment {
  const fragment = document.createDocumentFragment();
  fragment.append(
    createHero(),
    createNewGamesSection(games),
    createLeaderboard(players),
    createDevSection(),
  );
  return fragment;
}
