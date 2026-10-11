// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiService, isAbortError } from '@/api/apiService';

const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>();

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

/** Every call gets its own Response: a body can only be read once. */
function answer(body: unknown, status = 200): void {
  fetchMock.mockImplementation(() => Promise.resolve(jsonResponse(body, status)));
}

function lastRequest(): { url: URL; init: RequestInit } {
  const call = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
  if (!call) {
    throw new Error('fetch was not called');
  }
  return { url: new URL(call[0]), init: call[1] ?? {} };
}

async function failureOf(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof ApiError) {
      return error;
    }
    throw error;
  }
  throw new Error('Expected the request to fail');
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('GET endpoints', () => {
  it('requests featured games', async () => {
    answer({ data: [] });

    await apiService.getFeaturedGames();

    const { url, init } = lastRequest();
    expect(url.pathname.endsWith('/games')).toBe(true);
    expect(url.searchParams.get('featured')).toBe('true');
    expect(init.method).toBe('GET');
    expect(init.body).toBeUndefined();
  });

  it('requests the leaderboard and the categories', async () => {
    answer({ data: [] });

    await apiService.getLeaderboard();
    expect(lastRequest().url.pathname.endsWith('/leaderboard')).toBe(true);

    await apiService.getCategories();
    expect(lastRequest().url.pathname.endsWith('/categories')).toBe(true);
  });

  it('sends filter, sort and pagination to the backend', async () => {
    answer({ data: [] });

    await apiService.getGames({ category: 'puzzle', sort: 'name-asc', page: 2, limit: 6 });

    const { searchParams } = lastRequest().url;
    expect(searchParams.get('category')).toBe('puzzle');
    expect(searchParams.get('sort')).toBe('name-asc');
    expect(searchParams.get('page')).toBe('2');
    expect(searchParams.get('limit')).toBe('6');
  });

  it('leaves out the "all" category and fields that are not set', async () => {
    answer({ data: [] });

    await apiService.getGames({ category: 'all' });

    const { searchParams } = lastRequest().url;
    expect(searchParams.has('category')).toBe(false);
    expect(searchParams.has('page')).toBe(false);
    expect(searchParams.has('featured')).toBe(false);
  });
});

describe('game details and comments', () => {
  it('omits userEmail for a guest', async () => {
    answer({ data: { slug: 'tetris' } });

    const game = await apiService.getGameBySlug('tetris');

    expect(game).toEqual({ slug: 'tetris' });
    expect(lastRequest().url.searchParams.has('userEmail')).toBe(false);
  });

  it('sends the URL-encoded userEmail for an authenticated user', async () => {
    answer({ data: {} });

    await apiService.getGameBySlug('tetris', { userEmail: 'a+b@school.dev' });

    const { url } = lastRequest();
    expect(url.search).toContain('userEmail=a%2Bb%40school.dev');
    expect(url.searchParams.get('userEmail')).toBe('a+b@school.dev');
  });

  it('encodes the game slug in the path', async () => {
    answer({ data: {} });

    await apiService.getGameBySlug('a/b c');

    expect(lastRequest().url.pathname.endsWith('/games/a%2Fb%20c')).toBe(true);
  });

  it('asks for the 3 newest comments by default and returns data with meta', async () => {
    const payload = { data: [], meta: { totalComments: 7, returnedCount: 0 } };
    answer(payload);

    const result = await apiService.getGameComments('tetris');

    const { searchParams, pathname } = lastRequest().url;
    expect(pathname.endsWith('/games/tetris/comments')).toBe(true);
    expect(searchParams.get('limit')).toBe('3');
    expect(searchParams.get('sort')).toBe('newest');
    expect(searchParams.has('userEmail')).toBe(false);
    expect(result).toEqual(payload);
  });

  it('adds the userEmail to the comments request of an authenticated user', async () => {
    answer({ data: [], meta: {} });

    await apiService.getGameComments('tetris', { userEmail: 'me@school.dev', limit: 5 });

    const { searchParams } = lastRequest().url;
    expect(searchParams.get('userEmail')).toBe('me@school.dev');
    expect(searchParams.get('limit')).toBe('5');
  });
});

