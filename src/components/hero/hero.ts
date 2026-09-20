import { el } from '@/utils/dom';

export function createHero(): HTMLElement {
  const section = el('section', {
    className: 'hero',
    attrs: { 'aria-labelledby': 'hero-title' },
  });

  // Decorative photo only — all real content (title, text, CTA) stays as
  // semantic markup in `.hero__card`, so this never substitutes for text.
  const illustration = el('div', {
    className: 'hero__illustration',
    attrs: { 'aria-hidden': true, role: 'presentation' },
  });

  const inner = el('div', { className: 'hero__inner' });

  const card = el('div', { className: 'hero__card' }, [
    el('h1', {
      className: 'hero__title',
      attrs: { id: 'hero-title' },
      text: 'Take a Short Break & Have Fun',
    }),
    el('p', {
      className: 'hero__description',
      text: 'Discover hundreds of curated casual mini-games. Play instantly in your browser — puzzle, match 3, farm, and board classics.',
    }),
    el('a', {
      className: 'hero__cta',
      attrs: { href: '#library' },
      text: 'Browse Library',
    }),
  ]);

  inner.append(card);
  section.append(illustration, inner);

  return section;
}
