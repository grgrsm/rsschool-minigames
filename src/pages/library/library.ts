import { apiService, isAbortError } from '@/api/apiService';
import { toGameItem } from '@/api/mappers';
import type { GameCategory, GameItem } from '@/types/game';
import { createEmptyState } from '@/components/feedback/empty-state';
import { createErrorBanner, getErrorMessage } from '@/components/feedback/error-banner';
import { createSkeleton } from '@/components/feedback/skeleton';
import type { CategoryDto, GamesSort } from '@/types/api';
import { DEFAULT_LIBRARY_STATE, readLibraryState, writeLibraryState } from '@/utils/library-query';
import type { LibraryUrlState } from '@/utils/library-query';
import { el, formatCount } from '@/utils/dom';
import { icons } from '@/utils/icons';

const PAGE_SIZE = 6;

function formatCategoryLabel(category: GameCategory): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

function createGameCard(game: GameItem, onDetails: (game: GameItem) => void): HTMLElement {
  const priceClass = game.price === 'Free' ? ' library-card__price--free' : '';

  const detailsBtn = el('button', {
    className: 'library-card__details',
    attrs: {
      type: 'button',
      'aria-label': `View details for ${game.name}`,
    },
    text: 'Details',
  });

  detailsBtn.addEventListener('click', () => onDetails(game));

  return el('li', { className: 'library-card' }, [
    el('img', {
      className: 'library-card__image',
      attrs: {
        src: game.cardImage,
        alt: game.name,
        loading: 'lazy',
        width: 320,
        height: 200,
      },
    }),

    el('div', { className: 'library-card__body' }, [
      el('div', { className: 'library-card__header' }, [
        el('div', { className: 'library-card__heading' }, [
          el('h2', {
            className: 'library-card__title',
            text: game.name,
          }),

          el('span', {
            className: 'library-card__badge',
            text: formatCategoryLabel(game.category),
          }),
        ]),

        el('span', {
          className: `library-card__price${priceClass}`,
          text: game.price,
        }),
      ]),

      el('p', {
        className: 'library-card__description',
        text: game.shortDescription,
      }),

      el('div', { className: 'library-card__footer' }, [
        el('div', { className: 'library-card__meta' }, [
          el('span', { className: 'library-card__stat' }, [
            el('span', {
              className: 'library-card__icon library-card__icon--rating',
              html: icons.star,
            }),

            el('span', {
              text: game.rating.toFixed(1),
            }),
          ]),

          el('span', { className: 'library-card__stat' }, [
            el('span', {
              className: 'library-card__icon library-card__icon--likes',
              html: icons.heart,
            }),

            el('span', {
              text: formatCount(game.likesCount),
            }),
          ]),
        ]),

        detailsBtn,
      ]),
    ]),
  ]);
}

function createCategoryChips(
  categories: CategoryDto[],
  activeSlug: string,
  onSelect: (slug: string) => void,
): HTMLElement {
  const list = el('div', {
    className: 'library-filters__categories',
    attrs: {
      role: 'group',
      'aria-label': 'Filter games by category',
    },
  });

  categories.forEach((category) => {
    const isActive = category.slug === activeSlug;

    const chip = el('button', {
      className: `library-chip${isActive ? ' library-chip--active' : ''}`,
      attrs: {
        type: 'button',
        'aria-pressed': isActive,
      },
      text: category.label,
    });

    chip.addEventListener('click', () => onSelect(category.slug));

    list.append(chip);
  });

  return list;
}

/*
 * Existing Sort button.
 *
 * Do not change its visual design or text.
 */
function createSortIndicator(onClick: () => void): HTMLElement {
  const button = el('button', {
    className: 'library-sort',
    attrs: {
      type: 'button',
      'aria-label': 'Open sort options',
    },
  });

  button.append(
    el('span', {
      className: 'library-sort__label',
      text: 'Sort by: Rating ↓',
    }),

    el('span', {
      className: 'library-sort__icon',
      html: icons.chevronDown,
    }),
  );

  button.addEventListener('click', onClick);

  return button;
}

/**
 * `disabled` forces every control off regardless of position — used for the
 * "Data Not Found" empty state, where the spec calls for pagination pinned
 * to page 1 with switching blocked.
 */
