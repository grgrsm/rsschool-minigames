import type { GameItem } from '@/types/game';
import { el, formatCount } from '@/utils/dom';
import { icons } from '@/utils/icons';

import { createSectionEyebrow } from '../shared/section-eyebrow';

function createGameCard(game: GameItem): HTMLElement {
  return el('li', { className: 'carousel__item' }, [
    el('article', { className: 'game-card' }, [
      el('img', {
        className: 'game-card__image',
        attrs: {
          src: game.cardImage,
          alt: game.name,
          loading: 'lazy',
          width: 220,
          height: 140,
        },
      }),
      el('div', { className: 'game-card__body' }, [
        el('h3', { className: 'game-card__title', text: game.name }),
        el('div', { className: 'game-card__meta' }, [
          el('span', { className: 'game-card__rating' }, [
            el('span', { className: 'game-card__icon', html: icons.star }),
            el('span', { text: game.rating.toFixed(1) }),
          ]),
          el('span', { className: 'game-card__likes' }, [
            el('span', { className: 'game-card__icon', html: icons.heart }),
            el('span', { text: formatCount(game.likesCount) }),
          ]),
        ]),
      ]),
    ]),
  ]);
}

function updateArrowState(
  track: HTMLElement,
  prevBtn: HTMLButtonElement,
  nextBtn: HTMLButtonElement,
): void {
  const maxScroll = track.scrollWidth - track.clientWidth;
  prevBtn.disabled = track.scrollLeft <= 1;
  nextBtn.disabled = track.scrollLeft >= maxScroll - 1;
}

export function createCarousel(games: GameItem[]): HTMLElement {
  const featured = games.filter((game) => game.featured);

  const wrapper = el('div', { className: 'carousel-wrapper' });

  const headerRow = el('div', { className: 'carousel__header' }, [
    createSectionEyebrow('New Games'),
  ]);

  const prevBtn = el('button', {
    className: 'carousel__arrow',
    attrs: { type: 'button', 'aria-label': 'Scroll to previous games' },
    html: icons.arrowLeft,
  });
  const nextBtn = el('button', {
    className: 'carousel__arrow',
    attrs: { type: 'button', 'aria-label': 'Scroll to next games' },
    html: icons.arrowRight,
  });
  const arrowGroup = el('div', { className: 'carousel__arrows' }, [prevBtn, nextBtn]);
  headerRow.append(arrowGroup);

  const track = el(
    'ul',
    { className: 'carousel__track', attrs: { 'aria-label': 'Featured new games' } },
    featured.map((game) => createGameCard(game)),
  );

  const viewport = el('div', { className: 'carousel__viewport' }, [track]);

  const scrollByAmount = (): number => Math.min(track.clientWidth * 0.8, 600);

  prevBtn.addEventListener('click', () => {
    track.scrollBy({ left: -scrollByAmount(), behavior: 'smooth' });
  });
  nextBtn.addEventListener('click', () => {
    track.scrollBy({ left: scrollByAmount(), behavior: 'smooth' });
  });

  track.addEventListener('scroll', () => updateArrowState(track, prevBtn, nextBtn));
  window.addEventListener('resize', () => updateArrowState(track, prevBtn, nextBtn));

  wrapper.append(headerRow, viewport);

  // Defer to next frame so layout (scrollWidth/clientWidth) is settled.
  requestAnimationFrame(() => updateArrowState(track, prevBtn, nextBtn));

  return wrapper;
}
