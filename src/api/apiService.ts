import type {
  ApiResponse,
  CategoriesApiResponse,
  CommentsApiResponse,
  CommentsQuery,
  GameDetailsDto,
  GamesApiResponse,
  GamesQuery,
  LeaderboardApiResponse,
} from '../types/api';

const DEFAULT_API_URL = 'https://faxb76kxra.execute-api.eu-central-1.amazonaws.com/api';
const API_BASE_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined) ?? DEFAULT_API_URL;
const REQUEST_TIMEOUT_MS = 10_000;
const ALL_CATEGORIES_SLUG = 'all';
/** No auth in Story 3 — see the doc comment on `getGameBySlug`. */
const CURRENT_USER_EMAIL = '';

/* ---------------------------------- Errors ---------------------------------- */

export type ApiErrorKind = 'network' | 'timeout' | 'http' | 'parse' | 'aborted';

export class ApiError extends Error {
  public readonly kind: ApiErrorKind;
  public readonly status: number | null;

  public constructor(message: string, kind: ApiErrorKind, status: number | null = null) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
  }

  /** Network failures, timeouts and 5xx — the cases that get an Error Banner with Retry. */
  public get isRetryable(): boolean {
    return (
      this.kind === 'network' ||
      this.kind === 'timeout' ||
      (this.kind === 'http' && this.status !== null && this.status >= 500)
    );
  }

  public get isNotFound(): boolean {
    return this.kind === 'http' && this.status === 404;
  }
}

/** Aborted requests (route change, newer request) are expected and must not show a banner. */
export function isAbortError(error: unknown): boolean {
  return error instanceof ApiError && error.kind === 'aborted';
}

/* --------------------------------- Internals --------------------------------- */

type QueryValue = string | number | boolean | undefined;
type QueryParams = Record<string, QueryValue>;

function buildUrl(path: string, query?: QueryParams): string {
  const url = new URL(`${API_BASE_URL}${path}`);

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return url.toString();
}

async function request<T>(path: string, query?: QueryParams, signal?: AbortSignal): Promise<T> {
  const controller = new AbortController();
  let timedOut = false;

  const timeoutId = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  const onExternalAbort = (): void => controller.abort();
  if (signal) {
    if (signal.aborted) {
      window.clearTimeout(timeoutId);
      throw new ApiError('Request was cancelled', 'aborted');
    }
    signal.addEventListener('abort', onExternalAbort, { once: true });
  }

  try {
    let response: Response;

    try {
      response = await fetch(buildUrl(path, query), {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
    } catch {
      if (signal?.aborted) {
        throw new ApiError('Request was cancelled', 'aborted');
      }
      if (timedOut) {
        throw new ApiError('Request timed out', 'timeout');
      }
      throw new ApiError('Network error. Check your connection.', 'network');
    }

    if (!response.ok) {
      throw new ApiError(`Request failed with status ${response.status}`, 'http', response.status);
    }

    try {
      return (await response.json()) as T;
    } catch {
      throw new ApiError('Server returned an invalid response', 'parse');
    }
  } finally {
    window.clearTimeout(timeoutId);
    signal?.removeEventListener('abort', onExternalAbort);
  }
}

/* ---------------------------------- Public API --------------------------------- */

export const apiService = {
  /** Hero carousel. */
  getFeaturedGames(signal?: AbortSignal): Promise<GamesApiResponse> {
    return request<GamesApiResponse>('/games', { featured: true }, signal);
  },

  /** Home: Top Players. */
  getLeaderboard(signal?: AbortSignal): Promise<LeaderboardApiResponse> {
    return request<LeaderboardApiResponse>('/leaderboard', undefined, signal);
  },

  /** Library: category filter options. */
  getCategories(signal?: AbortSignal): Promise<CategoriesApiResponse> {
    return request<CategoriesApiResponse>('/categories', undefined, signal);
  },

  /** Library: filtering, sorting and pagination happen on the backend only. */
  getGames(query: GamesQuery = {}, signal?: AbortSignal): Promise<GamesApiResponse> {
    const category = query.category === ALL_CATEGORIES_SLUG ? undefined : query.category;

    return request<GamesApiResponse>(
      '/games',
      {
        featured: query.featured,
        category,
        sort: query.sort,
        page: query.page,
        limit: query.limit,
      },
      signal,
    );
  },

  /**
   * Game details modal. Wrapped in `{ data }` just like the collection endpoints —
   * unwrapped here.
   *
   * `userEmail` is sent empty: there's no auth yet in Story 3 (it's Story 4 scope), but
   * the spec names it as the endpoint's personalization param, so the key stays present
   * on every request rather than being silently omitted. Once real auth lands, replace
   * `CURRENT_USER_EMAIL` with the signed-in user's email and `isLikedByCurrentUser` on
   * the response will start reflecting it.
   */
  async getGameBySlug(gameSlug: string, signal?: AbortSignal): Promise<GameDetailsDto> {
    const response = await request<ApiResponse<GameDetailsDto>>(
      `/games/${encodeURIComponent(gameSlug)}`,
      { userEmail: CURRENT_USER_EMAIL },
      signal,
    );
    return response.data;
  },

  /** Read-only comments preview (latest 3 by default). `userEmail` — see `getGameBySlug`. */
  getGameComments(
    gameSlug: string,
    { limit = 3, sort = 'newest' }: CommentsQuery = {},
    signal?: AbortSignal,
  ): Promise<CommentsApiResponse> {
    return request<CommentsApiResponse>(
      `/games/${encodeURIComponent(gameSlug)}/comments`,
      { limit, sort, userEmail: CURRENT_USER_EMAIL },
      signal,
    );
  },
};
