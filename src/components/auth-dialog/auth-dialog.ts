import { describeAuthError } from '@/auth/auth-errors';
import { signInWithGoogle } from '@/auth/google-auth';
import { showSnackbar } from '@/components/feedback/snackbar';
import { closeAuthModal } from '@/router';
import type { AuthTab, InputState } from '@/types/auth';
import { sessionStore } from '@/state/session';
import type { SessionProfile } from '@/state/session-store';
import { el } from '@/utils/dom';
import { icons } from '@/utils/icons';
import {
  getConfirmPasswordError,
  getEmailError,
  getLoginPasswordError,
  getRegisterPasswordError,
  getUsernameError,
} from '@/utils/validation';
import type { ValidationError } from '@/utils/validation';

export interface AuthDialogApi {
  element: HTMLDialogElement;
  /** Fills in the requested tab and shows the dialog. Does not touch the URL itself —
   *  callers go through `openAuthModal` so the URL stays the single source of truth. */
  open: (tab: AuthTab) => void;
  /** Closes the dialog without touching the URL — used when the URL already changed (popstate). */
  close: () => void;
}

interface FieldRefs {
  wrap: HTMLDivElement;
  input: HTMLInputElement;
  error: HTMLParagraphElement;
}

interface FieldRule {
  refs: FieldRefs;
  getError: () => ValidationError;
  touched: boolean;
}

interface FormValidator {
  isValid: () => boolean;
  reset: () => void;
  /** Re-renders every field and recomputes whether the submit button may be enabled. */
  refresh: () => void;
}

function setFieldState(refs: FieldRefs, state: InputState, message: string | null): void {
  refs.wrap.classList.toggle('is-error', state === 'error');
  refs.wrap.classList.toggle('is-filled', state === 'filled');
  refs.error.textContent = message ?? '';
}

function createRule(refs: FieldRefs, getError: () => ValidationError): FieldRule {
  return { refs, getError, touched: false };
}

function renderRule(rule: FieldRule): void {
  if (!rule.touched) {
    setFieldState(rule.refs, 'default', null);
    return;
  }
  const error = rule.getError();
  setFieldState(rule.refs, error === null ? 'filled' : 'error', error);
}

/**
 * Validates on input/blur, shows errors only for fields the user has touched,
 * and keeps the submit button disabled until every rule passes.
 * Every touched field is re-rendered on any change, so "confirm password"
 * is revalidated whenever the password changes.
 */
function createFormValidator(rules: FieldRule[], submitButton: HTMLButtonElement): FormValidator {
  const isValid = (): boolean => rules.every((rule) => rule.getError() === null);

  const refresh = (): void => {
    rules.forEach((rule) => renderRule(rule));
    submitButton.disabled = !isValid();
  };

  rules.forEach((rule) => {
    const markTouched = (): void => {
      rule.touched = true;
      refresh();
    };
    // Only a change marks a field as touched. Merely focusing and leaving an untouched field
    // (for example to press "Continue with Google") must not raise "required" errors.
    rule.refs.input.addEventListener('input', markTouched);
    rule.refs.input.addEventListener('change', markTouched);
  });

  refresh();

  return {
    isValid,
    reset: () => {
      rules.forEach((rule) => {
        rule.touched = false;
        rule.refs.input.value = '';
      });
      refresh();
    },
    refresh,
  };
}

