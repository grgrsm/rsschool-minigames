import type { GameCategory, GameItem } from '@/types/game';
import { el, formatCount } from '@/utils/dom';
import { icons } from '@/utils/icons';

export interface GameDetailsDialogApi {
  element: HTMLDialogElement;
  open: (game: GameItem) => void;
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

const SEED_COMMENTS: SeedComment[] = [
  {
    avatarIndex: 3,
    initial: 'F',
    name: 'ForestDweller',
    timeAgo: '3 hours ago',
    text: "The hand-drawn art is absolutely magical 🍄 Every location feels like a page from a children's storybook. The mushroom village made me cry happy tears!",
    likes: 12,
  },
  {
    avatarIndex: 2,
    initial: 'H',
    name: 'HerbalTeaLover',
    timeAgo: '1 day ago',
    text: 'Perfect cozy evening game — brew a cup of chamomile, wrap in a blanket and help the little one prepare for winter. The puzzles are gentle but satisfying.',
    likes: 5,
  },
  {
    avatarIndex: 1,
    initial: 'C',
    name: 'CottageCoreMia',
    timeAgo: '3 days ago',
    text: 'I want to live inside this game forever 🌿 The NPCs are so charming, the recipes are real, and the atmosphere is pure warmth and calm.',
    likes: 8,
  },
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
  const cover = el('div', { className: 'game-details__cover' }, [closeBtn]);

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
  const commentsList = el(
    'ul',
    { className: 'game-details__comments-list' },
    SEED_COMMENTS.map(createCommentItem),
  );
  const commentsTitle = el('h3', {
    className: 'game-details__section-title game-details__section-title--plain',
    text: `Comments (${SEED_COMMENTS.length})`,
  });
  const comments = el(
    'section',
    { className: 'game-details__comments', attrs: { 'aria-label': 'Comments' } },
    [commentsTitle, commentForm, commentsList],
  );

  commentForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const text = commentInput.value.trim();
    if (!text) return;
    const newComment = createCommentItem({
      avatarIndex: 2,
      initial: 'U',
      name: 'You',
      timeAgo: 'Just now',
      text,
      likes: 0,
    });
    commentsList.prepend(newComment);
    commentInput.value = '';
    commentsTitle.textContent = `Comments (${commentsList.children.length})`;
  });

  const body = el('div', { className: 'game-details__body' }, [
    header,
    description,
    chips,
    actions,
    records,
    comments,
  ]);
  const card = el('div', { className: 'game-details__card' }, [cover, body]);
  dialog.append(card);
  document.body.append(dialog);

  closeBtn.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) {
      dialog.close();
    }
  });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('no-scroll');
  });

  const api: GameDetailsDialogApi = {
    element: dialog,
    open: (game: GameItem) => {
      cover.style.backgroundImage = `url(${game.cardImage})`;
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
      commentsTitle.textContent = `Comments (${SEED_COMMENTS.length})`;
      commentsList.replaceChildren(...SEED_COMMENTS.map(createCommentItem));

      document.body.classList.add('no-scroll');
      if (!dialog.open) {
        dialog.showModal();
      }
    },
  };

  return api;
}
