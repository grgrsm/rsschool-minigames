import { el } from '@/utils/dom';

/** Shown when the API answers successfully but returns 0 items. */
export function createEmptyState(message = 'Data Not Found'): HTMLElement {
  return el(
    'div',
    { className: 'feedback-banner feedback-banner--empty', attrs: { role: 'status' } },
    [el('p', { className: 'feedback-banner__title', text: message })],
  );
}