function createField(options: {
  id: string;
  label: string;
  type: 'text' | 'email' | 'password';
  placeholder: string;
  icon: string;
  autocomplete: 'email' | 'nickname' | 'current-password' | 'new-password';
  withToggle?: boolean;
}): { field: HTMLDivElement; refs: FieldRefs } {
  const input = el('input', {
    className: 'auth-field__input',
    attrs: {
      id: options.id,
      type: options.type,
      placeholder: options.placeholder,
      autocomplete: options.autocomplete,
    },
  });

  const wrap = el('div', { className: 'auth-field__input-wrap' }, [
    el('span', {
      className: 'auth-field__icon',
      html: options.icon,
      attrs: { 'aria-hidden': true },
    }),
    input,
  ]);

  if (options.withToggle) {
    const toggleBtn = el('button', {
      className: 'auth-field__toggle',
      attrs: { type: 'button', 'aria-label': 'Show password' },
      html: icons.eye,
    });
    let visible = false;
    toggleBtn.addEventListener('click', () => {
      visible = !visible;
      input.type = visible ? 'text' : 'password';
      toggleBtn.innerHTML = visible ? icons.eyeOff : icons.eye;
      toggleBtn.setAttribute('aria-label', visible ? 'Hide password' : 'Show password');
    });
    wrap.append(toggleBtn);
  }

  const error = el('p', { className: 'auth-field__error', attrs: { role: 'alert' } });

  const field = el('div', { className: 'auth-field' }, [
    el('label', {
      className: 'auth-field__label',
      attrs: { for: options.id },
      text: options.label,
    }),
    wrap,
    error,
  ]);

  return { field, refs: { wrap, input, error } };
}

function createDivider(): HTMLElement {
  return el('div', { className: 'auth-divider' }, [el('span', {}, ['OR'])]);
}

function createGoogleButton(label: string): HTMLButtonElement {
  return el(
    'button',
    {
      className: 'auth-google-btn',
      attrs: { type: 'button' },
    },
    [
      el('span', {
        className: 'auth-google-btn__icon',
        html: icons.google,
        attrs: { 'aria-hidden': true },
      }),
      el('span', { className: 'auth-google-btn__spinner', attrs: { 'aria-hidden': true } }),
      el('span', { className: 'auth-google-btn__label', text: label }),
    ],
  );
}

