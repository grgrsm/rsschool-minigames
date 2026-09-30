import { apiService, isAbortError } from '@/api/apiService';
import type { GameCategory, GameItem } from '@/types/game';
import { createEmptyState } from '@/components/feedback/empty-state';
import { createErrorBanner, getErrorMessage } from '@/components/feedback/error-banner';
import { createSkeleton } from '@/components/feedback/skeleton';
import { closeGameModal, openGameModal } from '@/router';
import type { CommentDto } from '@/types/api';
import { el, formatCount } from '@/utils/dom';
import { icons } from '@/utils/icons';
import { formatTimeAgo } from '@/utils/timeAgo';

export interface GameDetailsDialogApi {
  element: HTMLDialogElement;
  /** Opens the dialog immediately (pushing `?game=<slug>`) and shows a loading skeleton. */
  openLoading: (slug: string) => void;
  /** Fills in the fetched game and starts loading its comments. */
  open: (game: GameItem) => void;
  /** Replaces the dialog's content with an error banner + Retry, without closing it. */
  showError: (message: string, onRetry: () => void) => void;
  /** Closes the dialog without touching the URL — used when the URL already changed (popstate). */
  close: () => void;
}

interface TopRecord {
  medal: string;
  name: string;
  score: string;
  timeAgo: string;
}

interface SeedComment {
  avatarIndex: 1 | 2 | 3;
  initial: string;
  name: string;
  timeAgo: string;
  text: string;
  likes: number;
}

// The provided design mocks up a single illustrative example (leaderboard-style
// "Top Records" + a handful of comments) rather than per-game social data — the
// project's mocks don't carry that content for every title, so the same sample
// set is reused across games, exactly as shown in the reference design.
const TOP_RECORDS: TopRecord[] = [
  { medal: '🥇', name: 'ForestSpirit', score: '356,700 pts', timeAgo: '2 days ago' },
  { medal: '🥈', name: 'TeaBrewer', score: '332,400 pts', timeAgo: '5 days ago' },
  { medal: '🥉', name: 'HerbalistPath', score: '308,900 pts', timeAgo: '1 week ago' },
];

function formatCategoryLabel(category: GameCategory): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
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

/** The API doesn't provide a like count for comments, so real comments always show 0. */
function toDisplayComment(dto: CommentDto, index: number): SeedComment {
  return {
    avatarIndex: ((index % 3) + 1) as 1 | 2 | 3,
    initial: dto.author.charAt(0).toUpperCase() || '?',
    name: dto.author,
    timeAgo: formatTimeAgo(dto.createdAt),
    text: dto.text,
    likes: 0,
  };
}

function createCommentItem(comment: SeedComment): HTMLElement {
  return el('li', { className: 'game-details__comment' }, [
    el('div', { className: 'game-details__comment-head' }, [
      el('span', { className: 'game-details__comment-author' }, [
        el('span', {
          className: `game-details__avatar game-details__avatar--${comment.avatarIndex}`,
          text: comment.initial,
        }),
        el('span', { className: 'game-details__comment-name', text: comment.name }),
      ]),
      el('span', { className: 'game-details__comment-time', text: comment.timeAgo }),
    ]),
    el('p', { className: 'game-details__comment-text', text: comment.text }),
    el('span', { className: 'game-details__comment-likes' }, [
      el('span', {
        className: 'game-details__comment-like-icon',
        html: icons.heart,
        attrs: { 'aria-hidden': true },
      }),
      el('span', { text: String(comment.likes) }),
    ]),
  ]);
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
  const favoriteLabel = el('span', {
    className: 'game-details__favorite-label',
    text: 'Add to Favorites',
  });
  const favoriteBtn = el(
    'button',
    {
      className: 'game-details__favorite',
      attrs: { type: 'button', 'aria-pressed': false },
    },
    [
      el('span', {
        className: 'game-details__favorite-icon',
        html: icons.heart,
        attrs: { 'aria-hidden': true },
      }),
      favoriteLabel,
    ],
  );
  favoriteBtn.addEventListener('click', () => {
    const isActive = favoriteBtn.getAttribute('aria-pressed') === 'true';
    favoriteBtn.setAttribute('aria-pressed', String(!isActive));
    favoriteBtn.classList.toggle('is-active', !isActive);
    favoriteLabel.textContent = isActive ? 'Add to Favorites' : 'Added to Favorites';
  });
  const actions = el('div', { className: 'game-details__actions' }, [playBtn, favoriteBtn]);

  const recordsList = el(
    'ol',
    { className: 'game-details__records-list' },
    TOP_RECORDS.map(createRecordItem),
  );
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

  const commentInput = el('input', {
    className: 'game-details__comment-input',
    attrs: { type: 'text', placeholder: 'Write a comment...', 'aria-label': 'Write a comment' },
  });
  const commentSubmit = el('button', {
    className: 'game-details__comment-submit',
    attrs: { type: 'submit', 'aria-label': 'Post comment' },
    html: icons.send,
  });
  const commentForm = el('form', { className: 'game-details__comment-form' }, [
    el('span', { className: 'game-details__avatar game-details__avatar--you', text: 'U' }),
    commentInput,
    commentSubmit,
  ]);
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
    [commentsTitle, commentForm, commentsSlot],
  );

  // Read-only per Story 3 — posting isn't backed by an endpoint, this only
  // prepends locally to whatever list is currently rendered (a no-op while
  // the real comments are still loading or failed to load).
  commentForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const text = commentInput.value.trim();
    const list = commentsSlot.querySelector<HTMLUListElement>('.game-details__comments-list');
    if (!text || !list) return;
    const newComment = createCommentItem({
      avatarIndex: 2,
      initial: 'U',
      name: 'You',
      timeAgo: 'just now',
      text,
      likes: 0,
    });
    list.prepend(newComment);
    commentInput.value = '';
    commentsTitle.textContent = `Comments (${list.children.length})`;
  });

  let commentsController: AbortController | null = null;

  async function loadComments(slug: string): Promise<void> {
    commentsController?.abort();
    const controller = new AbortController();
    commentsController = controller;

    commentsSlot.setAttribute('aria-busy', 'true');
    commentsSlot.replaceChildren(createSkeleton('leaderboard', 3));

    try {
      const { data } = await apiService.getGameComments(
        slug,
        { limit: 3, sort: 'newest' },
        controller.signal,
      );
      commentsSlot.setAttribute('aria-busy', 'false');
      commentsTitle.textContent = `Comments (${data.length})`;
      commentsSlot.replaceChildren(
        data.length === 0
          ? createEmptyState('No comments yet')
          : el(
              'ul',
              { className: 'game-details__comments-list' },
              data.map((comment, index) => createCommentItem(toDisplayComment(comment, index))),
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
    showError: (message: string, onRetry: () => void) => {
      contentSlot.setAttribute('aria-busy', 'false');
      contentSlot.replaceChildren(createErrorBanner(message, onRetry));
    },
    open: (game: GameItem) => {
      coverImage.src = game.cardImage;
      coverImage.alt = game.name;
      title.textContent = game.name;
      ratingValue.textContent = game.rating.toFixed(1);
      likesValue.textContent = formatCount(game.likesCount);
      description.textContent = game.shortDescription;
      genreChip.value.textContent = formatCategoryLabel(game.category);
      playersChip.value.textContent = game.players;
      durationChip.value.textContent = game.duration;
      priceChip.value.textContent = game.price;
      favoriteBtn.setAttribute('aria-pressed', 'false');
      favoriteBtn.classList.remove('is-active');
      favoriteLabel.textContent = 'Add to Favorites';

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
