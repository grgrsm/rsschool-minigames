// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/apiService';
import { createCommentLikeButton } from '@/components/game-details-dialog/comment-like-button';
import type { CommentLikeResultDto } from '@/types/api';

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
const toggleLike = vi.fn<(commentId: string, email: string) => Promise<CommentLikeResultDto>>();
const notify = vi.fn<(message: string, variant: 'error' | 'warning') => void>();

function create(isLiked = false, likesCount = 3): HTMLButtonElement {
  return createCommentLikeButton(
    'c-1',
    { isLiked, likesCount },
    { requireUser, toggleLike, notify },
  );
}

async function settled(button: HTMLButtonElement): Promise<void> {
  await vi.waitFor(() => {
    expect(button.getAttribute('aria-busy')).toBe('false');
  });
}

function countOf(button: HTMLButtonElement): string {
  return button.querySelector('.game-details__comment-like-count')?.textContent ?? '';
}

beforeEach(() => {
  requireUser.mockReset().mockReturnValue({ email: 'alex@minigames.com' });
  toggleLike.mockReset();
  notify.mockReset();
});

describe('comment like button', () => {
  it('shows the count and whether the current user liked the comment', () => {
    const button = create(true, 7);

    expect(countOf(button)).toBe('7');
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(button.classList.contains('is-liked')).toBe(true);
    expect(button.getAttribute('aria-label')).toBe('Unlike comment');
  });

  it('is not liked by default', () => {
    const button = create();

    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(button.getAttribute('aria-label')).toBe('Like comment');
  });

  it('sends nothing for a guest', () => {
    requireUser.mockReturnValue(null);
    const button = create();

    button.click();

    expect(toggleLike).not.toHaveBeenCalled();
    expect(button.disabled).toBe(false);
    expect(countOf(button)).toBe('3');
  });

  it('asks the API for this comment and the signed-in user', () => {
    toggleLike.mockReturnValue(deferred<CommentLikeResultDto>().promise);

    create().click();

    expect(toggleLike).toHaveBeenCalledWith('c-1', 'alex@minigames.com');
  });

  it('locks and shows loading while the request is pending', () => {
    toggleLike.mockReturnValue(deferred<CommentLikeResultDto>().promise);
    const button = create();

    button.click();

    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.classList.contains('is-loading')).toBe(true);
  });

  it('does not guess: state and count follow the server answer', async () => {
    const request = deferred<CommentLikeResultDto>();
    toggleLike.mockReturnValue(request.promise);
    const button = create(false, 3);

    button.click();
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(countOf(button)).toBe('3');

    request.resolve({ isLikedByCurrentUser: true, likesCount: 9 });
    await settled(button);

    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(countOf(button)).toBe('9');
  });

  it('removes the like when the server says so', async () => {
    toggleLike.mockResolvedValue({ isLikedByCurrentUser: false, likesCount: 2 });
    const button = create(true, 3);

    button.click();
    await settled(button);

    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(countOf(button)).toBe('2');
  });

  it('ignores clicks while a request is pending', () => {
    toggleLike.mockReturnValue(deferred<CommentLikeResultDto>().promise);
    const button = create();

    button.click();
    button.click();

    expect(toggleLike).toHaveBeenCalledTimes(1);
  });

  it('keeps the state and reports an error after a rejected request', async () => {
    toggleLike.mockRejectedValue(new ApiError('boom', 'http', 500));
    const button = create(false, 3);

    button.click();
    await settled(button);

    expect(notify).toHaveBeenCalledWith('Could not update your like. Please try again.', 'error');
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(countOf(button)).toBe('3');
    expect(button.disabled).toBe(false);
    expect(toggleLike).toHaveBeenCalledTimes(1);
  });

  it('says the result is unknown after a lost connection and does not replay', async () => {
    toggleLike.mockRejectedValue(new ApiError('Network error', 'network'));
    const button = create();

    button.click();
    await settled(button);

    expect(notify).toHaveBeenCalledWith(expect.stringContaining('could not confirm'), 'warning');
    expect(toggleLike).toHaveBeenCalledTimes(1);
  });

  it('can be retried after a failure', async () => {
    toggleLike.mockRejectedValueOnce(new ApiError('boom', 'http', 500));
    const button = create();
    button.click();
    await settled(button);

    toggleLike.mockResolvedValueOnce({ isLikedByCurrentUser: true, likesCount: 4 });
    button.click();
    await vi.waitFor(() => {
      expect(button.getAttribute('aria-pressed')).toBe('true');
    });

    expect(toggleLike).toHaveBeenCalledTimes(2);
  });
});
