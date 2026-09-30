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
