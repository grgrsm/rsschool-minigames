import { ApiError } from '@/api/apiService';
import { el } from '@/utils/dom';

const FALLBACK_MESSAGE = 'Something went wrong. Please try again.';

/** Maps any thrown value to a short, user-facing message. */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.kind === 'network') {
      return 'Network error. Check your connection and try again.';
    }
    if (error.kind === 'timeout') {
      return 'The server took too long to respond.';
    }
    if (error.isRetryable) {
      return 'The server is having trouble right now.';
    }
    if (error.isNotFound) {
      return 'We could not find what you were looking for.';
    }
  }
  return FALLBACK_MESSAGE;
}

/** Error state with a Retry button that re-runs the failed request. */
export function createErrorBanner(message: string, onRetry: () => void): HTMLElement {
  const retryButton = el('button', {
    className: 'feedback-banner__retry',
    attrs: { type: 'button' },
    text: 'Retry',
  });

  retryButton.addEventListener('click', onRetry);

  return el(
    'div',
    { className: 'feedback-banner feedback-banner--error', attrs: { role: 'alert' } },
    [
      el('p', { className: 'feedback-banner__title', text: 'Failed to load data' }),
      el('p', { className: 'feedback-banner__message', text: message }),
      retryButton,
    ],
  );
}
