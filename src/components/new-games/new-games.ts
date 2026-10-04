import { apiService, isAbortError } from '@/api/apiService';
import { toGameItem } from '@/api/mappers';
import type { GameItem } from '@/types/game';
import { createEmptyState } from '@/components/feedback/empty-state';
import { createErrorBanner, getErrorMessage } from '@/components/feedback/error-banner';
import { createSkeleton } from '@/components/feedback/skeleton';
import { el } from '@/utils/dom';

import { createCarousel } from '../carousel/carousel';
import { createSectionEyebrow } from '../shared/section-eyebrow';

export interface NewGamesSection {
  element: HTMLElement;
  /** Aborts the in-flight request (if any) and stops the carousel's autoplay/listeners. */
  destroy: () => void;
}

/**
 * "New Games" section: fetches the featured games (`GET /games?featured=true`)
 * and renders them as a real, auto-playing carousel — see
 * `src/components/carousel/carousel.ts` for the slider mechanics.
 */
export function createNewGamesSection(onDetails: (game: GameItem) => void): NewGamesSection {
  const controller = new AbortController();
  let stopCarousel: (() => void) | null = null;

  const arrowsSlot = el('div', { className: 'new-games__arrows-slot' });
  const contentSlot = el('div', {
    className: 'new-games__content-slot',
    attrs: { 'aria-busy': true },
  });
  contentSlot.append(createSkeleton('carousel'));

  const wrapper = el('div', { className: 'new-games-wrapper' }, [
    el('div', { className: 'new-games__header' }, [createSectionEyebrow('New Games'), arrowsSlot]),
    contentSlot,
  ]);

  function renderCarousel(games: GameItem[]): void {
    const carousel = createCarousel(games, onDetails);
    stopCarousel = carousel.destroy;
    arrowsSlot.replaceChildren(carousel.arrows);
    contentSlot.setAttribute('aria-busy', 'false');
    contentSlot.replaceChildren(carousel.viewport);
  }

  async function load(): Promise<void> {
    try {
      const { data } = await apiService.getFeaturedGames(controller.signal);
      contentSlot.setAttribute('aria-busy', 'false');

      if (data.length === 0) {
        contentSlot.replaceChildren(createEmptyState());
        return;
      }

      renderCarousel(data.map(toGameItem));
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }
      contentSlot.setAttribute('aria-busy', 'false');
      contentSlot.replaceChildren(
        createErrorBanner(getErrorMessage(error), () => {
          contentSlot.setAttribute('aria-busy', 'true');
          contentSlot.replaceChildren(createSkeleton('carousel'));
          void load();
        }),
      );
    }
  }

  void load();

  return {
    element: wrapper,
    destroy: () => {
      controller.abort();
      stopCarousel?.();
    },
  };
}
