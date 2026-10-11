// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/apiService';
import { createFavoriteButton } from '@/components/game-details-dialog/favorite-button';
import type { FavoriteButton } from '@/components/game-details-dialog/favorite-button';
import type { FavoriteResultDto } from '@/types/api';

const user = { email: 'alex@minigames.com' };

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

const requireUser = vi.fn<() => { email: string } | null>();
const toggleFavorite = vi.fn<(slug: string, email: string) => Promise<FavoriteResultDto>>();
const onToggled = vi.fn<(result: FavoriteResultDto) => void>();
const notify = vi.fn<(message: string, variant: 'error' | 'warning') => void>();

let favorite: FavoriteButton;

function labelText(): string {
  return favorite.element.querySelector('.game-details__favorite-label')?.textContent ?? '';
}

async function settled(): Promise<void> {
  await vi.waitFor(() => {
    expect(favorite.element.getAttribute('aria-busy')).toBe('false');
  });
}

beforeEach(() => {
  requireUser.mockReset().mockReturnValue(user);
  toggleFavorite.mockReset();
  onToggled.mockReset();
  notify.mockReset();
  favorite = createFavoriteButton({ requireUser, toggleFavorite, onToggled, notify });
  favorite.setGame('tetris', false);
});

describe('favorite button', () => {
  it('shows whether the current user favorited the game', () => {
    expect(labelText()).toBe('Add to Favorites');
    expect(favorite.element.getAttribute('aria-pressed')).toBe('false');

    favorite.setGame('tetris', true);

    expect(labelText()).toBe('Added to Favorites');
    expect(favorite.element.getAttribute('aria-pressed')).toBe('true');
    expect(favorite.element.classList.contains('is-active')).toBe(true);
  });

  it('sends nothing for a guest', () => {
    requireUser.mockReturnValue(null);

    favorite.element.click();

    expect(toggleFavorite).not.toHaveBeenCalled();
    expect(favorite.element.getAttribute('aria-pressed')).toBe('false');
    expect(favorite.element.disabled).toBe(false);
  });

  it('asks the API for the current game and user', () => {
    toggleFavorite.mockReturnValue(deferred<FavoriteResultDto>().promise);

    favorite.element.click();

    expect(toggleFavorite).toHaveBeenCalledWith('tetris', 'alex@minigames.com');
  });

  it('locks the control and shows loading while the request is pending', () => {
    toggleFavorite.mockReturnValue(deferred<FavoriteResultDto>().promise);

    favorite.element.click();

    expect(favorite.element.disabled).toBe(true);
    expect(favorite.element.getAttribute('aria-busy')).toBe('true');
    expect(favorite.element.classList.contains('is-loading')).toBe(true);
    expect(labelText()).toBe('Updating…');
  });

  it('does not guess: the state only changes once the server answers', async () => {
    const request = deferred<FavoriteResultDto>();
    toggleFavorite.mockReturnValue(request.promise);

    favorite.element.click();
    expect(favorite.element.getAttribute('aria-pressed')).toBe('false');

    request.resolve({ isFavorited: true, likesCount: 12 });
    await settled();

    expect(favorite.element.getAttribute('aria-pressed')).toBe('true');
    expect(labelText()).toBe('Added to Favorites');
    expect(onToggled).toHaveBeenCalledWith({ isFavorited: true, likesCount: 12 });
  });

  it('follows the server even when it disagrees with a local flip', async () => {
    favorite.setGame('tetris', true);
    toggleFavorite.mockResolvedValue({ isFavorited: true, likesCount: 3 });

    favorite.element.click();
    await settled();

    expect(favorite.element.getAttribute('aria-pressed')).toBe('true');
  });

  it('removes the favorite when the server says it was removed', async () => {
    favorite.setGame('tetris', true);
    toggleFavorite.mockResolvedValue({ isFavorited: false, likesCount: 2 });

    favorite.element.click();
    await settled();

    expect(favorite.element.getAttribute('aria-pressed')).toBe('false');
    expect(labelText()).toBe('Add to Favorites');
  });

  it('ignores clicks while a request is pending', () => {
    toggleFavorite.mockReturnValue(deferred<FavoriteResultDto>().promise);

    favorite.element.click();
    favorite.element.click();

    expect(toggleFavorite).toHaveBeenCalledTimes(1);
  });

  it('keeps the state, unlocks and reports an error after a rejected request', async () => {
    toggleFavorite.mockRejectedValue(new ApiError('Request failed with status 500', 'http', 500));

    favorite.element.click();
    await settled();

    expect(notify).toHaveBeenCalledWith(
      'Could not update your favorites. Please try again.',
      'error',
    );
    expect(favorite.element.getAttribute('aria-pressed')).toBe('false');
    expect(favorite.element.disabled).toBe(false);
    expect(toggleFavorite).toHaveBeenCalledTimes(1);
  });

  it('says the result is unknown after a lost connection and does not replay the request', async () => {
    toggleFavorite.mockRejectedValue(new ApiError('Network error', 'network'));

    favorite.element.click();
    await settled();

    expect(notify).toHaveBeenCalledWith(expect.stringContaining('could not confirm'), 'warning');
    expect(toggleFavorite).toHaveBeenCalledTimes(1);
    expect(favorite.element.disabled).toBe(false);
  });

  it('lets the user try again after a failure', async () => {
    toggleFavorite.mockRejectedValueOnce(new ApiError('boom', 'http', 500));
    favorite.element.click();
    await settled();

    toggleFavorite.mockResolvedValueOnce({ isFavorited: true, likesCount: 9 });
    favorite.element.click();
    await vi.waitFor(() => {
      expect(favorite.element.getAttribute('aria-pressed')).toBe('true');
    });

    expect(toggleFavorite).toHaveBeenCalledTimes(2);
  });

  it('drops the answer of a request for a game that is no longer shown', async () => {
    const request = deferred<FavoriteResultDto>();
    toggleFavorite.mockReturnValue(request.promise);
    favorite.element.click();

    favorite.setGame('chess', false);
    request.resolve({ isFavorited: true, likesCount: 50 });
    await Promise.resolve();
    await Promise.resolve();

    expect(favorite.element.getAttribute('aria-pressed')).toBe('false');
    expect(favorite.element.disabled).toBe(false);
    expect(onToggled).not.toHaveBeenCalled();
  });

  it('does nothing before a game is shown', () => {
    const idle = createFavoriteButton({ requireUser, toggleFavorite, onToggled, notify });

    idle.element.click();

    expect(requireUser).not.toHaveBeenCalled();
    expect(toggleFavorite).not.toHaveBeenCalled();
  });
});
