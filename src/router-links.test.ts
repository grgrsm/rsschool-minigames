// @vitest-environment jsdom
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { initRouter, subscribe, updateActiveNavLinks } from '@/router';

/** The app is served from a sub-path (see `base` in the Vite config). */
const BASE = '/rsschool-minigames';

beforeAll(() => {
  vi.stubGlobal('scrollTo', vi.fn<() => void>());
  window.history.replaceState(null, '', `${BASE}/`);
  initRouter();
});

describe('links', () => {
  it('handles in-app link clicks without a page load', () => {
    const listener = vi.fn<() => void>();
    subscribe(listener);
    const link = document.createElement('a');
    link.href = `${BASE}/library?page=3`;
    document.body.append(link);

    link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));

    expect(window.location.pathname).toBe(`${BASE}/library`);
    expect(listener).toHaveBeenCalledTimes(1);
    link.remove();
  });

  it('leaves in-page anchors, other origins and modified clicks to the browser', () => {
    const pathBefore = window.location.pathname;
    const anchor = document.createElement('a');
    anchor.href = '#section';
    const external = document.createElement('a');
    external.href = 'https://example.com/library';
    const plain = document.createElement('a');
    plain.href = `${BASE}/library`;
    document.body.append(anchor, external, plain);

    const events = [
      anchor.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })),
      external.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })),
      plain.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true }),
      ),
    ];

    expect(events).toEqual([true, true, true]);
    expect(window.location.pathname).toBe(pathBefore);
    anchor.remove();
    external.remove();
    plain.remove();
  });

  it('marks the nav link of the current route', () => {
    const home = document.createElement('a');
    home.className = 'header__nav-link';
    home.href = `${BASE}/`;
    const library = document.createElement('a');
    library.className = 'header__nav-link';
    library.href = `${BASE}/library`;
    document.body.append(home, library);

    updateActiveNavLinks('library');

    expect(library.classList.contains('header__nav-link--active')).toBe(true);
    expect(home.classList.contains('header__nav-link--active')).toBe(false);
    home.remove();
    library.remove();
  });
});
