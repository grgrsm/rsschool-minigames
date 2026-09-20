import type { SessionState } from '@/types/auth';
import { sessionStore } from '@/state/session-store';
import { el } from '@/utils/dom';
import { icons } from '@/utils/icons';

import { NAV_ITEMS } from '../header/nav-links';

export interface BurgerMenuCallbacks {
  onLoginClick: () => void;
  onSignUpClick: () => void;
  onLogOutClick: () => void;
}

export interface BurgerMenuApi {
  element: HTMLElement;
  open: () => void;
  close: () => void;
  isOpen: () => boolean;
}

function renderAuthSection(state: SessionState, callbacks: BurgerMenuCallbacks): HTMLElement {
  const wrapper = el('div', { className: 'burger-menu__auth' });

  if (state.status === 'guest') {
    const loginBtn = el('button', {
      className: 'burger-menu__btn burger-menu__btn--outline',
      attrs: { type: 'button' },
      text: 'Log In',
    });
    const signUpBtn = el('button', {
      className: 'burger-menu__btn burger-menu__btn--primary',
      attrs: { type: 'button' },
      text: 'Sign Up',
    });
    loginBtn.addEventListener('click', callbacks.onLoginClick);
    signUpBtn.addEventListener('click', callbacks.onSignUpClick);
    wrapper.append(loginBtn, signUpBtn);
  } else {
    const logOutBtn = el('button', {
      className: 'burger-menu__btn burger-menu__btn--outline',
      attrs: { type: 'button' },
      text: 'Log Out',
    });
    logOutBtn.addEventListener('click', callbacks.onLogOutClick);
    wrapper.append(logOutBtn);
  }

  return wrapper;
}

export function createBurgerMenu(callbacks: BurgerMenuCallbacks): BurgerMenuApi {
  const panel = el('div', {
    className: 'burger-menu',
    attrs: {
      id: 'burger-menu',
      role: 'dialog',
      'aria-modal': true,
      'aria-label': 'Mobile navigation',
      'aria-hidden': true,
    },
  });

  const header = el('div', { className: 'burger-menu__header' }, [
    el('a', { className: 'burger-menu__logo', attrs: { href: '#home' } }, [
      el('img', {
        className: 'burger-menu__logo-icon',
        attrs: { src: 'assets/images/logo.png', alt: '', width: 28, height: 28 },
      }),
      el('span', { text: 'MiniGames' }),
    ]),
  ]);

  const closeBtn = el('button', {
    className: 'burger-menu__close',
    attrs: { type: 'button', 'aria-label': 'Close menu' },
    html: icons.close,
  });
  header.append(closeBtn);

  const nav = el('nav', { className: 'burger-menu__nav', attrs: { 'aria-label': 'Mobile' } });
  const navList = el(
    'ul',
    {},
    NAV_ITEMS.map((item, index) =>
      el('li', {}, [
        el('a', {
          className: `burger-menu__nav-link${index === 0 ? ' burger-menu__nav-link--active' : ''}`,
          attrs: { href: item.href },
          text: item.label,
        }),
      ]),
    ),
  );
  nav.append(navList);

  const authSlot = el('div', { className: 'burger-menu__auth-slot' });

  panel.append(header, nav, authSlot);

  const api: BurgerMenuApi = {
    element: panel,
    open: () => {
      panel.classList.add('is-open');
      panel.setAttribute('aria-hidden', 'false');
      document.body.classList.add('no-scroll');
      closeBtn.focus();
    },
    close: () => {
      panel.classList.remove('is-open');
      panel.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('no-scroll');
    },
    isOpen: () => panel.classList.contains('is-open'),
  };

  closeBtn.addEventListener('click', api.close);

  navList.addEventListener('click', (event) => {
    if ((event.target as HTMLElement).closest('a')) {
      api.close();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && api.isOpen()) {
      api.close();
    }
  });

  sessionStore.subscribe((state) => {
    const wrappedCallbacks: BurgerMenuCallbacks = {
      onLoginClick: () => {
        api.close();
        callbacks.onLoginClick();
      },
      onSignUpClick: () => {
        api.close();
        callbacks.onSignUpClick();
      },
      onLogOutClick: () => {
        callbacks.onLogOutClick();
      },
    };
    authSlot.replaceChildren(renderAuthSection(state, wrappedCallbacks));
  });

  return api;
}