export function createAuthDialog(): AuthDialogApi {
  const dialog = el('dialog', { className: 'auth-dialog' });

  const tabLogin = el('button', {
    className: 'auth-dialog__tab',
    attrs: {
      type: 'button',
      role: 'tab',
      id: 'auth-tab-login',
      'aria-selected': true,
      'aria-controls': 'auth-panel-login',
    },
    text: 'Login',
  });
  const tabRegister = el('button', {
    className: 'auth-dialog__tab',
    attrs: {
      type: 'button',
      role: 'tab',
      id: 'auth-tab-register',
      'aria-selected': false,
      'aria-controls': 'auth-panel-register',
    },
    text: 'Register',
  });
  const tabs = el('div', { className: 'auth-dialog__tabs', attrs: { role: 'tablist' } }, [
    tabLogin,
    tabRegister,
  ]);

  // ----- Login panel -----------------------------------------------------
  const loginEmail = createField({
    id: 'login-email',
    autocomplete: 'email',
    label: 'Email Address',
    type: 'email',
    placeholder: 'e.g. alex@minigames.com',
    icon: icons.mail,
  });
  const loginPassword = createField({
    id: 'login-password',
    autocomplete: 'current-password',
    label: 'Password',
    type: 'password',
    placeholder: '••••••••',
    icon: icons.lock,
    withToggle: true,
  });

  const loginError = el('p', { className: 'auth-form__form-error', attrs: { role: 'alert' } });
  const loginSubmit = el('button', {
    className: 'auth-submit-btn',
    attrs: { type: 'submit' },
    text: 'Login',
  });
  const switchToRegister = el('button', {
    className: 'auth-link-btn',
    attrs: { type: 'button' },
    text: 'Register',
  });

  const loginForm = el(
    'form',
    {
      className: 'auth-form',
    },
    [
      el('h2', { className: 'auth-form__title', text: 'Welcome Back!' }),
      el('p', {
        className: 'auth-form__subtitle',
        text: 'Sign in to resume your games and progress.',
      }),
      loginEmail.field,
      loginPassword.field,
      el('a', { className: 'auth-forgot-link', attrs: { href: '#' }, text: 'Forgot Password?' }),
      loginError,
      loginSubmit,
      createDivider(),
      createGoogleButton('Continue with Google'),
      el('p', { className: 'auth-switch-text' }, ["Don't have an account? ", switchToRegister]),
    ],
  );

  const loginPanel = el(
    'div',
    { attrs: { id: 'auth-panel-login', role: 'tabpanel', 'aria-labelledby': 'auth-tab-login' } },
    [loginForm],
  );

  // ----- Register panel ----------------------------------------------------
  const registerUsername = createField({
    id: 'register-username',
    autocomplete: 'nickname',
    label: 'Username',
    type: 'text',
    placeholder: 'e.g. CozyGamer99',
    icon: icons.user,
  });
  const registerEmail = createField({
    id: 'register-email',
    autocomplete: 'email',
    label: 'Email Address',
    type: 'email',
    placeholder: 'your.email@domain.com',
    icon: icons.mail,
  });
  const registerPassword = createField({
    id: 'register-password',
    autocomplete: 'new-password',
    label: 'Password',
    type: 'password',
    placeholder: 'Min. 6 characters',
    icon: icons.lock,
    withToggle: true,
  });
  const registerConfirmPassword = createField({
    id: 'register-confirm-password',
    autocomplete: 'new-password',
    label: 'Confirm Password',
    type: 'password',
    placeholder: 'Repeat your password',
    icon: icons.lock,
    withToggle: true,
  });

  const registerError = el('p', { className: 'auth-form__form-error', attrs: { role: 'alert' } });
  const registerSubmit = el('button', {
    className: 'auth-submit-btn',
    attrs: { type: 'submit' },
    text: 'Create Account',
  });
  const switchToLogin = el('button', {
    className: 'auth-link-btn',
    attrs: { type: 'button' },
    text: 'Login',
  });

  const registerForm = el(
    'form',
    {
      className: 'auth-form',
    },
    [
      el('h2', { className: 'auth-form__title', text: 'Create Account' }),
      el('p', {
        className: 'auth-form__subtitle',
        text: 'Join MiniGames to track your score & streak.',
      }),
      registerUsername.field,
      registerEmail.field,
      registerPassword.field,
      registerConfirmPassword.field,
      registerError,
      registerSubmit,
      createDivider(),
      createGoogleButton('Sign up with Google'),
      el('p', { className: 'auth-switch-text' }, ['Already have an account? ', switchToLogin]),
    ],
  );

  const registerPanel = el(
    'div',
    {
      attrs: {
        id: 'auth-panel-register',
        role: 'tabpanel',
        'aria-labelledby': 'auth-tab-register',
        hidden: true,
      },
    },
    [registerForm],
  );

  const panels = el('div', { className: 'auth-dialog__panels' }, [loginPanel, registerPanel]);
  const card = el('div', { className: 'auth-dialog__card' }, [tabs, panels]);
  dialog.append(card);
  document.body.append(dialog);

  // ----- Validation ----------------------------------------------------------
  const loginValidator = createFormValidator(
    [
      createRule(loginEmail.refs, () => getEmailError(loginEmail.refs.input.value)),
      createRule(loginPassword.refs, () => getLoginPasswordError(loginPassword.refs.input.value)),
    ],
    loginSubmit,
  );

  const registerValidator = createFormValidator(
    [
      createRule(registerUsername.refs, () => getUsernameError(registerUsername.refs.input.value)),
      createRule(registerEmail.refs, () => getEmailError(registerEmail.refs.input.value)),
      createRule(registerPassword.refs, () =>
        getRegisterPasswordError(registerPassword.refs.input.value),
      ),
      createRule(registerConfirmPassword.refs, () =>
        getConfirmPasswordError(
          registerConfirmPassword.refs.input.value,
          registerPassword.refs.input.value,
        ),
      ),
    ],
    registerSubmit,
  );

  // ----- Pending requests ----------------------------------------------------
  // While an authentication request is in flight every control is locked (nothing can be
  // edited, switched or submitted twice) and the dialog cannot be dismissed.
  const lockableControls = Array.from(
    dialog.querySelectorAll<HTMLButtonElement | HTMLInputElement>('button, input'),
  );
  let pending = false;
  dialog.setAttribute('aria-busy', 'false');

  function setPending(next: boolean): void {
    pending = next;
    dialog.setAttribute('aria-busy', String(next));

    for (const control of lockableControls) {
      control.disabled = next;
    }

    if (!next) {
      // Unlocking must not enable the submit button of a form that is still invalid.
      loginValidator.refresh();
      registerValidator.refresh();
    }
  }

  async function signInWithGoogleFlow(button: HTMLButtonElement): Promise<void> {
    if (pending) {
      return;
    }

    const label = button.querySelector('.auth-google-btn__label');
    const idleLabel = label?.textContent ?? '';

    setPending(true);
    button.classList.add('is-loading');
    if (label) {
      label.textContent = 'Connecting to Google…';
    }

    let profile: SessionProfile | null = null;
    try {
      profile = await signInWithGoogle();
    } catch (error) {
      const failure = describeAuthError(error);
      if (!failure.cancelled) {
        showSnackbar(failure.message, 'error');
      }
    } finally {
      button.classList.remove('is-loading');
      if (label) {
        label.textContent = idleLabel;
      }
      setPending(false);
    }

    if (profile === null) {
      // Failed or cancelled: the dialog stays open and the form keeps what the user typed.
      button.focus();
      return;
    }

    sessionStore.logIn(profile);
    closeAuthModal();
    showSnackbar(`Signed in as ${profile.displayName}.`, 'success');
  }

  for (const button of dialog.querySelectorAll<HTMLButtonElement>('.auth-google-btn')) {
    button.addEventListener('click', () => {
      void signInWithGoogleFlow(button);
    });
  }

  // ----- Tab switching -----------------------------------------------------
  function activateTab(tab: AuthTab): void {
    const isLogin = tab === 'login';
    tabLogin.classList.toggle('is-active', isLogin);
    tabRegister.classList.toggle('is-active', !isLogin);
    tabLogin.setAttribute('aria-selected', String(isLogin));
    tabRegister.setAttribute('aria-selected', String(!isLogin));
    loginPanel.hidden = !isLogin;
    registerPanel.hidden = isLogin;
    loginValidator.reset();
    registerValidator.reset();
    (isLogin ? loginEmail.refs.input : registerUsername.refs.input).focus();
  }

  tabLogin.addEventListener('click', () => activateTab('login'));
  tabRegister.addEventListener('click', () => activateTab('register'));
  switchToRegister.addEventListener('click', () => activateTab('register'));
  switchToLogin.addEventListener('click', () => activateTab('login'));

  // ----- Submit handlers -----------------------------------------------------
  // Temporary local login — replaced by the Firebase flow in a later branch.
  loginForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!loginValidator.isValid()) {
      return;
    }
    loginError.textContent = '';
    const email = loginEmail.refs.input.value.trim();
    sessionStore.logIn({ displayName: email.split('@')[0] || 'John Doe', email });
    closeAuthModal();
  });

  registerForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!registerValidator.isValid()) {
      return;
    }
    registerError.textContent = '';
    sessionStore.logIn({
      displayName: registerUsername.refs.input.value,
      email: registerEmail.refs.input.value.trim(),
    });
    closeAuthModal();
  });

  // ----- Dialog dismissal -----------------------------------------------------
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog && !pending) {
      closeAuthModal();
    }
  });
  // Escape fires `cancel` before `close` and does not touch the URL on its own.
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    if (!pending) {
      closeAuthModal();
    }
  });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('no-scroll');
  });

  const api: AuthDialogApi = {
    element: dialog,
    open: (tab: AuthTab) => {
      activateTab(tab);
      document.body.classList.add('no-scroll');
      if (!dialog.open) {
        dialog.showModal();
      }
    },
    close: () => {
      if (dialog.open) {
        dialog.close();
      }
    },
  };

  return api;
}
