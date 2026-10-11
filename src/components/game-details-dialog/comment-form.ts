import { ApiError } from '@/api/apiService';
import type { NewCommentDto } from '@/types/api';
import type { AuthUser } from '@/types/auth';
import { getAvatarInitial } from '@/utils/avatar';
import { el } from '@/utils/dom';
import { icons } from '@/utils/icons';

export const MAX_COMMENT_LENGTH = 500;
const MIN_AUTHOR_LENGTH = 2;
const MAX_AUTHOR_LENGTH = 30;
const FALLBACK_AUTHOR = 'Player';

const PLACEHOLDER = 'Write a comment...';
const PLACEHOLDER_GUEST = 'Log in to write a comment';
const MESSAGE_INVALID = `A comment must be between 1 and ${MAX_COMMENT_LENGTH} characters.`;
const MESSAGE_FAILED = 'Could not post your comment. Please try again.';
const MESSAGE_UNKNOWN =
  'We could not confirm that your comment was posted. Check the comments before sending it again.';

export interface CommentFormDeps {
  /** Returns the signed-in user, or `null` after sending a guest to the Auth dialog. */
  requireUser: () => AuthUser | null;
  createComment: (slug: string, comment: NewCommentDto) => Promise<unknown>;
  /** Called after the server accepted a comment, e.g. to reload the comments list. */
  onPosted: () => void;
  notify: (message: string, variant: 'error' | 'warning') => void;
}

export interface CommentForm {
  element: HTMLFormElement;
  /** Shows the form for a game: empty, unlocked, and discarding any pending request. */
  setGame: (slug: string) => void;
  /** Unlocks the form for a signed-in user, or locks it for a guest (`null`). */
  setUser: (user: AuthUser | null) => void;
}

/** The backend wants an author name of 2–30 characters; profile names are not that strict. */
export function toAuthorName(user: Pick<AuthUser, 'fullName' | 'email'>): string {
  const fromName = user.fullName.trim();
  const fromEmail = user.email.split('@')[0]?.trim() ?? '';
  const candidate = fromName.length >= MIN_AUTHOR_LENGTH ? fromName : fromEmail;
  const name = Array.from(candidate).slice(0, MAX_AUTHOR_LENGTH).join('').trim();

  return name.length >= MIN_AUTHOR_LENGTH ? name : FALLBACK_AUTHOR;
}

/** Grows the textarea with its content up to its CSS `max-height`, then scrolls inside it. */
function autosize(textarea: HTMLTextAreaElement): void {
  textarea.style.height = 'auto';

  const maxHeight = Number.parseFloat(getComputedStyle(textarea).maxHeight);
  const hasLimit = Number.isFinite(maxHeight);
  const needed = textarea.scrollHeight;

  textarea.style.height = `${hasLimit ? Math.min(needed, maxHeight) : needed}px`;
  textarea.style.overflowY = hasLimit && needed > maxHeight ? 'auto' : 'hidden';
}

export function createCommentForm(deps: CommentFormDeps): CommentForm {
  let slug: string | null = null;
  let user: AuthUser | null = null;
  let isPending = false;
  /** Bumped whenever the shown game changes, so a late answer for an old game is dropped. */
  let generation = 0;

  const avatar = el('span', { className: 'game-details__avatar game-details__avatar--you' });
  const textarea = el('textarea', {
    className: 'game-details__comment-input',
    attrs: {
      rows: 1,
      maxlength: MAX_COMMENT_LENGTH,
      placeholder: PLACEHOLDER,
      'aria-label': 'Write a comment',
    },
  });
  const submit = el('button', {
    className: 'game-details__comment-submit',
    attrs: { type: 'submit', 'aria-label': 'Post comment' },
    html: icons.send,
  });
  const form = el('form', { className: 'game-details__comment-form' }, [avatar, textarea, submit]);

  function render(): void {
    const isGuest = user === null;
    const locked = isGuest || isPending;

    form.classList.toggle('is-locked', isGuest);
    form.classList.toggle('is-pending', isPending);
    form.setAttribute('aria-busy', String(isPending));
    textarea.readOnly = locked;
    textarea.placeholder = isGuest ? PLACEHOLDER_GUEST : PLACEHOLDER;
    submit.disabled = locked;

    if (user === null) {
      avatar.innerHTML = icons.user;
    } else {
      avatar.textContent = getAvatarInitial(toAuthorName(user));
    }
  }

  async function send(text: string, author: AuthUser, targetSlug: string): Promise<void> {
    const requestGeneration = generation;
    isPending = true;
    render();

    try {
      await deps.createComment(targetSlug, {
        userEmail: author.email,
        authorName: toAuthorName(author),
        text,
      });

      if (requestGeneration === generation) {
        textarea.value = '';
        autosize(textarea);
        deps.onPosted();
      }
    } catch (error) {
      // Never resubmit automatically: if the first request did reach the server, a second one
      // would create a duplicate. The text stays in the box for the user to decide.
      if (requestGeneration === generation) {
        const unknown = error instanceof ApiError && error.isOutcomeUnknown;
        deps.notify(unknown ? MESSAGE_UNKNOWN : MESSAGE_FAILED, unknown ? 'warning' : 'error');
      }
    } finally {
      if (requestGeneration === generation) {
        isPending = false;
        render();
        textarea.focus();
      }
    }
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (isPending || slug === null) {
      return;
    }

    const author = deps.requireUser();
    if (author === null) {
      return;
    }

    const text = textarea.value.trim();
    if (text.length < 1 || text.length > MAX_COMMENT_LENGTH) {
      deps.notify(MESSAGE_INVALID, 'warning');
      return;
    }

    void send(text, author, slug);
  });

  textarea.addEventListener('input', () => autosize(textarea));

  textarea.addEventListener('keydown', (event) => {
    // Enter posts, Shift+Enter inserts a new line. Enter that confirms an IME choice is ignored.
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  // A guest who tries to write is sent to the Auth dialog. Reacting to the click (not to focus)
  // avoids reopening Auth when it closes and hands focus back to this field.
  textarea.addEventListener('click', () => {
    if (user === null) {
      deps.requireUser();
    }
  });

  render();

  return {
    element: form,
    setGame: (nextSlug) => {
      generation += 1;
      slug = nextSlug;
      isPending = false;
      textarea.value = '';
      autosize(textarea);
      render();
    },
    setUser: (nextUser) => {
      user = nextUser;
      render();
    },
  };
}
