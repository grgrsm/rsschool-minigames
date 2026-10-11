import { apiService, isAbortError } from '@/api/apiService';
import { createCommentForm } from '@/components/game-details-dialog/comment-form';
import { createCommentItem } from '@/components/game-details-dialog/comment-item';
import { createFavoriteButton } from '@/components/game-details-dialog/favorite-button';
import type { GameDetails, TopRecord } from '@/types/game';
import { createEmptyState } from '@/components/feedback/empty-state';
import { createErrorBanner, getErrorMessage } from '@/components/feedback/error-banner';
import { createSkeleton } from '@/components/feedback/skeleton';
import { showSnackbar } from '@/components/feedback/snackbar';
import { closeGameModal, openGameModal } from '@/router';
import { requireAuthenticatedUser } from '@/state/protected-action';
import { sessionStore } from '@/state/session';
import type { AuthUser } from '@/types/auth';
import { createAvatarPalette } from '@/utils/avatar';
import { el, formatCount } from '@/utils/dom';
import { icons } from '@/utils/icons';
import { getPublicUrl } from '@/utils/public-url';

export interface GameDetailsDialogApi {
  element: HTMLDialogElement;
  /** Opens the dialog immediately (pushing `?game=<slug>`) and shows a loading skeleton. */
  openLoading: (slug: string) => void;
  /** Fills in the fetched game and starts loading its comments. */
  open: (game: GameDetails) => void;
  /** Replaces the dialog's content with an error banner + Retry, without closing it. */
  showError: (message: string, onRetry: () => void) => void;
  /**
   * The dedicated "Game Not Found" modal state (distinct from a retryable error):
   * a 404 means the slug just doesn't exist, so there's nothing a Retry would fix.
   * The dialog stays open — closing it (X, backdrop, Escape, Back) is what clears
   * the bad slug from the URL, same as any other close.
   */
  showNotFound: () => void;
  /** Closes the dialog without touching the URL — used when the URL already changed (popstate). */
  close: () => void;
}

/** `GameDetails.genre` isn't typed as a fixed union (unlike the list endpoint's `category`),
 * so just capitalize whatever the API sends rather than assuming a particular casing. */
