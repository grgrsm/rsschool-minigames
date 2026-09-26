/**
 * Minimal hash router. The project stays a single-page app — no extra
 * HTML files are created. Navigation is driven by the `hashchange` event
 * and a single `<main>` slot whose children are swapped per route.
 */
export type Route = 'home' | 'library';

const ROUTE_HASHES: Record<Route, string> = {
  home: '#home',
  library: '#library',
};

export function getRouteFromHash(hash: string): Route {
  return hash === ROUTE_HASHES.library ? 'library' : 'home';
}

/**
 * Header and burger-menu markup already ships with `header__nav-link` /
 * `burger-menu__nav-link` anchors and their `--active` modifier styles
 * (see header.scss / burger-menu.scss) — this only toggles the class
 * based on the current route, without touching those components.
 */
export function updateActiveNavLinks(route: Route): void {
  const activeHash = ROUTE_HASHES[route];
  const navLinks = document.querySelectorAll<HTMLAnchorElement>(
    '.header__nav-link, .burger-menu__nav-link',
  );

  navLinks.forEach((link) => {
    const activeClass = link.classList.contains('header__nav-link')
      ? 'header__nav-link--active'
      : 'burger-menu__nav-link--active';
    link.classList.toggle(activeClass, link.getAttribute('href') === activeHash);
  });
}
