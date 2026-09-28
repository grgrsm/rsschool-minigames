import { el } from '@/utils/dom';

export type SkeletonKind = 'carousel' | 'leaderboard' | 'cards' | 'modal';

const DEFAULT_COUNT: Record<SkeletonKind, number> = {
  carousel: 3,
  leaderboard: 5,
  cards: 6,
  modal: 1,
};

function bone(modifier: string): HTMLSpanElement {
  return el('span', { className: `skeleton skeleton--${modifier}` });
}

function renderCard(): HTMLElement {
  return el('div', { className: 'skeleton-card' }, [
    bone('image'),
    bone('title'),
    bone('line'),
    bone('line-short'),
  ]);
}

function renderRow(): HTMLElement {
  return el('div', { className: 'skeleton-row' }, [
    bone('badge'),
    bone('avatar'),
    bone('line'),
    bone('line-short'),
  ]);
}

function renderModal(): HTMLElement {
  return el('div', { className: 'skeleton-modal' }, [
    bone('image'),
    bone('title'),
    bone('line'),
    bone('line'),
    bone('line-short'),
  ]);
}

const RENDERERS: Record<SkeletonKind, () => HTMLElement> = {
  carousel: renderCard,
  leaderboard: renderRow,
  cards: renderCard,
  modal: renderModal,
};

/**
 * Placeholder shown while an API request is pending.
 * Purely decorative: hidden from assistive tech, the owning block should set `aria-busy`.
 */
export function createSkeleton(
  kind: SkeletonKind,
  count: number = DEFAULT_COUNT[kind],
): HTMLElement {
  const wrapper = el('div', {
    className: `skeleton-group skeleton-group--${kind}`,
    attrs: { 'aria-hidden': true },
  });

  for (let index = 0; index < count; index += 1) {
    wrapper.append(RENDERERS[kind]());
  }

  return wrapper;
}
