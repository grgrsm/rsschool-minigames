/**
 * DTOs for the MiniGames backend API (Story 3).
 * Base URL: https://faxb76kxra.execute-api.eu-central-1.amazonaws.com/api
 * Swagger:  https://faxb76kxra.execute-api.eu-central-1.amazonaws.com/api-docs
 */

/* ------------------------------ Generic wrappers ------------------------------ */

export interface PaginationMeta {
  page: number;
  totalPages: number;
  total: number;
}

/** Every collection endpoint responds with `{ data: T, meta?: PaginationMeta }`. */
export interface ApiResponse<T> {
  data: T;
  meta?: PaginationMeta;
}

/* --------------------------------- Query params -------------------------------- */

export type GamesSort = 'rating-desc' | 'rating-asc' | 'name-asc' | 'name-desc';
export type CommentsSort = 'newest' | 'oldest';

export const DEFAULT_GAMES_SORT: GamesSort = 'rating-desc';

/** Query for `GET /games` (Library). Every field is optional. */
export interface GamesQuery {
  featured?: boolean;
  category?: string;
  sort?: GamesSort;
  page?: number;
  limit?: number;
}

/** Query for `GET /games/{gameSlug}/comments`. */
export interface CommentsQuery {
  limit?: number;
  sort?: CommentsSort;
}

/* ----------------------------------- Entities ---------------------------------- */

export interface CategoryDto {
  slug: string;
  label: string;
  isDefault?: boolean;
}

export interface GameDto {
  slug: string;
  name: string;
  category: string;
  price: string;
  shortDescription: string;
  rating: number;
  likesCount: number;
  cardImage: string;
  featured: boolean;
  players: string;
  duration: string;
}

/** Nested under `GameDetailsDto.specs` — confirmed against the live `GET /games/{gameSlug}`. */
export interface GameSpecsDto {
  genre: string;
  players: string;
  duration: string;
  price: string;
}

/** One entry of `GameDetailsDto.topRecords` — real per-game leaderboard data (not a mock). */
export interface TopRecordDto {
  position: number;
  playerName: string;
  score: number;
  /** ISO 8601 date, fed into `formatTimeAgo`. */
  achievedAt: string;
}

/**
 * `GET /games/{gameSlug}` — a materially different shape from the list endpoint's
 * `GameDto`: no `category`/`cardImage`/`shortDescription`, instead `heroImage`,
 * `fullDescription`, and `specs.{genre,players,duration,price}`. `isLikedByCurrentUser`
 * only reflects something real when the (optional) `userEmail` query param is sent —
 * out of scope for Story 3 (authenticated features are Story 4), so it's not requested.
 */
export interface GameDetailsDto {
  slug: string;
  name: string;
  heroImage: string;
  rating: number;
  likesCount: number;
  isLikedByCurrentUser?: boolean;
  fullDescription: string;
  specs: GameSpecsDto;
  topRecords: TopRecordDto[];
}

export interface LeaderboardPlayerDto {
  rank: number;
  playerName: string;
  gamesPlayed: number;
  totalScore: number;
  streakDays: number;
  favoriteGameSlug: string;
  favoriteGameName: string;
}

/** `GET /games/{gameSlug}/comments` — confirmed against the live Swagger example. */
export interface CommentDto {
  commentId: string;
  authorName: string;
  text: string;
  likesCount: number;
  isLikedByCurrentUser?: boolean;
  /** ISO 8601 date, fed into `formatTimeAgo`. */
  createdAt: string;
}

/**
 * Not the generic `PaginationMeta` — per the Swagger description, `totalComments`
 * is always the full count for the game even when `limit` trims `data`, and that's
 * the number the "Comments (N)" heading should show (not `data.length`).
 */
export interface CommentsMeta {
  totalComments: number;
  returnedCount: number;
  sort?: string;
}

/* ------------------------------- Typed responses ------------------------------- */

export type GamesApiResponse = ApiResponse<GameDto[]>;
export type CategoriesApiResponse = ApiResponse<CategoryDto[]>;
export type LeaderboardApiResponse = ApiResponse<LeaderboardPlayerDto[]>;
export interface CommentsApiResponse {
  data: CommentDto[];
  meta: CommentsMeta;
}
