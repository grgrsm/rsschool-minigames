import { DEFAULT_GAMES_SORT } from '@/types/api';
import type { GamesSort } from '@/types/api';
import { updateSearchParams } from '@/router';
import type { NavigateOptions } from '@/router';

export interface LibraryUrlState {
  category: string;
  sort: GamesSort;
  page: number;
}

export const ALL_CATEGORIES = 'all';

export const DEFAULT_LIBRARY_STATE: LibraryUrlState = {
  category: ALL_CATEGORIES,
  sort: DEFAULT_GAMES_SORT,
  page: 1,
};

const SORT_VALUES: readonly GamesSort[] = ['rating-desc', 'rating-asc', 'name-asc', 'name-desc'];
const CATEGORY_PATTERN = /^[a-z0-9-]+$/i;

function isGamesSort(value: string): value is GamesSort {
  return (SORT_VALUES as readonly string[]).includes(value);
}

/** Reads the Library state from the URL; invalid or missing values fall back to defaults. */
export function readLibraryState(params: URLSearchParams): LibraryUrlState {
  const category = params.get('category')?.trim() ?? '';
  const sort = params.get('sort') ?? '';
  const page = Number.parseInt(params.get('page') ?? '', 10);

  return {
    category: CATEGORY_PATTERN.test(category) ? category : DEFAULT_LIBRARY_STATE.category,
    sort: isGamesSort(sort) ? sort : DEFAULT_LIBRARY_STATE.sort,
    page: Number.isInteger(page) && page >= 1 ? page : DEFAULT_LIBRARY_STATE.page,
  };
}

/** Writes the Library state to the URL: `/library?category=puzzle&sort=rating-desc&page=2`. */
export function writeLibraryState(state: LibraryUrlState, options: NavigateOptions = {}): void {
  updateSearchParams(
    {
      category: state.category === ALL_CATEGORIES ? null : state.category,
      sort: state.sort,
      page: String(state.page),
    },
    options,
  );
}