function capitalize(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

function createChip(label: string): { chip: HTMLElement; value: HTMLElement } {
  const value = el('span', { className: 'game-details__chip-value' });
  const chip = el('div', { className: 'game-details__chip' }, [
    el('span', { className: 'game-details__chip-label', text: label }),
    value,
  ]);
  return { chip, value };
}

function createRecordItem(record: TopRecord): HTMLElement {
  return el('li', { className: 'game-details__record' }, [
    el('span', { className: 'game-details__record-who' }, [
      el('span', { attrs: { 'aria-hidden': true }, text: record.medal }),
      el('span', { className: 'game-details__record-name', text: record.name }),
    ]),
    el('span', { className: 'game-details__record-meta' }, [
      el('span', { className: 'game-details__record-score', text: record.score }),
      el('span', { className: 'game-details__record-time', text: record.timeAgo }),
    ]),
  ]);
}

function getCurrentUser(): AuthUser | null {
  const state = sessionStore.getState();
  return state.status === 'authenticated' ? state.user : null;
}

/** The signed-in user's email, or `undefined` for a guest (who must not send one). */
function getUserEmail(): string | undefined {
  return getCurrentUser()?.email;
}

export function createGameDetailsDialog(): GameDetailsDialogApi {
  const dialog = el('dialog', {
    className: 'game-details',
    attrs: { 'aria-labelledby': 'game-details-title' },
  });

  const closeBtn = el('button', {
    className: 'game-details__close',
    attrs: { type: 'button', 'aria-label': 'Close dialog' },
    html: icons.close,
  });
  const coverImage = el('img', {
    className: 'game-details__cover-image',
    attrs: { src: '', alt: '', width: 460, height: 215 },
  });
  const cover = el('div', { className: 'game-details__cover' }, [coverImage, closeBtn]);

  const title = el('h2', {
    className: 'game-details__title',
    attrs: { id: 'game-details-title' },
    text: 'Game details',
  });
  const ratingValue = el('span', { text: '' });
  const likesValue = el('span', { text: '' });
  const stats = el('div', { className: 'game-details__stats' }, [
    el('span', { className: 'game-details__stat' }, [
      el('span', {
        className: 'game-details__stat-icon',
        html: icons.star,
        attrs: { 'aria-hidden': true },
      }),
      ratingValue,
    ]),
    el('span', { className: 'game-details__stat' }, [
      el('span', {
        className: 'game-details__stat-icon game-details__stat-icon--likes',
        html: icons.heart,
        attrs: { 'aria-hidden': true },
      }),
      likesValue,
    ]),
  ]);
  const header = el('div', { className: 'game-details__header' }, [title, stats]);

  const description = el('p', { className: 'game-details__description' });

  const genreChip = createChip('Genre');
  const playersChip = createChip('Players');
  const durationChip = createChip('Duration');
  const priceChip = createChip('Price');
  const chips = el('div', { className: 'game-details__chips' }, [
    genreChip.chip,
    playersChip.chip,
    durationChip.chip,
    priceChip.chip,
  ]);

  const playBtn = el('button', {
    className: 'game-details__play',
    attrs: { type: 'button' },
    text: 'Play Now',
  });
  const favorite = createFavoriteButton({
    requireUser: requireAuthenticatedUser,
    toggleFavorite: (slug, email) => apiService.toggleFavorite(slug, email),
    // The server's answer also carries the game's new total of favorites.
    onToggled: (result) => {
      likesValue.textContent = formatCount(result.likesCount);
    },
    notify: showSnackbar,
  });
  const actions = el('div', { className: 'game-details__actions' }, [playBtn, favorite.element]);

  // Populated per-game in `open()` from the API's own `topRecords` — not static mock data.
  const recordsList = el('ol', { className: 'game-details__records-list' });
  const records = el(
    'section',
    { className: 'game-details__records', attrs: { 'aria-label': 'Top records' } },
    [
      el('h3', { className: 'game-details__section-title' }, [
        el('span', { attrs: { 'aria-hidden': true }, text: '🏆' }),
        el('span', { text: 'Top Records' }),
      ]),
      recordsList,
    ],
  );

  let currentSlug: string | null = null;
  /** Gives every commenter a random avatar color that stays the same while this game is shown. */
  let avatarPalette = createAvatarPalette();

  const commentForm = createCommentForm({
    requireUser: requireAuthenticatedUser,
    createComment: (slug, comment) => apiService.createComment(slug, comment),
    // The server's list is the truth: reload it (and its total) instead of patching locally.
    onPosted: () => {
      if (currentSlug !== null) {
        void loadComments(currentSlug);
      }
    },
    notify: showSnackbar,
  });
  // Locks the form for a guest and unlocks it for a signed-in user — also while the dialog
  // is open, e.g. when the session expires or the user logs in from the Auth dialog.
  sessionStore.subscribe(() => {
    commentForm.setUser(getCurrentUser());
  });

  // Swapped between a skeleton, an error banner and the real `<ul>` of comments
  // as `loadComments` below goes through its lifecycle.
  const commentsSlot = el('div', { className: 'game-details__comments-slot' });
  const commentsTitle = el('h3', {
    className: 'game-details__section-title game-details__section-title--plain',
    text: 'Comments',
  });
  const comments = el(
    'section',
    { className: 'game-details__comments', attrs: { 'aria-label': 'Comments' } },
    [commentsTitle, commentForm.element, commentsSlot],
  );

  let commentsController: AbortController | null = null;

  async function loadComments(slug: string): Promise<void> {
    commentsController?.abort();
    const controller = new AbortController();
    commentsController = controller;

    commentsSlot.setAttribute('aria-busy', 'true');
    commentsSlot.replaceChildren(createSkeleton('leaderboard', 3));

    try {
      const { data, meta } = await apiService.getGameComments(
        slug,
        { limit: 3, sort: 'newest', userEmail: getUserEmail() },
        controller.signal,
      );
      commentsSlot.setAttribute('aria-busy', 'false');
      // `meta.totalComments` is the real count for the game; `data.length` is
      // just whatever `limit` trimmed it to (here, at most 3).
      commentsTitle.textContent = `Comments (${meta.totalComments})`;
      commentsSlot.replaceChildren(
        data.length === 0
          ? createEmptyState('No comments yet')
          : el(
              'ul',
              { className: 'game-details__comments-list' },
              data.map((comment) =>
                createCommentItem(comment, {
                  palette: avatarPalette,
                  requireUser: requireAuthenticatedUser,
                  toggleLike: (commentId, email) => apiService.toggleCommentLike(commentId, email),
                  notify: showSnackbar,
                }),
              ),
            ),
      );
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }
      commentsSlot.setAttribute('aria-busy', 'false');
      commentsSlot.replaceChildren(
        createErrorBanner(getErrorMessage(error), () => void loadComments(slug)),
      );
    }
  }

  // Holds [cover, body] so the whole thing can be swapped for a loading
  // skeleton or an error banner while the game itself is being fetched.
  const body = el('div', { className: 'game-details__body' }, [
    header,
    description,
    chips,
    actions,
    records,
    comments,
  ]);
  const contentSlot = el('div', { className: 'game-details__content-slot' });
  const card = el('div', { className: 'game-details__card' }, [contentSlot]);
  dialog.append(card);
  document.body.append(dialog);

  function showLoadedContent(): void {
    contentSlot.setAttribute('aria-busy', 'false');
    contentSlot.replaceChildren(cover, body);
  }

  closeBtn.addEventListener('click', () => closeGameModal());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) {
      closeGameModal();
    }
  });
  // Escape fires `cancel` before `close` and does not touch the URL on its own.
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeGameModal();
  });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('no-scroll');
    commentsController?.abort();
  });

  const api: GameDetailsDialogApi = {
    element: dialog,
    openLoading: (slug: string) => {
      title.textContent = 'Loading…';
      contentSlot.setAttribute('aria-busy', 'true');
      contentSlot.replaceChildren(createSkeleton('modal'));

      document.body.classList.add('no-scroll');
      if (!dialog.open) {
        dialog.showModal();
      }
      openGameModal(slug);
    },
    showNotFound: () => {
      contentSlot.setAttribute('aria-busy', 'false');
      contentSlot.replaceChildren(createEmptyState('Game Not Found'));
    },
    showError: (message: string, onRetry: () => void) => {
      contentSlot.setAttribute('aria-busy', 'false');
      contentSlot.replaceChildren(createErrorBanner(message, onRetry));
    },
    open: (game: GameDetails) => {
      coverImage.src = game.heroImage;
      coverImage.alt = game.name;
      // The API's `heroImage` sometimes points at an asset this project doesn't actually
      // ship — fall back once to the same card thumbnail used in Library/the carousel.
      coverImage.onerror = () => {
        coverImage.onerror = null;
        coverImage.src = getPublicUrl(`/assets/images/games/${game.slug}-card.jpg`);
      };
      // Defensive against fields a future API response might omit — a missing
      // field shows a placeholder instead of crashing the whole dialog.
      title.textContent = game.name || 'Untitled game';
      ratingValue.textContent = typeof game.rating === 'number' ? game.rating.toFixed(1) : '—';
      likesValue.textContent = formatCount(game.likesCount ?? 0);
      description.textContent = game.fullDescription || '';
      genreChip.value.textContent = game.genre ? capitalize(game.genre) : '—';
      playersChip.value.textContent = game.players || '—';
      durationChip.value.textContent = game.duration || '—';
      priceChip.value.textContent = game.price || '—';
      favorite.setGame(game.slug, game.isFavorited);
      if (game.slug !== currentSlug) {
        avatarPalette = createAvatarPalette();
      }
      currentSlug = game.slug;
      commentForm.setGame(game.slug);
      commentForm.setUser(getCurrentUser());
      recordsList.replaceChildren(...game.topRecords.map(createRecordItem));

      showLoadedContent();
      void loadComments(game.slug);
    },
    close: () => {
      if (dialog.open) {
        dialog.close();
      }
    },
  };

  return api;
}
