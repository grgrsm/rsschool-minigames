// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';

import type * as RouterNamespace from '@/router';

type RouterModule = typeof RouterNamespace;

/** The app is served from a sub-path (see `base` in the Vite config). */
const BASE = '/rsschool-minigames';

async function loadRouter(path: string): Promise<RouterModule> {
  vi.resetModules();
  window.history.replaceState(null, '', `${BASE}${path}`);
  const router = await import('@/router');
  router.initRouter();
  return router;
}

let backSpy: MockInstance<() => void>;

beforeEach(() => {
  vi.stubGlobal('scrollTo', vi.fn<() => void>());
  // The real `back()` would move the shared jsdom history and hide later pushes.
  backSpy = vi.spyOn(window.history, 'back').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('navigation', () => {
  it('keeps the hash when a query parameter changes', async () => {
    const router = await loadRouter('/library?category=puzzle#results');

    router.updateSearchParams({ page: '2' });

    expect(window.location.search).toBe('?category=puzzle&page=2');
    expect(window.location.hash).toBe('#results');
  });

  it('keeps the hash when navigating within the same document', async () => {
    const router = await loadRouter('/#top');

    router.navigate('/library#grid');

    expect(window.location.pathname).toBe(`${BASE}/library`);
    expect(window.location.hash).toBe('#grid');
  });

  it('notifies subscribers with the route and params', async () => {
    const router = await loadRouter('/');
    const listener = vi.fn<(location: { route: string; params: URLSearchParams }) => void>();
    router.subscribe(listener);

    router.navigate('/library?page=2');

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0]?.[0].route).toBe('library');
    expect(listener.mock.calls[0]?.[0].params.get('page')).toBe('2');
  });

  it('does not notify when nothing changed', async () => {
    const router = await loadRouter('/library?page=2');
    const listener = vi.fn<() => void>();
    router.subscribe(listener);

    router.navigate('/library?page=2');

    expect(listener).not.toHaveBeenCalled();
  });

  it('resolves routes and falls back to not-found', async () => {
    const router = await loadRouter('/');

    expect(router.resolveRoute('/')).toBe('home');
    expect(router.resolveRoute('/home')).toBe('home');
    expect(router.resolveRoute('/library/')).toBe('library');
    expect(router.resolveRoute('/nowhere')).toBe('not-found');
  });

  it('builds hrefs for known routes', async () => {
    const router = await loadRouter('/');

    expect(router.routeHref('library')).toBe(`${BASE}/library`);
    expect(router.withBase('library')).toBe(`${BASE}/library`);
  });

  it('strips a trailing slash from the address on start', async () => {
    await loadRouter('/library/?page=2');

    expect(window.location.pathname).toBe(`${BASE}/library`);
    expect(window.location.search).toBe('?page=2');
  });
});

describe('game modal URL', () => {
  it('pushes the slug so Back can close the modal', async () => {
    const router = await loadRouter('/library?page=2');
    const before = window.history.length;

    router.openGameModal('tetris');

    expect(router.getGameSlug(new URLSearchParams(window.location.search))).toBe('tetris');
    expect(window.location.search).toContain('page=2');
    expect(window.history.length).toBe(before + 1);
  });

  it('steps back when the modal was opened by the app', async () => {
    const router = await loadRouter('/library');
    router.openGameModal('tetris');

    router.closeGameModal();

    expect(backSpy).toHaveBeenCalledTimes(1);
  });

  it('rewrites the URL in place for a deep link', async () => {
    const router = await loadRouter('/library?game=tetris&page=2');
    const before = window.history.length;

    router.closeGameModal();

    expect(window.location.search).toBe('?page=2');
    expect(window.history.length).toBe(before);
  });

  it('does nothing when no game is open', async () => {
    const router = await loadRouter('/library');

    router.closeGameModal();

    expect(backSpy).not.toHaveBeenCalled();
  });

  it('reads an empty slug as no game', async () => {
    const router = await loadRouter('/');

    expect(router.getGameSlug(new URLSearchParams('game='))).toBeNull();
  });
});

describe('auth modal URL', () => {
  it('reads only the known tabs', async () => {
    const router = await loadRouter('/');

    expect(router.getAuthTab(new URLSearchParams('auth=login'))).toBe('login');
    expect(router.getAuthTab(new URLSearchParams('auth=register'))).toBe('register');
    expect(router.getAuthTab(new URLSearchParams('auth=admin'))).toBeNull();
    expect(router.getAuthTab(new URLSearchParams(''))).toBeNull();
  });

  it('pushes the tab so Back can close the dialog', async () => {
    const router = await loadRouter('/library');
    const before = window.history.length;

    router.openAuthModal('register');

    expect(window.location.search).toBe('?auth=register');
    expect(window.history.length).toBe(before + 1);
  });

  it('steps back when the dialog was opened by the app', async () => {
    const router = await loadRouter('/library');
    router.openAuthModal('login');

    router.closeAuthModal();

    expect(backSpy).toHaveBeenCalledTimes(1);
  });

  it('removes only auth, in place, keeping the path, other params and the hash', async () => {
    const router = await loadRouter('/library?game=tetris&auth=login&page=2#results');
    const before = window.history.length;

    router.clearAuthParam();

    expect(window.location.pathname).toBe(`${BASE}/library`);
    expect(window.location.search).toBe('?game=tetris&page=2');
    expect(window.location.hash).toBe('#results');
    expect(window.history.length).toBe(before);
  });

  it('rewrites a deep link in place when closed', async () => {
    const router = await loadRouter('/?auth=login');
    const before = window.history.length;

    router.closeAuthModal();

    expect(window.location.search).toBe('');
    expect(window.history.length).toBe(before);
  });

  it('does nothing when no dialog is open', async () => {
    const router = await loadRouter('/');

    router.closeAuthModal();

    expect(backSpy).not.toHaveBeenCalled();
  });
});
