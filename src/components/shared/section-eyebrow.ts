import { el } from '@/utils/dom';

/** Small label with an accent bar, used above section headings (e.g. "New Games"). */
export function createSectionEyebrow(label: string): HTMLElement {
  return el('p', { className: 'section-eyebrow' }, [
    el('span', { className: 'section-eyebrow__bar', attrs: { 'aria-hidden': true } }),
    el('span', { text: label }),
  ]);
}