function createPagination(
  page: number,
  totalPages: number,
  onChange: (page: number) => void,
  disabled = false,
): HTMLElement {
  const nav = el('nav', {
    className: 'library-pagination',
    attrs: {
      'aria-label': 'Library pagination',
    },
  });

  const prevBtn = el('button', {
    className: 'library-page-btn library-page-btn--nav',
    attrs: {
      type: 'button',
      'aria-label': 'Previous page',
      disabled: disabled || page === 1,
    },
    html: icons.arrowLeft,
  });

  prevBtn.addEventListener('click', () => onChange(page - 1));

  nav.append(prevBtn);

  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
    const isActive = pageNumber === page;

    const attrs: Record<string, string | number | boolean> = {
      type: 'button',
      'aria-label': `Page ${pageNumber}`,
      disabled,
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
    attrs: {
      type: 'button',
      'aria-label': 'Next page',
      disabled: disabled || page === totalPages,
    },
    html: icons.arrowRight,
  });

  nextBtn.addEventListener('click', () => onChange(page + 1));

  nav.append(nextBtn);

  return nav;
}

interface SortOption {
  value: GamesSort;
  label: string;
}

const SORT_OPTIONS: SortOption[] = [
  {
    value: 'rating-asc',
    label: 'Rating ↑',
  },
  {
    value: 'rating-desc',
    label: 'Rating ↓',
  },
  {
    value: 'name-asc',
    label: 'Name A→Z',
  },
  {
    value: 'name-desc',
    label: 'Name Z→A',
  },
];

function createFilterDialog(
  getActiveSort: () => SortOption['value'],
  onSelect: (value: SortOption['value']) => void,
): {
  element: HTMLDialogElement;
  open: (anchor: HTMLElement) => void;
} {
  const dialog = el('dialog', {
    className: 'library-filter-dialog',
    attrs: {
      'aria-labelledby': 'library-filter-title',
    },
  });

  const title = el('h2', {
    className: 'library-filter-dialog__title',
    attrs: {
      id: 'library-filter-title',
    },
    text: 'Sort options',
  });

  const options = el('div', {
    className: 'library-filter-dialog__options',
    attrs: {
      role: 'listbox',
    },
  });

  const renderOptions = (): void => {
    options.replaceChildren(
      ...SORT_OPTIONS.map((option) => {
        const isActive = option.value === getActiveSort();

        const button = el('button', {
          className: `library-filter-dialog__option${isActive ? ' is-active' : ''}`,
          attrs: {
            type: 'button',
            role: 'option',
            'aria-selected': isActive,
          },
          text: option.label,
        });

        button.addEventListener('click', () => {
          onSelect(option.value);
          dialog.close();
        });

        return button;
      }),
    );
  };

  const closeBtn = el('button', {
    className: 'library-filter-dialog__close',
    attrs: {
      type: 'button',
      'aria-label': 'Close filter',
    },
    html: icons.close,
  });

  closeBtn.addEventListener('click', () => dialog.close());

  dialog.append(
    el('div', { className: 'library-filter-dialog__card' }, [title, options, closeBtn]),
  );

  document.body.append(dialog);

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) {
      dialog.close();
    }
  });

  dialog.addEventListener('close', () => {
    document.body.classList.remove('no-scroll');
  });

  return {
    element: dialog,

    open: (anchor: HTMLElement) => {
      renderOptions();

      const rect = anchor.getBoundingClientRect();

      const width = 200;
      const gap = 8;

      const left = Math.max(16, Math.min(rect.left, window.innerWidth - width - 16));

      const top = rect.bottom + gap;

      dialog.style.left = `${left}px`;
      dialog.style.top = `${top}px`;

      document.body.classList.add('no-scroll');

      if (!dialog.open) {
        dialog.showModal();
      }
    },
  };
}

export interface LibraryPage {
  element: HTMLElement;
  /** Aborts the in-flight categories/games request, if any. */
  destroy: () => void;
}

/**
 * The Library route. The URL is the only state this page keeps — every
 * filter/sort/page change goes through `writeLibraryState`, which updates
 * the URL and lets the app's router fully remount this page with the new
 * params (see `subscribe` in `src/index.ts`). That keeps deep links,
 * Back/Forward and this page's own controls all driven by the same source
 * of truth, per the SPA-router spec.
 */
