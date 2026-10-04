import type { GameItem } from '@/types/game';
import { createDevSection } from '@/components/dev-section/dev-section';
import { createHero } from '@/components/hero/hero';
import { createLeaderboard } from '@/components/leaderboard/leaderboard';
import { createNewGamesSection } from '@/components/new-games/new-games';

export interface HomePage {
  element: DocumentFragment;
  /** Stops both API-backed sections: aborts in-flight requests and the carousel's autoplay. */
  destroy: () => void;
}

/** Builds the Home route content: Hero -> New Games -> Leaderboard -> Dev section. */
export function createHomeMain(onDetails: (game: GameItem) => void): HomePage {
  const newGames = createNewGamesSection(onDetails);
  const leaderboard = createLeaderboard();

  const fragment = document.createDocumentFragment();
  fragment.append(createHero(), newGames.element, leaderboard.element, createDevSection());

  return {
    element: fragment,
    destroy: () => {
      newGames.destroy();
      leaderboard.destroy();
    },
  };
}
