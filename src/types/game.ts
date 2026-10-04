export type GameCategory = 'puzzle' | 'card' | 'match' | 'farm' | 'strategy' | 'arcade';
export type GamePlayers = 'Solo' | 'Multiplayer';

export interface GameItem {
  slug: string;
  name: string;
  category: GameCategory;
  price: string;
  shortDescription: string;
  rating: number;
  likesCount: number;
  cardImage: string;
  featured: boolean;
  players: GamePlayers;
  duration: string;
}

/** A single leaderboard entry shown in the Game Details dialog's "Top Records" section. */
export interface TopRecord {
  medal: string;
  name: string;
  score: string;
  timeAgo: string;
}

/**
 * The Game Details dialog's own model — deliberately separate from `GameItem`:
 * `GET /games/{gameSlug}` returns a materially different shape than the list
 * endpoint (`heroImage`/`fullDescription`/flattened specs instead of
 * `cardImage`/`shortDescription`/`category`), so flattening it to this shape
 * at the API boundary (see `toGameDetails` in `src/api/mappers.ts`) keeps the
 * dialog's rendering code free of DTO-shaped field names.
 */
export interface GameDetails {
  slug: string;
  name: string;
  heroImage: string;
  rating: number;
  likesCount: number;
  fullDescription: string;
  genre: string;
  players: string;
  duration: string;
  price: string;
  topRecords: TopRecord[];
}
