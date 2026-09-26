import type { GameItem } from '@/types/game';
import { el } from '@/utils/dom';

import { createCarousel } from '../carousel/carousel';
import { createSectionEyebrow } from '../shared/section-eyebrow';

export interface NewGamesSection {
  element: HTMLElement;
  destroy: () => void;
}

/**
 * "New Games" section: a real infinite, auto-playing carousel over the 9
 * `featured: true` games. See `src/components/carousel/carousel.ts` for the
 * slider mechanics (drag/swipe, autoplay, grow-near-center sizing).
 */
export function createNewGamesSection(
  games: GameItem[],
  onDetails: (game: GameItem) => void,
): NewGamesSection {
  const featured = games.filter((game) => game.featured);
  const carousel = createCarousel(featured, onDetails);

  const wrapper = el('div', { className: 'new-games-wrapper' }, [
    el('div', { className: 'new-games__header' }, [
      createSectionEyebrow('New Games'),
      carousel.arrows,
    ]),
    carousel.viewport,
  ]);

  return { element: wrapper, destroy: carousel.destroy };
}
