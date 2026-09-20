import { el } from '@/utils/dom';

export function createDevSection(): HTMLElement {
  const wrapper = el('div', { className: 'dev-section-wrapper' });

  const illustration = el('div', { className: 'dev-section__illustration' }, [
    el('img', {
      className: 'dev-section__illustration-image',
      attrs: { src: 'assets/images/dev-illustration.png', alt: '', loading: 'lazy' },
    }),
  ]);

  const card = el('div', { className: 'dev-section__card' }, [
    el('h2', { className: 'dev-section__title', text: 'Are You a Game Developer?' }),
    el('p', {
      className: 'dev-section__description',
      text: 'Want to see your game on MiniGames? We\u2019re always looking for fun, engaging mini games to add to our platform. Submit your game and reach thousands of players!',
    }),
    el('button', { className: 'dev-section__cta', attrs: { type: 'button' } }, [
      el('span', { className: 'dev-section__cta-icon' }, [
        el('img', {
          attrs: { src: 'assets/icons/upload.png', alt: '', width: 24, height: 24 },
        }),
      ]),
      el('span', { className: 'dev-section__cta-text', text: 'Submit Form' }),
    ]),
    el('p', { className: 'dev-section__contact' }, [
      'or contact us at developers@minigames.com',
    ]),
  ]);

  const section = el(
    'section',
    { className: 'dev-section', attrs: { 'aria-label': 'Are you a game developer?' } },
    [illustration, card],
  );

  wrapper.append(section);
  return wrapper;
}
