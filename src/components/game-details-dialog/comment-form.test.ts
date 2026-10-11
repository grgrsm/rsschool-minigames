// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/apiService';
import { createCommentForm, toAuthorName } from '@/components/game-details-dialog/comment-form';
import type { CommentForm } from '@/components/game-details-dialog/comment-form';
import type { NewCommentDto } from '@/types/api';
import type { AuthUser } from '@/types/auth';

const alex: AuthUser = { fullName: 'alex gamer', initials: 'AG', email: 'alex@minigames.com' };

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

const requireUser = vi.fn<() => AuthUser | null>();
const createComment = vi.fn<(slug: string, comment: NewCommentDto) => Promise<unknown>>();
const onPosted = vi.fn<() => void>();
const notify = vi.fn<(message: string, variant: 'error' | 'warning') => void>();

let form: CommentForm;

function textarea(): HTMLTextAreaElement {
  const element = form.element.querySelector('textarea');
  if (element === null) {
    throw new Error('textarea not found');
  }
  return element;
}

function submitButton(): HTMLButtonElement {
  const element = form.element.querySelector<HTMLButtonElement>('button[type="submit"]');
  if (element === null) {
    throw new Error('submit button not found');
  }
  return element;
}

function type(value: string): void {
  textarea().value = value;
  textarea().dispatchEvent(new Event('input', { bubbles: true }));
}

function submit(): void {
  form.element.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}

function pressEnter(init: KeyboardEventInit = {}): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key: 'Enter',
    bubbles: true,
    cancelable: true,
    ...init,
  });
  textarea().dispatchEvent(event);
  return event;
}

async function settled(): Promise<void> {
  await vi.waitFor(() => {
    expect(form.element.getAttribute('aria-busy')).toBe('false');
  });
}

beforeEach(() => {
  requireUser.mockReset().mockReturnValue(alex);
  createComment.mockReset();
  onPosted.mockReset();
  notify.mockReset();
  form = createCommentForm({ requireUser, createComment, onPosted, notify });
  document.body.replaceChildren(form.element);
  form.setGame('tetris');
  form.setUser(alex);
});

describe('toAuthorName', () => {
  it('uses the profile name', () => {
    expect(toAuthorName({ fullName: 'Alex Gamer', email: 'a@b.co' })).toBe('Alex Gamer');
    expect(toAuthorName({ fullName: '  Alex  ', email: 'a@b.co' })).toBe('Alex');
  });

  it('keeps at most 30 characters', () => {
    const name = toAuthorName({ fullName: 'A'.repeat(45), email: 'a@b.co' });
    expect(name).toBe('A'.repeat(30));
  });

  it('does not cut a character in half', () => {
    const name = toAuthorName({ fullName: '😀'.repeat(40), email: 'a@b.co' });
    expect(Array.from(name)).toHaveLength(30);
  });

  it('falls back to the email name when the profile name is too short', () => {
    expect(toAuthorName({ fullName: 'A', email: 'alex.gamer@school.dev' })).toBe('alex.gamer');
  });

  it('falls back to a neutral name when nothing usable is left', () => {
    expect(toAuthorName({ fullName: ' ', email: 'a@b.co' })).toBe('Player');
    expect(toAuthorName({ fullName: 'A', email: '@b.co' })).toBe('Player');
  });
});

describe('comment form for a guest', () => {
  beforeEach(() => {
    form.setUser(null);
  });

  it('is locked and says why', () => {
    expect(form.element.classList.contains('is-locked')).toBe(true);
    expect(textarea().readOnly).toBe(true);
    expect(textarea().placeholder).toBe('Log in to write a comment');
    expect(submitButton().disabled).toBe(true);
  });

  it('shows a generic avatar', () => {
    expect(form.element.querySelector('.game-details__avatar svg')).not.toBeNull();
  });

  it('sends a guest who clicks the field to Auth', () => {
    textarea().click();

    expect(requireUser).toHaveBeenCalledTimes(1);
  });

  it('never sends a request', () => {
    requireUser.mockReturnValue(null);

    submit();

    expect(createComment).not.toHaveBeenCalled();
  });
});

