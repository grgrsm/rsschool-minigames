import type { GameCategory, GameItem } from '@/types/game';
import { el, formatCount } from '@/utils/dom';
import { icons } from '@/utils/icons';

import categoriesData from '@/mocks/categories.json';

interface CategoryDef {
  slug: string;
  label: string;
  isDefault: boolean;
}

interface CategoriesResponse {
  data: CategoryDef[];
}

const PAGE_SIZE = 6;

function formatCategoryLabel(category: GameCategory): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

function createGameCard(game: GameItem, onDetails: (game: GameItem) => void): HTMLElement {
  const priceClass = game.price === 'Free' ? ' library-card__price--free' : '';

  const detailsBtn = el('button', {
    className: 'library-card__details',
    attrs: { type: 'button', 'aria-label': `View details for ${game.name}` },
    text: 'Details',
  });
  detailsBtn.addEventListener('click', () => onDetails(game));

  return el('li', { className: 'library-card' }, [
    el('img', {
      className: 'library-card__image',
      attrs: { src: game.cardImage, alt: game.name, loading: 'lazy', width: 320, height: 200 },
    }),
    el('div', { className: 'library-card__body' }, [
      el('div', { className: 'library-card__header' }, [
        el('div', { className: 'library-card__heading' }, [
          el('h2', { className: 'library-card__title', text: game.name }),
          el('span', {
            className: 'library-card__badge',
            text: formatCategoryLabel(game.category),
          }),
        ]),
        el('span', { className: `library-card__price${priceClass}`, text: game.price }),
      ]),
      el('p', { className: 'library-card__description', text: game.shortDescription }),
      el('div', { className: 'library-card__footer' }, [
        el('div', { className: 'library-card__meta' }, [
          el('span', { className: 'library-card__stat' }, [
            el('span', {
              className: 'library-card__icon library-card__icon--rating',
              html: icons.star,
            }),
            el('span', { text: game.rating.toFixed(1) }),
          ]),
          el('span', { className: 'library-card__stat' }, [
            el('span', {
              className: 'library-card__icon library-card__icon--likes',
              html: icons.heart,
            }),
            el('span', { text: formatCount(game.likesCount) }),
          ]),
        ]),
        detailsBtn,
      ]),
    ]),
  ]);
}

function createCategoryChips(
  categories: CategoryDef[],
  activeSlug: string,
  onSelect: (slug: string) => void,
): HTMLElement {
  const list = el('div', {
    className: 'library-filters__categories',
    attrs: { role: 'group', 'aria-label': 'Filter games by category' },
  });

  categories.forEach((category) => {
    const isActive = category.slug === activeSlug;
    const chip = el('button', {
      className: `library-chip${isActive ? ' library-chip--active' : ''}`,
      attrs: { type: 'button', 'aria-pressed': isActive },
      text: category.label,
    });
    chip.addEventListener('click', () => onSelect(category.slug));
    list.append(chip);
  });

  return list;
}

function createSortIndicator(): HTMLElement {
  return el('div', { className: 'library-sort' }, [
    el('span', { text: 'Sort by: Rating ↓' }),
    el('span', { className: 'library-sort__icon', html: icons.chevronDown }),
  ]);
}

function createPagination(
  page: number,
  totalPages: number,
  onChange: (page: number) => void,
): HTMLElement {
  const nav = el('nav', {
    className: 'library-pagination',
    attrs: { 'aria-label': 'Library pagination' },
  });

  const prevBtn = el('button', {
    className: 'library-page-btn library-page-btn--nav',
    attrs: { type: 'button', 'aria-label': 'Previous page', disabled: page === 1 },
    html: icons.arrowLeft,
  });
  prevBtn.addEventListener('click', () => onChange(page - 1));
  nav.append(prevBtn);

  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
    const isActive = pageNumber === page;
    const attrs: Record<string, string | number | boolean> = {
      type: 'button',
      'aria-label': `Page ${pageNumber}`,
    };
    if (isActive) {
      attrs['aria-current'] = 'page';
    }

    const pageBtn = el('button', {
      className: `library-page-btn${isActive ? ' library-page-btn--active' : ''}`,
      attrs,
      text: String(pageNumber),
    });
    pageBtn.addEventListener('click', () => onChange(pageNumber));
    nav.append(pageBtn);
  }

  const nextBtn = el('button', {
    className: 'library-page-btn library-page-btn--nav',
    attrs: { type: 'button', 'aria-label': 'Next page', disabled: page === totalPages },
    html: icons.arrowRight,
  });
  nextBtn.addEventListener('click', () => onChange(page + 1));
  nav.append(nextBtn);

  return nav;
}

export function createLibraryPage(
  games: GameItem[],
  onDetails: (game: GameItem) => void,
): HTMLElement {
  const categories = (categoriesData as CategoriesResponse).data;
  let activeCategory = categories.find((category) => category.isDefault)?.slug ?? 'all';
  let page = 1;

  const section = el('section', {
    className: 'library',
    attrs: { id: 'library', 'aria-labelledby': 'library-title' },
  });
  const container = el('div', { className: 'library__container' });

  container.append(
    el('div', { className: 'library__header' }, [
      el('h1', {
        className: 'library__title',
        attrs: { id: 'library-title' },
        text: 'Game Library',
      }),
      el('p', {
        className: 'library__subtitle',
        text: 'Browse our collection of casual mini-games',
      }),
    ]),
  );

  const chipsSlot = el('div', { className: 'library-filters__categories-slot' });
  const filtersRow = el('div', { className: 'library__filters' }, [
    chipsSlot,
    createSortIndicator(),
  ]);
  container.append(filtersRow);

  const grid = el('ul', { className: 'library__grid', attrs: { 'aria-label': 'Games list' } });
  const paginationSlot = el('div', { className: 'library__pagination-wrap' });
  container.append(grid, paginationSlot);
  section.append(container);

  function renderChips(): void {
    chipsSlot.replaceChildren(
      createCategoryChips(categories, activeCategory, (slug) => {
        if (slug === activeCategory) return;
        activeCategory = slug;
        page = 1;
        renderChips();
        update();
      }),
    );
  }

  function update(): void {
    const filtered =
      activeCategory === 'all' ? games : games.filter((game) => game.category === activeCategory);
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    if (page > totalPages) {
      page = totalPages;
    }
    const start = (page - 1) * PAGE_SIZE;
    const pageItems = filtered.slice(start, start + PAGE_SIZE);

    grid.replaceChildren(...pageItems.map((game) => createGameCard(game, onDetails)));
    paginationSlot.replaceChildren(
      createPagination(page, totalPages, (nextPage) => {
        page = nextPage;
        update();
      }),
    );
  }

  renderChips();
  update();

  return section;
}
