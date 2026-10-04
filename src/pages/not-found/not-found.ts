import { navigate } from '@/router';
import { el } from '@/utils/dom';

/** 404 page. The button navigates through the router, so the page is not reloaded. */
export function createNotFoundPage(): HTMLElement {
  const button = el('button', {
    className: 'not-found__button',
    attrs: { type: 'button' },
    text: 'Return to Home Page',
  });

  button.addEventListener('click', () => navigate('/'));

  return el(
    'section',
    { className: 'not-found', attrs: { 'aria-labelledby': 'not-found-title' } },
    [
      el('p', { className: 'not-found__code', text: '404' }),
      el('h1', {
        className: 'not-found__title',
        attrs: { id: 'not-found-title' },
        text: 'Page Not Found',
      }),
      el('p', {
        className: 'not-found__text',
        text: 'The page you are looking for does not exist or has been moved.',
      }),
      button,
    ],
  );
}
