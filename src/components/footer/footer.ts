import { el } from '@/utils/dom';
import { icons } from '@/utils/icons';

interface FooterLinkColumn {
  title: string;
  links: string[];
}

const COLUMNS: FooterLinkColumn[] = [
  { title: 'Explore', links: ['Home', 'Library', 'Categories', 'Tournaments'] },
  { title: 'Company', links: ['About Us', 'Contact', 'Privacy Policy', 'Terms of Service'] },
];

const SOCIAL_ICONS = [icons.socialX, icons.chat, icons.socialShare];

function createColumn(column: FooterLinkColumn): HTMLElement {
  return el('div', { className: 'footer__column' }, [
    el('h3', { className: 'footer__column-title', text: column.title }),
    el(
      'ul',
      { className: 'footer__column-list' },
      column.links.map((label) =>
        el('li', {}, [el('a', { className: 'footer__link', attrs: { href: '#' }, text: label })]),
      ),
    ),
  ]);
}

export function createFooter(): HTMLElement {
  const brand = el('div', { className: 'footer__brand' }, [
    el('a', { className: 'footer__logo', attrs: { href: '#home' } }, [
      el('img', {
        className: 'footer__logo-icon',
        attrs: { src: '/assets/images/logo.png', alt: '', width: 28, height: 28 },
      }),
      el('span', { text: 'MiniGames' }),
    ]),
    el('p', {
      className: 'footer__tagline',
      text: 'Take a short break and have fun. Hundreds of curated casual mini-games right in your web browser. No download required.',
    }),
  ]);

  const communityColumn = el('div', { className: 'footer__column' }, [
    el('h3', { className: 'footer__column-title', text: 'Community' }),
    el(
      'div',
      { className: 'footer__socials' },
      SOCIAL_ICONS.map((icon, index) =>
        el('a', {
          className: 'footer__social-link',
          attrs: { href: '#', 'aria-label': `Community link ${index + 1}` },
          html: icon,
        }),
      ),
    ),
  ]);

  const linksRow = el('div', { className: 'footer__links' }, [
    ...COLUMNS.map((column) => createColumn(column)),
    communityColumn,
  ]);

  const topRow = el('div', { className: 'footer__top' }, [brand, linksRow]);

  const rsBadge = el('a', {
  className: 'footer__badge',
  attrs: {
    href: 'https://wearecommunity.io/events/js-fe-short-track-2026q3',
    target: '_blank',
    rel: 'noopener noreferrer',
  },
  }, [
    el('img', {
      className: 'footer__badge-icon',
      attrs: {
        src: '/assets/images/rs-logo.png',
        alt: '',
        width: 14,
        height: 14,
      },
    }),
    el('span', { text: 'RS School' }),
  ]);

  const studentHandle = el('a', {
    className: 'footer__student',
    attrs: {
      href: 'https://github.com/grgrsm',
      target: '_blank',
      rel: 'noopener noreferrer',
    }, 
  }, 
  
  [
 el('img', {
      className: 'footer__badge-icon',
      attrs: {
        src: '/assets/images/student-icon.png',
        alt: '',
        width: 14,
        height: 14,
      },
    }),
    el('span', { text: '@student-nickname' }),
  ]);


  const bottomRow = el('div', { className: 'footer__bottom' }, [
    el('p', { text: `\u00A9 ${new Date().getFullYear()} MiniGames. All rights reserved.` }),
    rsBadge,
    studentHandle,
    el('p', { text: 'Designed with love' }),
  ]);

  const footer = el('footer', { className: 'footer' }, [
    el('div', { className: 'footer__container' }, [topRow, bottomRow]),
  ]);

  return footer;
}
