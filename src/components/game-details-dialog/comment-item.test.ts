// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createCommentItem } from '@/components/game-details-dialog/comment-item';
import type { CommentDto } from '@/types/api';
import { createAvatarPalette } from '@/utils/avatar';

const comment: CommentDto = {
  commentId: 'c-1',
  authorName: 'maria',
  text: 'Loved it',
  likesCount: 4,
  isLikedByCurrentUser: true,
  createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
};

function deps(random = () => 0) {
  return {
    palette: createAvatarPalette(random),
    requireUser: vi.fn<() => { email: string } | null>().mockReturnValue(null),
    toggleLike: vi.fn(),
    notify: vi.fn(),
  };
}

describe('comment item', () => {
  it('shows the author, time and text', () => {
    const item = createCommentItem(comment, deps());

    expect(item.querySelector('.game-details__comment-name')?.textContent).toBe('maria');
    expect(item.querySelector('.game-details__comment-text')?.textContent).toBe('Loved it');
    expect(item.querySelector('.game-details__comment-time')?.textContent).toContain('2');
  });

  it('shows the upper-cased initial of the author in the avatar', () => {
    const item = createCommentItem(comment, deps());

    expect(item.querySelector('.game-details__avatar')?.textContent).toBe('M');
  });

  it('colors the avatar with one of the avatar tokens', () => {
    const item = createCommentItem(
      comment,
      deps(() => 0.5),
    );

    expect(item.querySelector('.game-details__avatar')?.classList).toContain(
      'game-details__avatar--color-3',
    );
  });

  it('gives the same commenter the same color in every comment', () => {
    const shared = deps(Math.random);

    const first = createCommentItem(comment, shared);
    const second = createCommentItem({ ...comment, commentId: 'c-2' }, shared);

    expect(first.querySelector('.game-details__avatar')?.className).toBe(
      second.querySelector('.game-details__avatar')?.className,
    );
  });

  it('inserts user text as text, never as HTML', () => {
    const item = createCommentItem(
      { ...comment, authorName: '<b>x</b>', text: '<img src=x onerror="alert(1)">' },
      deps(),
    );

    expect(item.querySelector('img')).toBeNull();
    expect(item.querySelector('b')).toBeNull();
    expect(item.querySelector('.game-details__comment-text')?.textContent).toBe(
      '<img src=x onerror="alert(1)">',
    );
  });

  it('shows the like state the server reported for the current user', () => {
    const item = createCommentItem(comment, deps());
    const like = item.querySelector('.game-details__comment-like');

    expect(like?.getAttribute('aria-pressed')).toBe('true');
    expect(like?.textContent).toContain('4');
  });

  it('treats a missing like state (a guest) as not liked', () => {
    const forGuest: CommentDto = {
      commentId: 'c-1',
      authorName: 'maria',
      text: 'Loved it',
      likesCount: 4,
      createdAt: comment.createdAt,
    };

    const item = createCommentItem(forGuest, deps());

    expect(item.querySelector('.game-details__comment-like')?.getAttribute('aria-pressed')).toBe(
      'false',
    );
  });
});