export function createLibraryPage(
  params: URLSearchParams,
  onDetails: (game: GameItem) => void,
): LibraryPage {
  const state = readLibraryState(params);
  const controller = new AbortController();

  function goTo(next: LibraryUrlState, options: { replace?: boolean } = {}): void {
    writeLibraryState(next, options);
  }

  const filterDialog = createFilterDialog(
    () => state.sort,
    (value) => goTo({ ...state, sort: value, page: DEFAULT_LIBRARY_STATE.page }),
  );

  const section = el('section', {
    className: 'library',
    attrs: {
      id: 'library',
      'aria-labelledby': 'library-title',
    },
  });

  const container = el('div', {
    className: 'library__container',
  });

  container.append(
    el('div', { className: 'library__header' }, [
      el('h1', {
        className: 'library__title',
        attrs: {
          id: 'library-title',
        },
        text: 'Game Library',
      }),

      el('p', {
        className: 'library__subtitle',
        text: 'Browse our collection of casual mini-games',
      }),
    ]),
  );

  const chipsSlot = el('div', {
    className: 'library-filters__categories-slot',
  });

  const sortButton = createSortIndicator(() => filterDialog.open(sortButton));

  const filtersRow = el(
    'div',
    {
      className: 'library__filters',
    },
    [
      chipsSlot,

      el(
        'div',
        {
          className: 'library-filters__actions',
        },
        [sortButton],
      ),
    ],
  );

  // Swapped between a skeleton, an error banner, and the real grid +
  // pagination while `load()` below runs.
  const contentSlot = el('div', { className: 'library__content-slot' });

  container.append(filtersRow, contentSlot);
  section.append(container);

  function renderChips(categories: CategoryDto[]): void {
    chipsSlot.replaceChildren(
      createCategoryChips(categories, state.category, (slug) => {
        if (slug === state.category) {
          return;
        }
        goTo({ ...state, category: slug, page: DEFAULT_LIBRARY_STATE.page });
      }),
    );
  }

  function renderResults(games: GameItem[], totalPages: number, disabledPagination: boolean): void {
    const grid = el(
      'ul',
      { className: 'library__grid', attrs: { 'aria-label': 'Games list' } },
      games.map((game) => createGameCard(game, () => onDetails(game))),
    );

    const pagination = createPagination(
      state.page,
      totalPages,
      (nextPage) => goTo({ ...state, page: nextPage }),
      disabledPagination,
    );

    contentSlot.replaceChildren(
      games.length === 0
        ? el('div', { className: 'library__empty' }, [createEmptyState(), pagination])
        : el('div', { className: 'library__results' }, [grid, pagination]),
    );
  }

  async function load(): Promise<void> {
    contentSlot.setAttribute('aria-busy', 'true');
    contentSlot.replaceChildren(createSkeleton('cards'));

    try {
      const [categoriesResponse, gamesResponse] = await Promise.all([
        apiService.getCategories(controller.signal),
        apiService.getGames(
          { category: state.category, sort: state.sort, page: state.page, limit: PAGE_SIZE },
          controller.signal,
        ),
      ]);

      contentSlot.setAttribute('aria-busy', 'false');
      renderChips(categoriesResponse.data);

      const { data, meta } = gamesResponse;
      const totalPages = meta?.totalPages ?? 1;

      // The requested page is past the last real one for this filter — land
      // back on page 1 instead of showing a spuriously "empty" result.
      if (
        data.length === 0 &&
        (meta?.total ?? 0) > 0 &&
        state.page !== DEFAULT_LIBRARY_STATE.page
      ) {
        goTo({ ...state, page: DEFAULT_LIBRARY_STATE.page }, { replace: true });
        return;
      }

      renderResults(data.map(toGameItem), totalPages, data.length === 0);
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }
      contentSlot.setAttribute('aria-busy', 'false');
      contentSlot.replaceChildren(createErrorBanner(getErrorMessage(error), () => void load()));
    }
  }

  void load();

  return {
    element: section,
    destroy: () => controller.abort(),
  };
}
