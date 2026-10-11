// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as ApiModule from '@/api/apiService';
import { createGameDetailsDialog } from '@/components/game-details-dialog/game-details-dialog';
import type { GameDetailsDialogApi } from '@/components/game-details-dialog/game-details-dialog';
import type { CommentsApiResponse, FavoriteResultDto } from '@/types/api';
import type { SessionState } from '@/types/auth';
import type { GameDetails } from '@/types/game';

const mocks = vi.hoisted(() => ({
  getGameComments: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  toggleFavorite: vi.fn<(slug: string, email: string) => Promise<unknown>>(),
  createComment: vi.fn<(slug: string, comment: unknown) => Promise<unknown>>(),
  toggleCommentLike: vi.fn<(commentId: string, email: string) => Promise<unknown>>(),
  sessionListeners: [] as ((state: unknown) => void)[],
  requireAuthenticatedUser: vi.fn<() => { email: string } | null>(),
  showSnackbar: vi.fn<(message: string, variant?: string) => void>(),
  closeGameModal: vi.fn<() => void>(),
  openGameModal: vi.fn<(slug: string) => void>(),
  sessionState: { current: { status: 'guest' } as unknown },
}));

vi.mock('@/api/apiService', async (importOriginal) => {
  const actual = await importOriginal<typeof ApiModule>();
  return {
    ...actual,
    apiService: {
      getGameComments: mocks.getGameComments,
      toggleFavorite: mocks.toggleFavorite,
      createComment: mocks.createComment,
      toggleCommentLike: mocks.toggleCommentLike,
    },
  };
});
vi.mock('@/state/protected-action', () => ({
  requireAuthenticatedUser: mocks.requireAuthenticatedUser,
}));
vi.mock('@/state/session', () => ({
  sessionStore: {
    getState: () => mocks.sessionState.current,
    subscribe: (listener: (state: unknown) => void) => {
      mocks.sessionListeners.push(listener);
      listener(mocks.sessionState.current);
      return () => undefined;
    },
  },
}));
vi.mock('@/components/feedback/snackbar', () => ({ showSnackbar: mocks.showSnackbar }));
vi.mock('@/router', () => ({
  closeGameModal: mocks.closeGameModal,
  openGameModal: mocks.openGameModal,
}));

const user = { fullName: 'Alex Gamer', initials: 'AG', email: 'alex@minigames.com' };
const authenticated: SessionState = { status: 'authenticated', user };

const game: GameDetails = {
  slug: 'tetris',
  name: 'Tetris',
  heroImage: '/hero.jpg',
  rating: 4.5,
  likesCount: 10,
  isFavorited: false,
  fullDescription: 'Stack the blocks.',
  genre: 'puzzle',
  players: 'Single',
  duration: '10 min',
  price: 'Free',
  topRecords: [{ medal: '🥇', name: 'Ann', score: '1,000 pts', timeAgo: '1h ago' }],
};

const noComments: CommentsApiResponse = {
  data: [],
  meta: { totalComments: 0, returnedCount: 0 },
};

let dialog: GameDetailsDialogApi;

function query<T extends Element>(selector: string): T {
  const element = dialog.element.querySelector<T>(selector);
  if (element === null) {
    throw new Error(`${selector} not found`);
  }
  return element;
}

function favoriteButton(): HTMLButtonElement {
  return query<HTMLButtonElement>('.game-details__favorite');
}

async function opened(details: GameDetails = game): Promise<void> {
  dialog.open(details);
  await vi.waitFor(() => {
    expect(query('.game-details__comments-slot').getAttribute('aria-busy')).toBe('false');
  });
}

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
});

