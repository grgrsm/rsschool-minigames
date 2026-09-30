import type { GameCategory, GameItem, GamePlayers } from '@/types/game';
import type { GameDetailsDto, GameDto } from '@/types/api';

/**
 * The backend returns `category`/`players` as free-form strings; the app's UI
 * types narrow them to a fixed set of literals. Cast at the boundary (here)
 * rather than scattering `as` throughout the components that consume `GameItem`.
 */
export function toGameItem(dto: GameDto | GameDetailsDto): GameItem {
  return {
    slug: dto.slug,
    name: dto.name,
    category: dto.category as GameCategory,
    price: dto.price,
    shortDescription: dto.shortDescription,
    rating: dto.rating,
    likesCount: dto.likesCount,
    cardImage: dto.cardImage,
    featured: dto.featured,
    players: dto.players as GamePlayers,
    duration: dto.duration,
  };
}
