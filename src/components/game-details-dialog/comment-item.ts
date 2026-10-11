import { createCommentLikeButton } from '@/components/game-details-dialog/comment-like-button';
import type { CommentLikeButtonDeps } from '@/components/game-details-dialog/comment-like-button';
import type { CommentDto } from '@/types/api';
import { getAvatarInitial } from '@/utils/avatar';
import type { AvatarPalette } from '@/utils/avatar';
import { el } from '@/utils/dom';
import { formatTimeAgo } from '@/utils/timeAgo';

export interface CommentItemDeps extends CommentLikeButtonDeps {
  palette: AvatarPalette;
}

/** One entry of the comments list. User text is only ever inserted as text, never as HTML. */
export function createCommentItem(comment: CommentDto, deps: CommentItemDeps): HTMLElement {
  const color = deps.palette.colorFor(comment.authorName);

  return el('li', { className: 'game-details__comment' }, [
    el('div', { className: 'game-details__comment-head' }, [
      el('span', { className: 'game-details__comment-author' }, [
        el('span', {
          className: `game-details__avatar game-details__avatar--color-${color}`,
          text: getAvatarInitial(comment.authorName),
        }),
        el('span', { className: 'game-details__comment-name', text: comment.authorName }),
      ]),
      el('span', {
        className: 'game-details__comment-time',
        text: formatTimeAgo(comment.createdAt),
      }),
    ]),
    el('p', { className: 'game-details__comment-text', text: comment.text }),
    createCommentLikeButton(
      comment.commentId,
      { isLiked: comment.isLikedByCurrentUser === true, likesCount: comment.likesCount },
      deps,
    ),
  ]);
}
