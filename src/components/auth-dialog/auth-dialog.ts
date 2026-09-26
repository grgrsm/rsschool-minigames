import type { AuthTab, InputState } from '@/types/auth';
import { sessionStore, getInitials } from '@/state/session-store';
import { el } from '@/utils/dom';
import { icons } from '@/utils/icons';
import { validateEmail, validateName, validatePassword } from '@/utils/validation';

export interface AuthDialogApi {
  element: HTMLDialogElement;
  open: (tab: AuthTab) => void;
}

interface FieldRefs {
  wrap: HTMLDivElement;
  input: HTMLInputElement;
  error: HTMLParagraphElement;
}

function setFieldState(refs: FieldRefs, state: InputState, message: string | null): void {
  refs.wrap.classList.toggle('is-error', state === 'error');
  refs.wrap.classList.toggle('is-filled', state === 'filled');
  refs.error.textContent = message ?? '';
}

function createField(options: {
  id: string;
  label: string;
  type: 'text' | 'email' | 'password';
  placeholder: string;
  icon: string;
  withToggle?: boolean;
}): { field: HTMLDivElement; refs: FieldRefs } {
  const input = el('input', {
    className: 'auth-field__input',
    attrs: {
      id: options.id,
      type: options.type,
      placeholder: options.placeholder,
      autocomplete: options.type === 'password' ? 'current-password' : 'on',
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
      el('span', { text: label }),
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
    label: 'Email Address',
    type: 'email',
    placeholder: 'e.g. alex@minigames.com',
    icon: icons.mail,
  });
  const loginPassword = createField({
    id: 'login-password',
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
    label: 'Username',
    type: 'text',
    placeholder: 'e.g. CozyGamer_99',
    icon: icons.user,
  });
  const registerEmail = createField({
    id: 'register-email',
    label: 'Email Address',
    type: 'email',
    placeholder: 'your.email@domain.com',
    icon: icons.mail,
  });
  const registerPassword = createField({
    id: 'register-password',
    label: 'Password',
    type: 'password',
    placeholder: 'Min. 8 characters',
    icon: icons.lock,
    withToggle: true,
  });
  const registerConfirmPassword = createField({
    id: 'register-confirm-password',
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

  // ----- Tab switching -----------------------------------------------------
  function activateTab(tab: AuthTab): void {
    const isLogin = tab === 'login';
    tabLogin.classList.toggle('is-active', isLogin);
    tabRegister.classList.toggle('is-active', !isLogin);
    tabLogin.setAttribute('aria-selected', String(isLogin));
    tabRegister.setAttribute('aria-selected', String(!isLogin));
    loginPanel.hidden = !isLogin;
    registerPanel.hidden = isLogin;
    (isLogin ? loginEmail.refs.input : registerUsername.refs.input).focus();
  }

  tabLogin.addEventListener('click', () => activateTab('login'));
  tabRegister.addEventListener('click', () => activateTab('register'));
  switchToRegister.addEventListener('click', () => activateTab('register'));
  switchToLogin.addEventListener('click', () => activateTab('login'));

  // ----- Live validation -----------------------------------------------------
  loginEmail.refs.input.addEventListener('input', () => {
    const result = validateEmail(loginEmail.refs.input.value);
    setFieldState(loginEmail.refs, result.state, result.message);
  });
  loginPassword.refs.input.addEventListener('input', () => {
    const result = validatePassword(loginPassword.refs.input.value);
    setFieldState(loginPassword.refs, result.state, result.message);
  });
  registerUsername.refs.input.addEventListener('input', () => {
    const result = validateName(registerUsername.refs.input.value);
    setFieldState(registerUsername.refs, result.state, result.message);
  });
  registerEmail.refs.input.addEventListener('input', () => {
    const result = validateEmail(registerEmail.refs.input.value);
    setFieldState(registerEmail.refs, result.state, result.message);
  });
  registerPassword.refs.input.addEventListener('input', () => {
    const result = validatePassword(registerPassword.refs.input.value);
    setFieldState(registerPassword.refs, result.state, result.message);
  });
  registerConfirmPassword.refs.input.addEventListener('input', () => {
    const matches = registerConfirmPassword.refs.input.value === registerPassword.refs.input.value;
    if (registerConfirmPassword.refs.input.value.length === 0) {
      setFieldState(registerConfirmPassword.refs, 'default', null);
    } else if (!matches) {
      setFieldState(registerConfirmPassword.refs, 'error', 'Passwords do not match.');
    } else {
      setFieldState(registerConfirmPassword.refs, 'filled', null);
    }
  });

  // ----- Submit handlers -----------------------------------------------------
  loginForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const emailResult = validateEmail(loginEmail.refs.input.value);
    const passwordResult = validatePassword(loginPassword.refs.input.value);
    setFieldState(
      loginEmail.refs,
      loginEmail.refs.input.value ? emailResult.state : 'error',
      loginEmail.refs.input.value ? emailResult.message : 'Email is required.',
    );
    setFieldState(
      loginPassword.refs,
      loginPassword.refs.input.value ? passwordResult.state : 'error',
      loginPassword.refs.input.value ? passwordResult.message : 'Password is required.',
    );

    const hasError =
      emailResult.state === 'error' ||
      passwordResult.state === 'error' ||
      !loginEmail.refs.input.value ||
      !loginPassword.refs.input.value;

    if (hasError) {
      loginError.textContent = 'Please fix the fields above and try again.';
      return;
    }

    loginError.textContent = '';
    const fullName = loginEmail.refs.input.value.split('@')[0] || 'John Doe';
    sessionStore.logIn({ fullName, initials: getInitials(fullName) });
    dialog.close();
  });

  registerForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const nameResult = validateName(registerUsername.refs.input.value);
    const emailResult = validateEmail(registerEmail.refs.input.value);
    const passwordResult = validatePassword(registerPassword.refs.input.value);
    const confirmMatches =
      registerConfirmPassword.refs.input.value === registerPassword.refs.input.value &&
      registerConfirmPassword.refs.input.value.length > 0;

    setFieldState(
      registerUsername.refs,
      registerUsername.refs.input.value ? nameResult.state : 'error',
      registerUsername.refs.input.value ? nameResult.message : 'Username is required.',
    );
    setFieldState(
      registerEmail.refs,
      registerEmail.refs.input.value ? emailResult.state : 'error',
      registerEmail.refs.input.value ? emailResult.message : 'Email is required.',
    );
    setFieldState(
      registerPassword.refs,
      registerPassword.refs.input.value ? passwordResult.state : 'error',
      registerPassword.refs.input.value ? passwordResult.message : 'Password is required.',
    );
    if (!confirmMatches) {
      setFieldState(registerConfirmPassword.refs, 'error', 'Passwords do not match.');
    }

    const hasError =
      nameResult.state === 'error' ||
      emailResult.state === 'error' ||
      passwordResult.state === 'error' ||
      !confirmMatches ||
      !registerUsername.refs.input.value ||
      !registerEmail.refs.input.value ||
      !registerPassword.refs.input.value;

    if (hasError) {
      registerError.textContent = 'Please fix the fields above and try again.';
      return;
    }

    registerError.textContent = '';
    const fullName = registerUsername.refs.input.value;
    sessionStore.logIn({ fullName, initials: getInitials(fullName) });
    dialog.close();
  });

  // ----- Dialog dismissal -----------------------------------------------------
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) {
      dialog.close();
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
  };

  return api;
}
