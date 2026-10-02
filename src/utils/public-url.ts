/**
 * URL of a file from `public/`, correct under any Vite `base` and from any route depth.
 *
 * Also used to resolve image paths that come back from the API (e.g. `game.cardImage`):
 * the backend returns paths like `/assets/images/games/heartopia-card.jpg`, which is
 * only correct when the site is served from the domain root. Under this project's
 * `base: '/rsschool-minigames/'` that leading-slash path 404s — it has to be rewritten
 * to include the base, exactly like the app's own static assets (logo, hero image, etc).
 * Already-absolute URLs (e.g. a CDN-hosted image) are returned unchanged.
 */
export function getPublicUrl(path: string | undefined | null): string {
  if (!path) {
    return '';
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const base = import.meta.env.BASE_URL;
  const cleanBase = base.endsWith('/') ? base : `${base}/`;
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${cleanBase}${cleanPath}`;
}
