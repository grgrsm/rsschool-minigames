import type { GameItem } from '@/types/game';
import type { LeaderboardPlayer } from '@/types/leaderboard';
import { createDevSection } from '@/components/dev-section/dev-section';
import { createHero } from '@/components/hero/hero';
import { createLeaderboard } from '@/components/leaderboard/leaderboard';
import { createNewGamesSection } from '@/components/new-games/new-games';

export interface HomePage {
  element: DocumentFragment;
  /** Stops the "New Games" carousel's autoplay timer and listeners. */
  destroy: () => void;
}

/** Builds the Home route content: Hero -> New Games -> Leaderboard -> Dev section. */
export function createHomeMain(
  games: GameItem[],
  players: LeaderboardPlayer[],
  onDetails: (game: GameItem) => void,
): HomePage {
  const newGames = createNewGamesSection(games, onDetails);

  const fragment = document.createDocumentFragment();
  fragment.append(createHero(), newGames.element, createLeaderboard(players), createDevSection());

  return { element: fragment, destroy: newGames.destroy };
}
