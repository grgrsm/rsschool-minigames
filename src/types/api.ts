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
export type CommentsSort = 'newest';

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

/** `GET /games/{gameSlug}` — TODO: align extra fields with Swagger. */
export interface GameDetailsDto extends GameDto {
  description?: string;
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

/** `GET /games/{gameSlug}/comments` — TODO: align fields with Swagger. */
export interface CommentDto {
  id: string;
  author: string;
  text: string;
  /** ISO 8601 date, fed into `formatTimeAgo`. */
  createdAt: string;
}

/* ------------------------------- Typed responses ------------------------------- */

export type GamesApiResponse = ApiResponse<GameDto[]>;
export type CategoriesApiResponse = ApiResponse<CategoryDto[]>;
export type LeaderboardApiResponse = ApiResponse<LeaderboardPlayerDto[]>;
export type CommentsApiResponse = ApiResponse<CommentDto[]>;