describe('comment form for a signed-in user', () => {
  it('is unlocked and shows the initial of the author name', () => {
    expect(form.element.classList.contains('is-locked')).toBe(false);
    expect(textarea().readOnly).toBe(false);
    expect(textarea().placeholder).toBe('Write a comment...');
    expect(form.element.querySelector('.game-details__avatar')?.textContent).toBe('A');
  });

  it('posts the trimmed text with the author name and email', async () => {
    createComment.mockResolvedValue({});
    type('  Great game!  ');

    submit();
    await settled();

    expect(createComment).toHaveBeenCalledWith('tetris', {
      userEmail: 'alex@minigames.com',
      authorName: 'alex gamer',
      text: 'Great game!',
    });
  });

  it('locks the form while the request is pending', () => {
    createComment.mockReturnValue(deferred<unknown>().promise);
    type('Hello');

    submit();

    expect(form.element.getAttribute('aria-busy')).toBe('true');
    expect(textarea().readOnly).toBe(true);
    expect(submitButton().disabled).toBe(true);
    expect(form.element.classList.contains('is-pending')).toBe(true);
  });

  it('sends a repeated submit only once', () => {
    createComment.mockReturnValue(deferred<unknown>().promise);
    type('Hello');

    submit();
    submit();

    expect(createComment).toHaveBeenCalledTimes(1);
  });

  it('clears the box, unlocks and asks for a refresh after the server accepted it', async () => {
    createComment.mockResolvedValue({});
    type('Hello');

    submit();
    await settled();

    expect(textarea().value).toBe('');
    expect(textarea().readOnly).toBe(false);
    expect(onPosted).toHaveBeenCalledTimes(1);
    expect(notify).not.toHaveBeenCalled();
  });

  it.each(['', '   ', '\n\n'])('does not send the empty comment %j', (value) => {
    type(value);

    submit();

    expect(createComment).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledWith(expect.stringContaining('between 1 and 500'), 'warning');
  });

  it('does not send a comment over 500 characters', () => {
    type('x'.repeat(501));

    submit();

    expect(createComment).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledTimes(1);
  });

  it('accepts exactly 500 characters', async () => {
    createComment.mockResolvedValue({});
    type('x'.repeat(500));

    submit();
    await settled();

    expect(createComment).toHaveBeenCalledTimes(1);
  });

  it('limits the field to 500 characters', () => {
    expect(textarea().maxLength).toBe(500);
  });
});

describe('failures', () => {
  it('keeps the text and unlocks after a rejected request', async () => {
    createComment.mockRejectedValue(new ApiError('Request failed with status 400', 'http', 400));
    type('Hello');

    submit();
    await settled();

    expect(notify).toHaveBeenCalledWith('Could not post your comment. Please try again.', 'error');
    expect(textarea().value).toBe('Hello');
    expect(textarea().readOnly).toBe(false);
    expect(onPosted).not.toHaveBeenCalled();
  });

  it('says the result is unknown after a lost connection and does not resend', async () => {
    createComment.mockRejectedValue(new ApiError('Network error', 'network'));
    type('Hello');

    submit();
    await settled();

    expect(notify).toHaveBeenCalledWith(expect.stringContaining('could not confirm'), 'warning');
    expect(textarea().value).toBe('Hello');
    expect(createComment).toHaveBeenCalledTimes(1);
  });

  it('lets the user send the kept text again', async () => {
    createComment.mockRejectedValueOnce(new ApiError('boom', 'http', 500));
    type('Hello');
    submit();
    await settled();

    createComment.mockResolvedValueOnce({});
    submit();
    await settled();

    expect(createComment).toHaveBeenCalledTimes(2);
    expect(textarea().value).toBe('');
  });

  it('drops the answer for a game that is no longer shown', async () => {
    const request = deferred<unknown>();
    createComment.mockReturnValue(request.promise);
    type('Hello');
    submit();

    form.setGame('chess');
    request.resolve({});
    await Promise.resolve();
    await Promise.resolve();

    expect(onPosted).not.toHaveBeenCalled();
    expect(textarea().readOnly).toBe(false);
  });
});

describe('keyboard', () => {
  it('posts on Enter', () => {
    createComment.mockReturnValue(deferred<unknown>().promise);
    type('Hello');

    const event = pressEnter();

    expect(event.defaultPrevented).toBe(true);
    expect(createComment).toHaveBeenCalledTimes(1);
  });

  it('inserts a new line on Shift+Enter instead of posting', () => {
    type('Hello');

    const event = pressEnter({ shiftKey: true });

    expect(event.defaultPrevented).toBe(false);
    expect(createComment).not.toHaveBeenCalled();
  });

  it('ignores the Enter that confirms an IME composition', () => {
    type('こんにちは');

    pressEnter({ isComposing: true });

    expect(createComment).not.toHaveBeenCalled();
  });
});

describe('textarea height', () => {
  function setScrollHeight(value: number): void {
    Object.defineProperty(textarea(), 'scrollHeight', { value, configurable: true });
  }

  it('grows with its content', () => {
    setScrollHeight(48);
    type('line 1\nline 2');

    expect(textarea().style.height).toBe('48px');
    expect(textarea().style.overflowY).toBe('hidden');
  });

  it('stops at its maximum height and scrolls inside', () => {
    textarea().style.maxHeight = '120px';
    setScrollHeight(300);
    type('many lines');

    expect(textarea().style.height).toBe('120px');
    expect(textarea().style.overflowY).toBe('auto');
  });

  it('shrinks back after the text was posted', async () => {
    createComment.mockResolvedValue({});
    setScrollHeight(96);
    type('a\nb\nc');
    expect(textarea().style.height).toBe('96px');

    setScrollHeight(24);
    submit();
    await settled();

    expect(textarea().style.height).toBe('24px');
  });
});
