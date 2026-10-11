import { ApiError } from '@/api/apiService';
import type { CommentLikeResultDto } from '@/types/api';
import { el } from '@/utils/dom';
import { icons } from '@/utils/icons';

export interface CommentLikeButtonDeps {
  /** Returns the signed-in user, or `null` after sending a guest to the Auth dialog. */
  requireUser: () => { email: string } | null;
  toggleLike: (commentId: string, email: string) => Promise<CommentLikeResultDto>;
  notify: (message: string, variant: 'error' | 'warning') => void;
}

const MESSAGE_FAILED = 'Could not update your like. Please try again.';
const MESSAGE_UNKNOWN =
  'We could not confirm that your like changed. Check the heart before trying again.';

/**
 * The like button of one comment. The server decides the state: the button only follows the
 * answer it gets, never a local guess, and never replays a request on its own.
 */
export function createCommentLikeButton(
  commentId: string,
  initial: { isLiked: boolean; likesCount: number },
  deps: CommentLikeButtonDeps,
): HTMLButtonElement {
  let isLiked = initial.isLiked;
  let likesCount = initial.likesCount;
  let isPending = false;

  const count = el('span', { className: 'game-details__comment-like-count' });
  const button = el(
    'button',
    {
      className: 'game-details__comment-like',
      attrs: { type: 'button', 'aria-pressed': false, 'aria-busy': false },
    },
    [
      el('span', {
        className: 'game-details__comment-like-icon',
        html: icons.heart,
        attrs: { 'aria-hidden': true },
      }),
      el('span', {
        className: 'game-details__comment-like-spinner',
        attrs: { 'aria-hidden': true },
      }),
      count,
    ],
  );

  function render(): void {
    button.setAttribute('aria-pressed', String(isLiked));
    button.setAttribute('aria-busy', String(isPending));
    button.setAttribute('aria-label', isLiked ? 'Unlike comment' : 'Like comment');
    button.classList.toggle('is-liked', isLiked);
    button.classList.toggle('is-loading', isPending);
    button.disabled = isPending;
    count.textContent = String(likesCount);
  }

  async function toggle(): Promise<void> {
    if (isPending) {
      return;
    }

    const user = deps.requireUser();
    if (user === null) {
      return;
    }

    isPending = true;
    render();

    try {
      const result = await deps.toggleLike(commentId, user.email);
      isLiked = result.isLikedByCurrentUser;
      likesCount = result.likesCount;
    } catch (error) {
      const unknown = error instanceof ApiError && error.isOutcomeUnknown;
      deps.notify(unknown ? MESSAGE_UNKNOWN : MESSAGE_FAILED, unknown ? 'warning' : 'error');
    } finally {
      isPending = false;
      render();
    }
  }

  button.addEventListener('click', () => {
    void toggle();
  });

  render();

  return button;
}
