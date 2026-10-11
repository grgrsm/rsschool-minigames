import { ApiError } from '@/api/apiService';
import type { FavoriteResultDto } from '@/types/api';
import { el } from '@/utils/dom';
import { icons } from '@/utils/icons';

export interface FavoriteButtonDeps {
  /** Returns the signed-in user, or `null` after sending a guest to the Auth dialog. */
  requireUser: () => { email: string } | null;
  toggleFavorite: (slug: string, email: string) => Promise<FavoriteResultDto>;
  /** Called with the server's answer, e.g. to refresh the game's likes count. */
  onToggled: (result: FavoriteResultDto) => void;
  notify: (message: string, variant: 'error' | 'warning') => void;
}

export interface FavoriteButton {
  element: HTMLButtonElement;
  /** Shows a game (and whether the current user favorited it), discarding any pending request. */
  setGame: (slug: string, isFavorited: boolean) => void;
}

const LABEL_ADD = 'Add to Favorites';
const LABEL_ADDED = 'Added to Favorites';
const LABEL_PENDING = 'Updating…';
const MESSAGE_FAILED = 'Could not update your favorites. Please try again.';
const MESSAGE_UNKNOWN =
  'We could not confirm that your favorites changed. Check the heart before trying again.';

export function createFavoriteButton(deps: FavoriteButtonDeps): FavoriteButton {
  let slug: string | null = null;
  let isFavorited = false;
  let isPending = false;
  /** Bumped whenever the shown game changes, so a late answer for an old game is dropped. */
  let generation = 0;

  const label = el('span', { className: 'game-details__favorite-label', text: LABEL_ADD });
  const button = el(
    'button',
    {
      className: 'game-details__favorite',
      attrs: { type: 'button', 'aria-pressed': false, 'aria-busy': false },
    },
    [
      el('span', {
        className: 'game-details__favorite-icon',
        html: icons.heart,
        attrs: { 'aria-hidden': true },
      }),
      el('span', { className: 'game-details__favorite-spinner', attrs: { 'aria-hidden': true } }),
      label,
    ],
  );

  function render(): void {
    button.setAttribute('aria-pressed', String(isFavorited));
    button.setAttribute('aria-busy', String(isPending));
    button.classList.toggle('is-active', isFavorited);
    button.classList.toggle('is-loading', isPending);
    button.disabled = isPending;

    if (isPending) {
      label.textContent = LABEL_PENDING;
    } else {
      label.textContent = isFavorited ? LABEL_ADDED : LABEL_ADD;
    }
  }

  async function toggle(): Promise<void> {
    if (isPending || slug === null) {
      return;
    }

    const user = deps.requireUser();
    if (user === null) {
      return;
    }

    const requestedSlug = slug;
    const requestGeneration = generation;
    isPending = true;
    render();

    try {
      const result = await deps.toggleFavorite(requestedSlug, user.email);
      if (requestGeneration === generation) {
        // The server decides: the control follows its answer, not a local guess.
        isFavorited = result.isFavorited;
        deps.onToggled(result);
      }
    } catch (error) {
      // A toggle must never be replayed automatically: if the first request did reach the
      // server, a second one would undo it. The user decides whether to try again.
      if (requestGeneration === generation) {
        const unknown = error instanceof ApiError && error.isOutcomeUnknown;
        deps.notify(unknown ? MESSAGE_UNKNOWN : MESSAGE_FAILED, unknown ? 'warning' : 'error');
      }
    } finally {
      if (requestGeneration === generation) {
        isPending = false;
        render();
      }
    }
  }

  button.addEventListener('click', () => {
    void toggle();
  });

  render();

  return {
    element: button,
    setGame: (nextSlug, nextIsFavorited) => {
      generation += 1;
      slug = nextSlug;
      isFavorited = nextIsFavorited;
      isPending = false;
      render();
    },
  };
}
