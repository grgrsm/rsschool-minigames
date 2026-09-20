import type { SessionState } from '@/types/auth';
import { sessionStore } from '@/state/session-store';
import { el } from '@/utils/dom';

import { NAV_ITEMS } from './nav-links';

export interface HeaderCallbacks {
  onLoginClick: () => void;
  onSignUpClick: () => void;
  onLogOutClick: () => void;
  onBurgerClick: () => void;
}

function renderUserBadge(fullName: string, initials: string): HTMLElement {
  return el('div', { className: 'header__user' }, [
    el('span', { className: 'header__user-avatar', text: initials }),
    el('span', { className: 'header__user-name', text: fullName }),
  ]);
}

function renderDesktopAuthArea(state: SessionState, callbacks: HeaderCallbacks): HTMLElement {
  const wrapper = el('div', { className: 'header__auth header__auth--desktop' });

  if (state.status === 'guest') {
    const loginBtn = el('button', {
      className: 'header__btn header__btn--outline',
      attrs: { type: 'button' },
      text: 'Log In',
    });
    const signUpBtn = el('button', {
      className: 'header__btn header__btn--primary',
      attrs: { type: 'button' },
      text: 'Sign Up',
    });
    loginBtn.addEventListener('click', callbacks.onLoginClick);
    signUpBtn.addEventListener('click', callbacks.onSignUpClick);
    wrapper.append(loginBtn, signUpBtn);
  } else {
    const logOutBtn = el('button', {
      className: 'header__btn header__btn--outline',
      attrs: { type: 'button' },
      text: 'Log Out',
    });
    logOutBtn.addEventListener('click', callbacks.onLogOutClick);
    wrapper.append(renderUserBadge(state.user.fullName, state.user.initials), logOutBtn);
  }

  return wrapper;
}

function renderTabletAuthArea(state: SessionState, callbacks: HeaderCallbacks): HTMLElement {
  const wrapper = el('div', { className: 'header__auth header__auth--tablet' });

  if (state.status === 'guest') {
    const signUpBtn = el('button', {
      className: 'header__btn header__btn--primary',
      attrs: { type: 'button' },
      text: 'Sign Up',
    });
    signUpBtn.addEventListener('click', callbacks.onSignUpClick);
    wrapper.append(signUpBtn);
  } else {
    const logOutBtn = el('button', {
      className: 'header__btn header__btn--outline',
      attrs: { type: 'button' },
      text: 'Log Out',
    });
    logOutBtn.addEventListener('click', callbacks.onLogOutClick);
    wrapper.append(logOutBtn);
  }

  return wrapper;
}

export function createHeader(callbacks: HeaderCallbacks): HTMLElement {
  const header = el('header', { className: 'header', attrs: { id: 'home' } });
  const container = el('div', { className: 'header__container' });

  const logo = el('a', { className: 'header__logo', attrs: { href: '#home' } }, [
    el('img', {
      className: 'header__logo-icon',
      attrs: { src: 'assets/images/logo.png', alt: '', width: 32, height: 32 },
    }),
    el('span', { className: 'header__logo-text', text: 'MiniGames' }),
  ]);

  const nav = el('nav', { className: 'header__nav', attrs: { 'aria-label': 'Main' } });
  const navList = el(
    'ul',
    { className: 'header__nav-list' },
    NAV_ITEMS.map((item, index) =>
      el('li', {}, [
        el('a', {
          className: `header__nav-link${index === 0 ? ' header__nav-link--active' : ''}`,
          attrs: { href: item.href },
          text: item.label,
        }),
      ]),
    ),
  );
  nav.append(navList);

  const authSlot = el('div', { className: 'header__auth-slot' });

  const burgerBar = (): HTMLSpanElement =>
  el('span', { className: 'header__burger-bar', attrs: { 'aria-hidden': true } });

  const burgerBtn = el(
    'button',
    {
      className: 'header__burger',
      attrs: {
        type: 'button',
        'aria-label': 'Open menu',
        'aria-expanded': false,
        'aria-controls': 'burger-menu',
      },
    },
    [burgerBar(), burgerBar(), burgerBar()],
  );
  burgerBtn.addEventListener('click', callbacks.onBurgerClick);

  container.append(logo, nav, authSlot, burgerBtn);
  header.append(container);

  sessionStore.subscribe((state) => {
    authSlot.replaceChildren(
      renderDesktopAuthArea(state, callbacks),
      renderTabletAuthArea(state, callbacks),
    );
  });

  return header;
}
