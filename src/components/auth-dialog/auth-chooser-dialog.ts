import { el } from '@/utils/dom';
import { icons } from '@/utils/icons';

export interface AuthChooserCallbacks {
  onContinueWithEmail: () => void;
  onLoginInstead: () => void;
}

export interface AuthChooserApi {
  element: HTMLDialogElement;
  open: () => void;
}

/**
 * Small intermediate modal shown before the Register form. Lets the
 * visitor pick a signup method first (Email vs Google) instead of landing
 * straight on the form — the "Sign Up" entry point now opens this menu,
 * which then opens the full Auth Dialog on the Register tab.
 */
export function createAuthChooserDialog(callbacks: AuthChooserCallbacks): AuthChooserApi {
  const dialog = el('dialog', { className: 'auth-chooser' });

  const closeBtn = el('button', {
    className: 'auth-chooser__close',
    attrs: { type: 'button', 'aria-label': 'Close dialog' },
    html: icons.close,
  });

  const emailBtn = el(
    'button',
    {
      className: 'auth-chooser__option auth-chooser__option--primary',
      attrs: { type: 'button' },
    },
    [
      el('span', {
        className: 'auth-chooser__option-icon',
        html: icons.mail,
        attrs: { 'aria-hidden': true },
      }),
      el('span', { text: 'Continue with Email' }),
    ],
  );

  const googleBtn = el(
    'button',
    {
      className: 'auth-chooser__option',
      attrs: { type: 'button' },
    },
    [
      el('span', {
        className: 'auth-chooser__option-icon',
        html: icons.google,
        attrs: { 'aria-hidden': true },
      }),
      el('span', { text: 'Continue with Google' }),
    ],
  );

  const loginLink = el('button', {
    className: 'auth-link-btn',
    attrs: { type: 'button' },
    text: 'Log In',
  });

  const card = el('div', { className: 'auth-chooser__card' }, [
    closeBtn,
    el('h2', { className: 'auth-chooser__title', text: 'Join MiniGames' }),
    el('p', {
      className: 'auth-chooser__subtitle',
      text: 'Choose how you\u2019d like to create your account.',
    }),
    emailBtn,
    googleBtn,
    el('p', { className: 'auth-switch-text' }, ['Already have an account? ', loginLink]),
  ]);

  dialog.append(card);
  document.body.append(dialog);

  emailBtn.addEventListener('click', () => {
    dialog.close();
    callbacks.onContinueWithEmail();
  });
  loginLink.addEventListener('click', () => {
    dialog.close();
    callbacks.onLoginInstead();
  });
  closeBtn.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) {
      dialog.close();
    }
  });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('no-scroll');
  });

  return {
    element: dialog,
    open: () => {
      document.body.classList.add('no-scroll');
      if (!dialog.open) {
        dialog.showModal();
      }
    },
  };
}
