import type {
  ApiResponse,
  CategoriesApiResponse,
  CommentDto,
  CommentLikeResultDto,
  CommentsApiResponse,
  CommentsQuery,
  CreatedCommentApiResponse,
  FavoriteResultDto,
  GameDetailsDto,
  GamesApiResponse,
  GamesQuery,
  LeaderboardApiResponse,
  NewCommentDto,
} from '../types/api';

const DEFAULT_API_URL = 'https://faxb76kxra.execute-api.eu-central-1.amazonaws.com/api';
const API_BASE_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined) ?? DEFAULT_API_URL;
const REQUEST_TIMEOUT_MS = 10_000;
const ALL_CATEGORIES_SLUG = 'all';

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

  /**
   * The request may or may not have reached the server (lost connection, timeout, or a
   * success response that could not be read). A mutation with this outcome must not be
   * replayed automatically: for a toggle endpoint a second POST would undo the first.
   */
  public get isOutcomeUnknown(): boolean {
    return this.kind === 'network' || this.kind === 'timeout' || this.kind === 'parse';
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

interface RequestInitOptions {
  method: 'POST';
  body: unknown;
}

async function request<T>(
  path: string,
  query?: QueryParams,
  signal?: AbortSignal,
  init?: RequestInitOptions,
): Promise<T> {
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
        method: init?.method ?? 'GET',
        headers: init
          ? { Accept: 'application/json', 'Content-Type': 'application/json' }
          : { Accept: 'application/json' },
        body: init ? JSON.stringify(init.body) : undefined,
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
   * unwrapped here. Authenticated users pass their `userEmail`, which makes
   * `isLikedByCurrentUser` reflect their favorite; guests omit it.
   */
  async getGameBySlug(
    gameSlug: string,
    { userEmail, signal }: { userEmail?: string; signal?: AbortSignal } = {},
  ): Promise<GameDetailsDto> {
    const response = await request<ApiResponse<GameDetailsDto>>(
      `/games/${encodeURIComponent(gameSlug)}`,
      { userEmail },
      signal,
    );
    return response.data;
  },

  /** Latest comments (3 by default). `userEmail` — see `getGameBySlug`. */
  getGameComments(
    gameSlug: string,
    { limit = 3, sort = 'newest', userEmail }: CommentsQuery = {},
    signal?: AbortSignal,
  ): Promise<CommentsApiResponse> {
    return request<CommentsApiResponse>(
      `/games/${encodeURIComponent(gameSlug)}/comments`,
      { limit, sort, userEmail },
      signal,
    );
  },

  /** Flips the favorite of a game for the user and returns the server's new state. */
  async toggleFavorite(gameSlug: string, userEmail: string): Promise<FavoriteResultDto> {
    const response = await request<ApiResponse<FavoriteResultDto>>(
      `/games/${encodeURIComponent(gameSlug)}/favorite`,
      undefined,
      undefined,
      { method: 'POST', body: { userEmail } },
    );
    return response.data;
  },

  /** Posts a comment and returns the created comment. */
  async createComment(gameSlug: string, comment: NewCommentDto): Promise<CommentDto> {
    const response = await request<CreatedCommentApiResponse>(
      `/games/${encodeURIComponent(gameSlug)}/comments`,
      undefined,
      undefined,
      { method: 'POST', body: comment },
    );
    return response.data;
  },

  /** Likes or unlikes a comment for the user and returns the server's new state. */
  async toggleCommentLike(commentId: string, userEmail: string): Promise<CommentLikeResultDto> {
    const response = await request<ApiResponse<CommentLikeResultDto>>(
      `/comments/${encodeURIComponent(commentId)}/like`,
      undefined,
      undefined,
      { method: 'POST', body: { userEmail } },
    );
    return response.data;
  },
};
