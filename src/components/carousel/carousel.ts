import type { GameItem } from '@/types/game';
import { el, formatCount } from '@/utils/dom';
import { icons } from '@/utils/icons';

export interface CarouselApi {
  /** Prev/Next controls — placed by the caller inside the section header. */
  arrows: HTMLElement;
  /** The clipped viewport that contains the sliding track. */
  viewport: HTMLElement;
  /** Stops the autoplay timer and detaches every listener. */
  destroy: () => void;
}

const AUTOPLAY_MS = 4000;
const DRAG_THRESHOLD_PX = 6;

// A card at or above this rendered width shows the title/rating/likes
// overlay; anything narrower is image-only. Driven entirely by the pixel
// widths this module computes itself (see getSizeConfig), never measured
// from the DOM, so the two always agree by construction.
const INFO_MIN_WIDTH = 288;

interface SizeConfig {
  centerWidth: number;
  sideWidth: number;
  height: number;
  gap: number;
}

// Mirrors src/styles/_breakpoints.scss (mobile <=768, small-mobile <=480,
// tablet 769-1024, desktop >=1025). There's no shared token pipeline between
// SCSS and TS here, so these cutoffs -- and the gap sizes, which match
// var(--size-1/2/3) at each tier -- are intentionally duplicated.
function getSizeConfig(viewportWidth: number): SizeConfig {
  if (viewportWidth <= 480) {
    return { centerWidth: 300, sideWidth: 60, height: 230, gap: 8 };
  }
  if (viewportWidth <= 768) {
    return { centerWidth: 450, sideWidth: 110, height: 320, gap: 16 };
  }
  if (viewportWidth <= 1024) {
    return { centerWidth: 420, sideWidth: 200, height: 300, gap: 24 };
  }
  return { centerWidth: 816, sideWidth: 220, height: 384, gap: 24 };
}

// Constant center-to-center spacing derived from the two card sizes, so
// flexbox-free absolute positioning still packs cards edge-to-edge (plus
// one gap) right next to the center card, in both directions.
function getPitch(config: SizeConfig): number {
  return (config.centerWidth + config.sideWidth) / 2 + config.gap;
}

function lerp(from: number, to: number, progress: number): number {
  return from + (to - from) * progress;
}

/** Shortest signed distance from `position` to `index` around a circle of `total` slots. */
function circularOffset(index: number, position: number, total: number): number {
  let diff = (index - position) % total;
  if (diff > total / 2) diff -= total;
  if (diff < -total / 2) diff += total;
  return diff;
}

function wrapIndex(index: number, total: number): number {
  return ((index % total) + total) % total;
}

interface CarouselCard {
  element: HTMLElement;
  setInfoVisible: (visible: boolean) => void;
}

function createCard(game: GameItem): CarouselCard {
  const element = el('li', { className: 'carousel__card' }, [
    el('img', {
      className: 'carousel__card-image',
      attrs: { src: game.cardImage, alt: game.name, loading: 'lazy' },
    }),
    el('div', { className: 'carousel__card-scrim', attrs: { 'aria-hidden': true } }),
    el('div', { className: 'carousel__card-content' }, [
      el('h2', { className: 'carousel__card-title', text: game.name }),
      el('div', { className: 'carousel__card-meta' }, [
        el('span', { className: 'carousel__card-rating' }, [
          el('span', {
            className: 'carousel__card-icon',
            html: icons.star,
            attrs: { 'aria-hidden': true },
          }),
          el('span', { text: game.rating.toFixed(1) }),
        ]),
        el('span', { className: 'carousel__card-likes' }, [
          el('span', {
            className: 'carousel__card-icon',
            html: icons.heart,
            attrs: { 'aria-hidden': true },
          }),
          el('span', { text: formatCount(game.likesCount) }),
        ]),
      ]),
    ]),
  ]);

  return {
    element,
    setInfoVisible: (visible: boolean) => {
      element.classList.toggle('carousel__card--has-info', visible);
    },
  };
}