describe('authenticated mutations', () => {
  it('toggles a favorite with a POST carrying the user email', async () => {
    answer({ data: { isFavorited: true, likesCount: 11 } });

    const result = await apiService.toggleFavorite('tetris', 'me@school.dev');

    const { url, init } = lastRequest();
    expect(result).toEqual({ isFavorited: true, likesCount: 11 });
    expect(url.pathname.endsWith('/games/tetris/favorite')).toBe(true);
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ userEmail: 'me@school.dev' }));
    expect(init.headers).toMatchObject({ 'Content-Type': 'application/json' });
  });

  it('posts a comment and returns the created comment', async () => {
    const created = { commentId: 'c1', authorName: 'Alex', text: 'Nice', likesCount: 0 };
    answer({ data: created }, 201);

    const comment = { userEmail: 'me@school.dev', authorName: 'Alex', text: 'Nice' };
    const result = await apiService.createComment('tetris', comment);

    const { url, init } = lastRequest();
    expect(result).toEqual(created);
    expect(url.pathname.endsWith('/games/tetris/comments')).toBe(true);
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual(comment);
  });

  it('toggles a comment like with a POST carrying the user email', async () => {
    answer({ data: { isLikedByCurrentUser: true, likesCount: 4 } });

    const result = await apiService.toggleCommentLike('c-1', 'me@school.dev');

    const { url, init } = lastRequest();
    expect(result).toEqual({ isLikedByCurrentUser: true, likesCount: 4 });
    expect(url.pathname.endsWith('/comments/c-1/like')).toBe(true);
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ userEmail: 'me@school.dev' }));
  });

  it('never replays a mutation after a failure', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    const error = await failureOf(apiService.toggleFavorite('tetris', 'me@school.dev'));

    expect(error.kind).toBe('network');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('errors', () => {
  it('reports a missing resource as a definitive, non-retryable not-found', async () => {
    answer({}, 404);

    const error = await failureOf(apiService.getGameBySlug('nope'));

    expect(error.kind).toBe('http');
    expect(error.status).toBe(404);
    expect(error.isNotFound).toBe(true);
    expect(error.isRetryable).toBe(false);
    expect(error.isOutcomeUnknown).toBe(false);
  });

  it('treats a 5xx as retryable but still a definitive answer', async () => {
    answer({}, 503);

    const error = await failureOf(apiService.getLeaderboard());

    expect(error.isRetryable).toBe(true);
    expect(error.isOutcomeUnknown).toBe(false);
  });

  it('reports a lost connection as an unknown outcome', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    const error = await failureOf(apiService.getCategories());

    expect(error.kind).toBe('network');
    expect(error.isRetryable).toBe(true);
    expect(error.isOutcomeUnknown).toBe(true);
  });

  it('reports an unreadable success response as an unknown outcome', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(new Response('<html>', { status: 200 })));

    const error = await failureOf(apiService.toggleCommentLike('c1', 'me@school.dev'));

    expect(error.kind).toBe('parse');
    expect(error.isOutcomeUnknown).toBe(true);
  });

  it('times out a request that never answers', async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('', 'AbortError')));
        }),
    );

    const pending = failureOf(apiService.toggleFavorite('tetris', 'me@school.dev'));
    await vi.advanceTimersByTimeAsync(10_000);
    const error = await pending;

    expect(error.kind).toBe('timeout');
    expect(error.isOutcomeUnknown).toBe(true);
  });

  it('reports a cancelled request as aborted, which is not an error to show', async () => {
    const controller = new AbortController();
    fetchMock.mockImplementation(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('', 'AbortError')));
        }),
    );

    const pending = failureOf(apiService.getGameBySlug('tetris', { signal: controller.signal }));
    controller.abort();
    const error = await pending;

    expect(isAbortError(error)).toBe(true);
  });

  it('does not even start a request whose signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    const error = await failureOf(
      apiService.getGameBySlug('tetris', { signal: controller.signal }),
    );

    expect(error.kind).toBe('aborted');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('only treats aborted ApiErrors as abort errors', () => {
    expect(isAbortError(new ApiError('x', 'aborted'))).toBe(true);
    expect(isAbortError(new ApiError('x', 'network'))).toBe(false);
    expect(isAbortError(new Error('x'))).toBe(false);
  });
});
