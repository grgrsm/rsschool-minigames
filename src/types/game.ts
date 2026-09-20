export type GameCategory = 'puzzle' | 'card' | 'match' | 'farm' | 'strategy' | 'arcade';

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
}

export interface GamesResponse {
  data: GameItem[];
  meta: {
    totalItems: number;
    description: string;
    featuredCount: number;
  };
}