export function createCarousel(
  games: GameItem[],
  onDetails: (game: GameItem) => void,
): CarouselApi {
  const total = games.length;
  const controller = new AbortController();
  const { signal } = controller;

  // `position` is the (possibly fractional, during a drag) slot index
  // currently centered; `currentIndex` is its last settled integer value.
  let position = 0;
  let currentIndex = 0;
  let config = getSizeConfig(window.innerWidth);
  let pitch = getPitch(config);

  let remainingMs = AUTOPLAY_MS;
  let timerStartedAt = 0;
  let timerHandle: ReturnType<typeof setTimeout> | null = null;

  let isDragging = false;
  let hasMoved = false;
  let dragStartX = 0;
  let dragStartPosition = 0;
  let activePointerId: number | null = null;
  let resizeScheduled = false;

  const viewport = el('div', {
    className: 'carousel__viewport',
    attrs: { role: 'region', 'aria-label': 'Featured new games' },
  });
  const track = el('ul', { className: 'carousel__track' });
  viewport.append(track);

  const cards = games.map((game) => createCard(game));
  track.append(...cards.map((card) => card.element));

  const prevBtn = el('button', {
    className: 'carousel__arrow',
    attrs: { type: 'button', 'aria-label': 'Previous game' },
    html: icons.arrowLeft,
  });
  const nextBtn = el('button', {
    className: 'carousel__arrow carousel__arrow--primary',
    attrs: { type: 'button', 'aria-label': 'Next game' },
    html: icons.arrowRight,
  });
  const arrows = el('div', { className: 'carousel__arrows' }, [prevBtn, nextBtn]);

  function applyTransforms(): void {
    cards.forEach((card, index) => {
      const offset = circularOffset(index, position, total);
      const growth = Math.min(Math.abs(offset), 1);
      const width = Math.round(lerp(config.centerWidth, config.sideWidth, growth));
      const x = offset * pitch;
      const stackOrder = Math.round((5 - Math.min(Math.abs(offset), 5)) * 10);

      card.element.style.width = `${width}px`;
      card.element.style.transform = `translate(calc(-50% + ${x}px), -50%)`;
      card.element.style.zIndex = String(stackOrder);
      card.setInfoVisible(width >= INFO_MIN_WIDTH);
    });
  }

  function setDragging(active: boolean): void {
    track.classList.toggle('carousel__track--dragging', active);
  }

  function applyViewportHeight(): void {
    viewport.style.height = `${config.height}px`;
  }

  function refreshSizeConfig(): void {
    config = getSizeConfig(window.innerWidth);
    pitch = getPitch(config);
    applyViewportHeight();
    applyTransforms();
  }

  function stepBy(delta: number): void {
    currentIndex = wrapIndex(currentIndex + delta, total);
    position = currentIndex;
    applyTransforms();
  }

  function scheduleNext(ms: number): void {
    if (timerHandle !== null) clearTimeout(timerHandle);
    timerStartedAt = performance.now();
    remainingMs = ms;
    timerHandle = setTimeout(() => {
      timerHandle = null;
      stepBy(1);
      scheduleNext(AUTOPLAY_MS);
    }, ms);
  }

  function pauseForHold(): void {
    if (timerHandle === null) return;
    const elapsed = performance.now() - timerStartedAt;
    remainingMs = Math.max(0, remainingMs - elapsed);
    clearTimeout(timerHandle);
    timerHandle = null;
  }

  function resumeAfterHold(): void {
    scheduleNext(remainingMs);
  }

  function resetAfterManualMove(): void {
    scheduleNext(AUTOPLAY_MS);
  }

  prevBtn.addEventListener(
    'click',
    () => {
      stepBy(-1);
      resetAfterManualMove();
    },
    { signal },
  );
  nextBtn.addEventListener(
    'click',
    () => {
      stepBy(1);
      resetAfterManualMove();
    },
    { signal },
  );

  viewport.addEventListener(
    'pointerdown',
    (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      activePointerId = event.pointerId;
      isDragging = true;
      hasMoved = false;
      dragStartX = event.clientX;
      dragStartPosition = position;
      setDragging(true);
      pauseForHold();
    },
    { signal },
  );

  // Listening on `window` (rather than capturing the pointer to `viewport`)
  // means the drag keeps tracking even if the pointer leaves the strip, and
  // — unlike pointer capture — never retargets `pointerup.target` away from
  // whatever card is actually under the finger/cursor on release.
  window.addEventListener(
    'pointermove',
    (event: PointerEvent) => {
      if (!isDragging || event.pointerId !== activePointerId) return;
      const dx = event.clientX - dragStartX;
      if (Math.abs(dx) > DRAG_THRESHOLD_PX) hasMoved = true;
      if (hasMoved) {
        position = dragStartPosition - dx / pitch;
        applyTransforms();
      }
    },
    { signal },
  );

  function endDrag(event: PointerEvent): void {
    if (!isDragging || event.pointerId !== activePointerId) return;
    isDragging = false;
    activePointerId = null;
    setDragging(false);

    if (hasMoved) {
      currentIndex = wrapIndex(Math.round(position), total);
      position = currentIndex;
      applyTransforms();
      resetAfterManualMove();
      return;
    }

    resumeAfterHold();
    const target = document.elementFromPoint(event.clientX, event.clientY);
    const card = target?.closest('.carousel__card');
    if (!card) return;
    const clickedIndex = cards.findIndex((c) => c.element === card);
    if (clickedIndex !== -1) {
      onDetails(games[clickedIndex]);
    }
  }

  window.addEventListener('pointerup', endDrag, { signal });
  window.addEventListener('pointercancel', endDrag, { signal });

  window.addEventListener(
    'resize',
    () => {
      if (resizeScheduled) return;
      resizeScheduled = true;
      requestAnimationFrame(() => {
        resizeScheduled = false;
        refreshSizeConfig();
      });
    },
    { signal },
  );

  applyViewportHeight();
  applyTransforms();
  scheduleNext(AUTOPLAY_MS);

  return {
    arrows,
    viewport,
    destroy: () => {
      if (timerHandle !== null) clearTimeout(timerHandle);
      controller.abort();
    },
  };
}
