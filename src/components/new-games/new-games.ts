import type { GameItem } from '@/types/game';
import { el, formatCount } from '@/utils/dom';
import { icons } from '@/utils/icons';

import { createSectionEyebrow } from '../shared/section-eyebrow';

/**
 * Static "New Games" strip.
 *
 * This replaces the scrollable carousel: the row is fixed (no drag, no
 * arrows, nothing to rotate) and the middle card is rendered large — a
 * wide "banner" card — while its neighbours keep the regular poster size
 * and are intentionally cropped by the row's `overflow: hidden` edges,
 * matching the reference mockup. See `src/components/carousel/carousel.ts`
 * for the previous interactive version (kept in the repo, just unused).
 */
function createFeatureCard(game: GameItem, isCenter: boolean): HTMLElement {
  return el(
    'li',
    {
      className: `feature-card${isCenter ? ' feature-card--center' : ''}`,
    },
    [
      el('img', {
        className: 'feature-card__image',
        attrs: {
          src: game.cardImage,
          alt: game.name,
          loading: 'lazy',
        },
      }),
      el('div', { className: 'feature-card__scrim', attrs: { 'aria-hidden': true } }),
      el('div', { className: 'feature-card__content' }, [
        el('h3', { className: 'feature-card__title', text: game.name }),
        el('div', { className: 'feature-card__meta' }, [
          el('span', { className: 'feature-card__rating' }, [
            el('span', { className: 'feature-card__icon', html: icons.star }),
            el('span', { text: game.rating.toFixed(1) }),
          ]),
          el('span', { className: 'feature-card__likes' }, [
            el('span', { className: 'feature-card__icon', html: icons.heart }),
            el('span', { text: formatCount(game.likesCount) }),
          ]),
        ]),
      ]),
    ],
  );
}

export function createNewGamesSection(games: GameItem[]): HTMLElement {
  const featured = games.filter((game) => game.featured);

  // The reference design centers the strip on the first featured game and
  // shows its two neighbours on each side, wrapping around the featured
  // list circularly (so the last featured games peek in from the left).
  const windowSize = Math.min(5, featured.length);
  const radius = Math.floor(windowSize / 2);
  const visible = Array.from({ length: windowSize }, (_, i) => {
    const offset = i - radius;
    const index = (offset + featured.length) % featured.length;
    return featured[index];
  });
  const centerIndex = radius;

  const wrapper = el('div', { className: 'new-games-wrapper' });

  // Decorative controls only — the strip below no longer scrolls, so these
  // aren't wired to any handler. They stay purely for visual parity with
  // the reference design.
  const arrows = el('div', { className: 'new-games__arrows' }, [
    el('button', {
      className: 'new-games__arrow',
      attrs: { type: 'button', 'aria-hidden': true, tabindex: -1 },
      html: icons.arrowLeft,
    }),
    el('button', {
      className: 'new-games__arrow new-games__arrow--primary',
      attrs: { type: 'button', 'aria-hidden': true, tabindex: -1 },
      html: icons.arrowRight,
    }),
  ]);

  wrapper.append(
    el('div', { className: 'new-games__header' }, [createSectionEyebrow('New Games'), arrows]),
  );

  const strip = el(
    'ul',
    { className: 'new-games__strip', attrs: { 'aria-label': 'Featured new games' } },
    visible.map((game, index) => createFeatureCard(game, index === centerIndex)),
  );

  wrapper.append(strip);

  return wrapper;
}