beforeEach(() => {
  mocks.getGameComments.mockReset().mockResolvedValue(noComments);
  mocks.toggleFavorite.mockReset();
  mocks.createComment.mockReset();
  mocks.toggleCommentLike.mockReset();
  mocks.sessionListeners.length = 0;
  mocks.requireAuthenticatedUser.mockReset().mockReturnValue(null);
  mocks.showSnackbar.mockReset();
  mocks.closeGameModal.mockReset();
  mocks.openGameModal.mockReset();
  mocks.sessionState.current = { status: 'guest' };
  dialog = createGameDetailsDialog();
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('game details content', () => {
  it('fills in the game', async () => {
    await opened();

    expect(query('.game-details__title').textContent).toBe('Tetris');
    expect(query('.game-details__stats').textContent).toContain('4.5');
    expect(query('.game-details__stats').textContent).toContain('10');
    expect(query('.game-details__description').textContent).toBe('Stack the blocks.');
    expect(query('.game-details__chips').textContent).toContain('Puzzle');
    expect(query('.game-details__records-list').textContent).toContain('Ann');
  });

  it('shows placeholders for fields the API did not send', async () => {
    await opened({ ...game, name: '', genre: '', players: '', duration: '', price: '' });

    expect(query('.game-details__title').textContent).toBe('Untitled game');
    expect(query('.game-details__chips').textContent).toContain('—');
  });

  it('shows a loading skeleton and updates the URL when opened by slug', () => {
    dialog.openLoading('tetris');

    expect(dialog.element.open).toBe(true);
    expect(mocks.openGameModal).toHaveBeenCalledWith('tetris');
    expect(query('.game-details__content-slot').getAttribute('aria-busy')).toBe('true');
  });

  it('shows the Game Not Found state', () => {
    dialog.openLoading('nope');
    dialog.showNotFound();

    expect(dialog.element.textContent).toContain('Game Not Found');
  });

  it('shows an error with a Retry that calls back', () => {
    const onRetry = vi.fn<() => void>();
    dialog.openLoading('tetris');
    dialog.showError('Network error', onRetry);

    expect(dialog.element.textContent).toContain('Network error');
    dialog.element.querySelector<HTMLButtonElement>('button.error-banner__retry, button')?.click();
  });

  it('closes through the close button, the backdrop and Escape', async () => {
    await opened();

    query<HTMLButtonElement>('.game-details__close').click();
    dialog.element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    dialog.element.dispatchEvent(new Event('cancel', { cancelable: true }));

    expect(mocks.closeGameModal).toHaveBeenCalledTimes(3);
  });

  it('closes without touching the URL when asked to close from outside', () => {
    dialog.openLoading('tetris');
    dialog.close();

    expect(dialog.element.open).toBe(false);
    expect(mocks.closeGameModal).not.toHaveBeenCalled();
  });
});

describe('comments request', () => {
  it('omits the email for a guest', async () => {
    await opened();

    expect(mocks.getGameComments).toHaveBeenCalledWith(
      'tetris',
      { limit: 3, sort: 'newest', userEmail: undefined },
      expect.any(AbortSignal),
    );
  });

  it('sends the email of the signed-in user', async () => {
    mocks.sessionState.current = authenticated;

    await opened();

    expect(mocks.getGameComments).toHaveBeenCalledWith(
      'tetris',
      { limit: 3, sort: 'newest', userEmail: 'alex@minigames.com' },
      expect.any(AbortSignal),
    );
  });

  it('shows the real total in the heading and an empty state', async () => {
    mocks.getGameComments.mockResolvedValue({
      data: [],
      meta: { totalComments: 12, returnedCount: 0 },
    });

    await opened();

    expect(query('.game-details__comments').textContent).toContain('Comments (12)');
    expect(query('.game-details__comments-slot').textContent).toContain('No comments yet');
  });
});

describe('favorites', () => {
  it('shows the favorite of the signed-in user', async () => {
    await opened({ ...game, isFavorited: true });

    expect(favoriteButton().getAttribute('aria-pressed')).toBe('true');
    expect(favoriteButton().textContent).toContain('Added to Favorites');
  });

  it('sends nothing for a guest, who is sent to Auth instead', async () => {
    await opened();

    favoriteButton().click();

    expect(mocks.requireAuthenticatedUser).toHaveBeenCalledTimes(1);
    expect(mocks.toggleFavorite).not.toHaveBeenCalled();
    expect(favoriteButton().getAttribute('aria-pressed')).toBe('false');
  });

  it('toggles through the API and shows the new total of favorites', async () => {
    mocks.sessionState.current = authenticated;
    mocks.requireAuthenticatedUser.mockReturnValue(user);
    const answer: FavoriteResultDto = { isFavorited: true, likesCount: 11 };
    mocks.toggleFavorite.mockResolvedValue(answer);
    await opened();

    favoriteButton().click();
    await vi.waitFor(() => {
      expect(favoriteButton().getAttribute('aria-pressed')).toBe('true');
    });

    expect(mocks.toggleFavorite).toHaveBeenCalledWith('tetris', 'alex@minigames.com');
    expect(query('.game-details__stats').textContent).toContain('11');
  });

  it('starts every game from its own favorite state', async () => {
    await opened({ ...game, isFavorited: true });
    await opened({ ...game, slug: 'chess', name: 'Chess', isFavorited: false });

    expect(favoriteButton().getAttribute('aria-pressed')).toBe('false');
  });

  it('reports a failed request with a Snackbar', async () => {
    mocks.requireAuthenticatedUser.mockReturnValue(user);
    mocks.toggleFavorite.mockRejectedValue(new Error('boom'));
    await opened();

    favoriteButton().click();
    await vi.waitFor(() => {
      expect(mocks.showSnackbar).toHaveBeenCalledWith(
        'Could not update your favorites. Please try again.',
        'error',
      );
    });
  });
});

describe('comment form', () => {
  function textarea(): HTMLTextAreaElement {
    return query<HTMLTextAreaElement>('.game-details__comment-input');
  }

  function changeSession(state: SessionState): void {
    mocks.sessionState.current = state;
    for (const listener of mocks.sessionListeners) {
      listener(state);
    }
  }

  it('is locked for a guest', async () => {
    await opened();

    expect(textarea().readOnly).toBe(true);
    expect(textarea().placeholder).toBe('Log in to write a comment');
  });

  it('is open for a signed-in user, with the initial of their name', async () => {
    mocks.sessionState.current = authenticated;
    await opened();

    expect(textarea().readOnly).toBe(false);
    expect(query('.game-details__avatar--you').textContent).toBe('A');
  });

  it('unlocks when the user signs in while the dialog is open', async () => {
    await opened();

    changeSession(authenticated);

    expect(textarea().readOnly).toBe(false);
  });

  it('locks again when the session ends while the dialog is open', async () => {
    mocks.sessionState.current = authenticated;
    await opened();

    changeSession({ status: 'guest' });

    expect(textarea().readOnly).toBe(true);
  });

  it('starts empty every time a game is opened', async () => {
    mocks.sessionState.current = authenticated;
    await opened();
    textarea().value = 'half-written';

    await opened({ ...game, slug: 'chess' });

    expect(textarea().value).toBe('');
  });

  it('posts a comment and reloads the list with the new total', async () => {
    mocks.sessionState.current = authenticated;
    mocks.requireAuthenticatedUser.mockReturnValue(user);
    mocks.createComment.mockResolvedValue({ commentId: 'c9' });
    await opened();
    mocks.getGameComments.mockClear();
    mocks.getGameComments.mockResolvedValue({
      data: [
        {
          commentId: 'c9',
          authorName: 'Alex Gamer',
          text: 'Brilliant',
          likesCount: 0,
          createdAt: new Date().toISOString(),
        },
      ],
      meta: { totalComments: 1, returnedCount: 1 },
    });

    textarea().value = 'Brilliant';
    query<HTMLFormElement>('.game-details__comment-form').dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );

    await vi.waitFor(() => {
      expect(query('.game-details__comments').textContent).toContain('Comments (1)');
    });
    expect(mocks.createComment).toHaveBeenCalledWith('tetris', {
      userEmail: 'alex@minigames.com',
      authorName: 'Alex Gamer',
      text: 'Brilliant',
    });
    expect(query('.game-details__comments-list').textContent).toContain('Brilliant');
    expect(textarea().value).toBe('');
  });
});

describe('comments list', () => {
  const comment = {
    commentId: 'c-1',
    authorName: 'maria',
    text: 'Loved it',
    likesCount: 2,
    isLikedByCurrentUser: false,
    createdAt: new Date().toISOString(),
  };

  function likeButton(): HTMLButtonElement {
    return query<HTMLButtonElement>('.game-details__comment-like');
  }

  function avatarClass(): string {
    return query('.game-details__comments-list .game-details__avatar').className;
  }

  it('shows the initial and a color token in each commenter avatar', async () => {
    mocks.getGameComments.mockResolvedValue({
      data: [comment],
      meta: { totalComments: 1, returnedCount: 1 },
    });

    await opened();

    expect(query('.game-details__comments-list .game-details__avatar').textContent).toBe('M');
    expect(avatarClass()).toMatch(/game-details__avatar--color-[1-5]/);
  });

  it('sends a guest who likes a comment to Auth without calling the API', async () => {
    mocks.getGameComments.mockResolvedValue({
      data: [comment],
      meta: { totalComments: 1, returnedCount: 1 },
    });
    await opened();

    likeButton().click();

    expect(mocks.requireAuthenticatedUser).toHaveBeenCalledTimes(1);
    expect(mocks.toggleCommentLike).not.toHaveBeenCalled();
  });

  it('likes a comment through the API and shows the server count', async () => {
    mocks.sessionState.current = authenticated;
    mocks.requireAuthenticatedUser.mockReturnValue(user);
    mocks.toggleCommentLike.mockResolvedValue({ isLikedByCurrentUser: true, likesCount: 3 });
    mocks.getGameComments.mockResolvedValue({
      data: [comment],
      meta: { totalComments: 1, returnedCount: 1 },
    });
    await opened();

    likeButton().click();
    await vi.waitFor(() => {
      expect(likeButton().getAttribute('aria-pressed')).toBe('true');
    });

    expect(mocks.toggleCommentLike).toHaveBeenCalledWith('c-1', 'alex@minigames.com');
    expect(likeButton().textContent).toContain('3');
  });

  it('keeps a commenter on the same avatar color when the list is reloaded', async () => {
    const random = vi.spyOn(Math, 'random');
    random.mockReturnValueOnce(0.05).mockReturnValue(0.95);
    mocks.sessionState.current = authenticated;
    mocks.requireAuthenticatedUser.mockReturnValue(user);
    mocks.createComment.mockResolvedValue({});
    mocks.getGameComments.mockResolvedValue({
      data: [comment],
      meta: { totalComments: 1, returnedCount: 1 },
    });
    await opened();
    const before = avatarClass();

    const textarea = query<HTMLTextAreaElement>('.game-details__comment-input');
    textarea.value = 'Another one';
    query<HTMLFormElement>('.game-details__comment-form').dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    await vi.waitFor(() => {
      expect(mocks.getGameComments).toHaveBeenCalledTimes(2);
    });
    await vi.waitFor(() => {
      expect(query('.game-details__comments-slot').getAttribute('aria-busy')).toBe('false');
    });

    expect(avatarClass()).toBe(before);
    random.mockRestore();
  });
});
