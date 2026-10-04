import type { GameCategory, GameDetails, GameItem, GamePlayers, TopRecord } from '@/types/game';
import type { GameDto, GameDetailsDto, TopRecordDto } from '@/types/api';
import { formatTimeAgo } from '@/utils/timeAgo';
import { getPublicUrl } from '@/utils/public-url';

const MEDALS = ['🥇', '🥈', '🥉'];

/**
 * The backend returns `category`/`players` as free-form strings; the app's UI
 * types narrow them to a fixed set of literals. Cast at the boundary (here)
 * rather than scattering `as` throughout the components that consume `GameItem`.
 *
 * `cardImage` is resolved through `getPublicUrl` here too: the API returns root-relative
 * paths (`/assets/images/games/...`) that only work when the site is served from the
 * domain root, which it isn't under this project's `base: '/rsschool-minigames/'`.
 * Doing it once at this boundary means every consumer of `GameItem` (library cards,
 * carousel) gets a working URL for free.
 */
export function toGameItem(dto: GameDto): GameItem {
  return {
    slug: dto.slug,
    name: dto.name,
    category: dto.category as GameCategory,
    price: dto.price,
    shortDescription: dto.shortDescription,
    rating: dto.rating,
    likesCount: dto.likesCount,
    cardImage: getPublicUrl(dto.cardImage),
    featured: dto.featured,
    players: dto.players as GamePlayers,
    duration: dto.duration,
  };
}

function toTopRecord(dto: TopRecordDto): TopRecord {
  return {
    medal: MEDALS[dto.position - 1] ?? `#${dto.position}`,
    name: dto.playerName,
    score: `${dto.score.toLocaleString('en-US')} pts`,
    timeAgo: formatTimeAgo(dto.achievedAt),
  };
}

/**
 * `GET /games/{gameSlug}` is a genuinely different shape from the list endpoint
 * (see `GameDetailsDto`) — this flattens `specs` and resolves `heroImage`/`topRecords`
 * for the Game Details dialog. `isLikedByCurrentUser` is intentionally not mapped:
 * it's only meaningful once the (Story 4) `userEmail` query param is sent.
 */
export function toGameDetails(dto: GameDetailsDto): GameDetails {
  return {
    slug: dto.slug,
    name: dto.name,
    heroImage: getPublicUrl(dto.heroImage),
    rating: dto.rating,
    likesCount: dto.likesCount,
    fullDescription: dto.fullDescription,
    genre: dto.specs.genre,
    players: dto.specs.players,
    duration: dto.specs.duration,
    price: dto.specs.price,
    topRecords: dto.topRecords.map(toTopRecord),
  };
}
