/**
 * Custom SPA router on top of the History API. The URL is the single source of truth:
 * every navigation (link click, filter change, modal open) goes through `navigate`,
 * and the app reacts to it through `subscribe`.
 *
 * The site is served under Vite's `base` (e.g. `/rsschool-minigames/`), so every path the
 * rest of the app works with is base-less (`/library`) and converted only at the boundary.
 */
export type RouteName = 'home' | 'library' | 'not-found';
export type KnownRouteName = Exclude<RouteName, 'not-found'>;

export interface RouteLocation {
  route: RouteName;
  params: URLSearchParams;
}

export interface NavigateOptions {
  replace?: boolean;
  state?: HistoryState;
}

interface HistoryState {
  gameModal?: boolean;
}

type Listener = (location: RouteLocation) => void;

export const GAME_PARAM = 'game';

const BASE_PATH = normalizeBase(import.meta.env.BASE_URL);

const ROUTES = new Map<string, KnownRouteName>([
  ['/', 'home'],
  ['/home', 'home'],
  ['/library', 'library'],
]);

const ROUTE_PATHS: Record<KnownRouteName, string> = {
  home: '/',
  library: '/library',
};

const listeners = new Set<Listener>();
let lastKey = '';
let isInitialized = false;

/* --------------------------------- Path helpers --------------------------------- */

function normalizeBase(base: string): string {
  return base.replace(/\/+$/, '');
}

function normalizePath(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, '');
  return trimmed === '' ? '/' : trimmed;
}

function isInsideBase(pathname: string): boolean {
  return pathname === BASE_PATH || pathname.startsWith(`${BASE_PATH}/`);
}

function stripBase(pathname: string): string {
  return isInsideBase(pathname) ? normalizePath(pathname.slice(BASE_PATH.length)) : pathname;
}

/** `/library` → `/rsschool-minigames/library`. */
export function withBase(path: string): string {
  return `${BASE_PATH}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Real `href` for a known route, so links work even before JS handles the click. */
export function routeHref(route: KnownRouteName): string {
  return withBase(ROUTE_PATHS[route]);
}

export function resolveRoute(path: string): RouteName {
  return ROUTES.get(normalizePath(path)) ?? 'not-found';
}

function currentKey(): string {
  return `${window.location.pathname}${window.location.search}`;
}

function isHistoryState(value: unknown): value is HistoryState {
  return typeof value === 'object' && value !== null;
}

/* ----------------------------------- Public API ---------------------------------- */

export function getLocation(): RouteLocation {
  return {
    route: resolveRoute(stripBase(window.location.pathname)),
    params: new URLSearchParams(window.location.search),
  };
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit(): void {
  const key = currentKey();

  // Hash-only changes (`#tournaments`) also fire `popstate` — nothing to re-render then.
  if (key === lastKey) {
    return;
  }

  lastKey = key;
  const location = getLocation();
  listeners.forEach((listener) => listener(location));
}

/** Navigate to an app path (without base), e.g. `/library?category=puzzle&page=2`. */
export function navigate(to: string, options: NavigateOptions = {}): void {
  const url = new URL(withBase(to), window.location.origin);
  const target = `${url.pathname}${url.search}`;

  if (target === currentKey()) {
    return;
  }

  const pathChanged = url.pathname !== window.location.pathname;
  const state = options.state ?? null;

  if (options.replace) {
    window.history.replaceState(state, '', target);
  } else {
    window.history.pushState(state, '', target);
  }

  emit();

  if (pathChanged && !options.replace) {
    window.scrollTo(0, 0);
  }
}

/** Sets (string) or removes (`null`) query params on the current path. */
export function updateSearchParams(
  patch: Record<string, string | null>,
  options: NavigateOptions = {},
): void {
  const params = new URLSearchParams(window.location.search);

  Object.entries(patch).forEach(([key, value]) => {
    if (value === null) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
  });

  const query = params.toString();
  const path = normalizePath(stripBase(window.location.pathname));

  navigate(`${path}${query ? `?${query}` : ''}`, options);
}

/* --------------------------------- Game modal URL -------------------------------- */

export function getGameSlug(params: URLSearchParams): string | null {
  const slug = params.get(GAME_PARAM);
  return slug ? slug : null;
}

/** Pushes `?game=<slug>`, so the browser Back button closes the modal. */
export function openGameModal(slug: string): void {
  updateSearchParams({ [GAME_PARAM]: slug }, { state: { gameModal: true } });
}

/**
 * Removes `game` from the URL. If this modal was opened by us, step back in history
 * (no duplicate entries); if it came from a deep link, just rewrite the URL in place.
 */
export function closeGameModal(): void {
  if (getGameSlug(new URLSearchParams(window.location.search)) === null) {
    return;
  }

  const state: unknown = window.history.state;

  if (isHistoryState(state) && state.gameModal) {
    window.history.back();
    return;
  }

  updateSearchParams({ [GAME_PARAM]: null }, { replace: true });
}

/* ------------------------------------ Links -------------------------------------- */

function handleLinkClick(event: MouseEvent): void {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    !(event.target instanceof Element)
  ) {
    return;
  }

  const anchor = event.target.closest('a');

  if (!anchor || anchor.hasAttribute('download') || (anchor.target && anchor.target !== '_self')) {
    return;
  }

  // Pure in-page anchors (`#tournaments`, `#`) stay with the browser.
  if (anchor.getAttribute('href')?.startsWith('#')) {
    return;
  }

  const url = new URL(anchor.href, window.location.href);

  if (url.origin !== window.location.origin || !isInsideBase(url.pathname)) {
    return;
  }

  event.preventDefault();
  navigate(`${stripBase(url.pathname)}${url.search}`);
}

/** Marks the nav link that matches the current route (header and burger menu). */
export function updateActiveNavLinks(route: RouteName): void {
  const navLinks = document.querySelectorAll<HTMLAnchorElement>(
    '.header__nav-link, .burger-menu__nav-link',
  );

  navLinks.forEach((link) => {
    const activeClass = link.classList.contains('header__nav-link')
      ? 'header__nav-link--active'
      : 'burger-menu__nav-link--active';
    const isHashLink = link.getAttribute('href')?.startsWith('#') ?? true;
    const linkRoute = isHashLink ? 'not-found' : resolveRoute(stripBase(link.pathname));

    link.classList.toggle(activeClass, route !== 'not-found' && linkRoute === route);
  });
}

/** Call once on startup, before the first render. */
export function initRouter(): void {
  if (isInitialized) {
    return;
  }
  isInitialized = true;

  // `/library/` → `/library`: keeps relative asset URLs resolving to the same folder.
  const { pathname, search } = window.location;
  const canonical = pathname === '/' ? pathname : pathname.replace(/\/+$/, '');
  if (canonical !== pathname && isInsideBase(canonical)) {
    window.history.replaceState(window.history.state, '', `${canonical}${search}`);
  }

  lastKey = currentKey();
  window.addEventListener('popstate', emit);
  document.addEventListener('click', handleLinkClick);
}
