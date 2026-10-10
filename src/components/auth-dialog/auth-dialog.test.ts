// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAuthDialog } from '@/components/auth-dialog/auth-dialog';
import type { AuthDialogApi } from '@/components/auth-dialog/auth-dialog';

interface TestProfile {
  displayName: string;
  email: string;
  avatarUrl?: string;
}

const { closeAuthModalMock, logInMock, signInWithGoogleMock, showSnackbarMock } = vi.hoisted(
  () => ({
    closeAuthModalMock: vi.fn<() => void>(),
    logInMock: vi.fn<(profile: TestProfile) => void>(),
    signInWithGoogleMock: vi.fn<() => Promise<TestProfile>>(),
    showSnackbarMock: vi.fn<(message: string, variant?: string) => void>(),
  }),
);

vi.mock('@/router', () => ({ closeAuthModal: closeAuthModalMock }));
vi.mock('@/state/session', () => ({ sessionStore: { logIn: logInMock } }));
vi.mock('@/auth/google-auth', () => ({ signInWithGoogle: signInWithGoogleMock }));
vi.mock('@/components/feedback/snackbar', () => ({ showSnackbar: showSnackbarMock }));

function byId(id: string): HTMLInputElement {
  const element = document.getElementById(id);
  if (!(element instanceof HTMLInputElement)) {
    throw new Error(`Input #${id} not found`);
  }
  return element;
}

function typeInto(id: string, value: string): void {
  const input = byId(id);
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function errorOf(id: string): string {
  const message = byId(id).closest('.auth-field')?.querySelector('.auth-field__error');
  return message?.textContent ?? '';
}

function hasErrorStyle(id: string): boolean {
  return byId(id).closest('.auth-field__input-wrap')?.classList.contains('is-error') ?? false;
}

function submitButton(panelId: string): HTMLButtonElement {
  const button = document.querySelector<HTMLButtonElement>(`#${panelId} button[type="submit"]`);
  if (button === null) {
    throw new Error(`Submit button of #${panelId} not found`);
  }
  return button;
}

function googleButton(panelId: string): HTMLButtonElement {
  const button = document.querySelector<HTMLButtonElement>(`#${panelId} .auth-google-btn`);
  if (button === null) {
    throw new Error(`Google button of #${panelId} not found`);
  }
  return button;
}

function submit(panelId: string): void {
  const form = document.querySelector(`#${panelId} form`);
  form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}

function fillValidRegistration(): void {
  typeInto('register-username', 'Alex1');
  typeInto('register-email', 'alex@minigames.com');
  typeInto('register-password', 'Abc12!');
  typeInto('register-confirm-password', 'Abc12!');
}

let dialog: AuthDialogApi;

beforeAll(() => {
  // jsdom does not implement the modal part of <dialog>.
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute('open');
  };
});

beforeEach(() => {
  closeAuthModalMock.mockClear();
  logInMock.mockClear();
  signInWithGoogleMock.mockReset();
  showSnackbarMock.mockClear();
  dialog = createAuthDialog();
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('auth dialog validation', () => {
  it('keeps both submit buttons disabled while their form is invalid', () => {
    dialog.open('login');
    expect(submitButton('auth-panel-login').disabled).toBe(true);
    expect(submitButton('auth-panel-register').disabled).toBe(true);
  });

  it('shows no error for a field the user only focused and left', () => {
    dialog.open('register');

    byId('register-username').focus();
    googleButton('auth-panel-register').focus();

    expect(errorOf('register-username')).toBe('');
    expect(hasErrorStyle('register-username')).toBe(false);
  });

  it('shows no errors when a pristine form is left through the Google button', () => {
    dialog.open('register');

    for (const id of ['register-username', 'register-email', 'register-password']) {
      byId(id).focus();
    }
    googleButton('auth-panel-register').focus();

    for (const id of [
      'register-username',
      'register-email',
      'register-password',
      'register-confirm-password',
    ]) {
      expect(errorOf(id)).toBe('');
    }
  });

  it('shows an error while typing an invalid value and clears it once valid', () => {
    dialog.open('register');

    typeInto('register-username', 'alex1');
    expect(errorOf('register-username')).toBe(
      'Username must start with an uppercase English letter (A–Z).',
    );
    expect(hasErrorStyle('register-username')).toBe(true);

    typeInto('register-username', 'Alex1');
    expect(errorOf('register-username')).toBe('');
    expect(hasErrorStyle('register-username')).toBe(false);
  });

  it('shows "required" after the user clears a field they typed in', () => {
    dialog.open('login');

    typeInto('login-email', 'a@b.co');
    typeInto('login-email', '');

    expect(errorOf('login-email')).toBe('Email is required.');
  });

  it('validates a field changed without typing (for example by autofill)', () => {
    dialog.open('login');

    const input = byId('login-email');
    input.value = 'not-an-email';
    input.dispatchEvent(new Event('change', { bubbles: true }));

    expect(errorOf('login-email')).toBe('Please enter a valid email address.');
  });

  it('revalidates confirm password whenever the password changes', () => {
    dialog.open('register');
    fillValidRegistration();
    expect(errorOf('register-confirm-password')).toBe('');

    typeInto('register-password', 'Abc12!x');

    expect(errorOf('register-confirm-password')).toBe('Passwords do not match.');
    expect(submitButton('auth-panel-register').disabled).toBe(true);
  });

  it('enables the register submit button only when every field is valid', () => {
    dialog.open('register');
    fillValidRegistration();
    expect(submitButton('auth-panel-register').disabled).toBe(false);
  });

  it('applies only the basic password rules on login', () => {
    dialog.open('login');
    typeInto('login-email', 'alex@minigames.com');
    typeInto('login-password', 'abcdef');
    expect(errorOf('login-password')).toBe('');
    expect(submitButton('auth-panel-login').disabled).toBe(false);
  });

  it('clears values and errors when switching between Login and Register', () => {
    dialog.open('register');
    typeInto('register-username', 'alex1');
    expect(errorOf('register-username')).not.toBe('');

    dialog.open('login');
    dialog.open('register');

    expect(byId('register-username').value).toBe('');
    expect(errorOf('register-username')).toBe('');
    expect(submitButton('auth-panel-register').disabled).toBe(true);
  });

  it('tells the browser what each field is for, so it does not autofill the wrong value', () => {
    expect(byId('login-email').autocomplete).toBe('email');
    expect(byId('login-password').autocomplete).toBe('current-password');
    expect(byId('register-username').autocomplete).toBe('nickname');
    expect(byId('register-email').autocomplete).toBe('email');
    expect(byId('register-password').autocomplete).toBe('new-password');
    expect(byId('register-confirm-password').autocomplete).toBe('new-password');
  });
});

describe('auth dialog temporary sign-in', () => {
  it('starts a session from the login email and closes the dialog', () => {
    dialog.open('login');
    typeInto('login-email', 'alex@minigames.com');
    typeInto('login-password', 'abcdef');

    submit('auth-panel-login');

    expect(logInMock).toHaveBeenCalledWith({
      displayName: 'alex',
      email: 'alex@minigames.com',
    });
    expect(closeAuthModalMock).toHaveBeenCalledTimes(1);
  });

  it('starts a session from the registration username and email', () => {
    dialog.open('register');
    fillValidRegistration();

    submit('auth-panel-register');

    expect(logInMock).toHaveBeenCalledWith({
      displayName: 'Alex1',
      email: 'alex@minigames.com',
    });
    expect(closeAuthModalMock).toHaveBeenCalledTimes(1);
  });

  it('does not start a session from an invalid form', () => {
    dialog.open('register');
    typeInto('register-username', 'alex1');

    submit('auth-panel-register');

    expect(logInMock).not.toHaveBeenCalled();
    expect(closeAuthModalMock).not.toHaveBeenCalled();
  });
});

describe('auth dialog Google sign-in', () => {
  const googleProfile = {
    displayName: 'Alex Gamer',
    email: 'alex@gmail.com',
    avatarUrl: 'https://example.com/a.png',
  };

  function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (reason: unknown) => void;
    const promise = new Promise<T>((onResolve, onReject) => {
      resolve = onResolve;
      reject = onReject;
    });
    return { promise, resolve, reject };
  }

  function controls(): (HTMLButtonElement | HTMLInputElement)[] {
    return Array.from(
      dialog.element.querySelectorAll<HTMLButtonElement | HTMLInputElement>('button, input'),
    );
  }

  async function settled(): Promise<void> {
    await vi.waitFor(() => {
      expect(dialog.element.getAttribute('aria-busy')).toBe('false');
    });
  }

  function pressBackdrop(): void {
    dialog.element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  }

  function pressEscape(): void {
    dialog.element.dispatchEvent(new Event('cancel', { cancelable: true }));
  }

  it('is not busy until a request starts', () => {
    dialog.open('login');
    expect(dialog.element.getAttribute('aria-busy')).toBe('false');
    expect(googleButton('auth-panel-login').disabled).toBe(false);
  });

  it('locks every control and shows progress while the request is pending', () => {
    dialog.open('login');
    const request = deferred<typeof googleProfile>();
    signInWithGoogleMock.mockReturnValueOnce(request.promise);

    googleButton('auth-panel-login').click();

    expect(dialog.element.getAttribute('aria-busy')).toBe('true');
    expect(controls().every((control) => control.disabled)).toBe(true);
    const button = googleButton('auth-panel-login');
    expect(button.classList.contains('is-loading')).toBe(true);
    expect(button.querySelector('.auth-google-btn__label')?.textContent).toBe(
      'Connecting to Google…',
    );
  });

  it('ignores repeated clicks while a request is pending', () => {
    dialog.open('login');
    signInWithGoogleMock.mockReturnValueOnce(deferred<typeof googleProfile>().promise);

    googleButton('auth-panel-login').click();
    googleButton('auth-panel-login').click();
    googleButton('auth-panel-register').click();

    expect(signInWithGoogleMock).toHaveBeenCalledTimes(1);
  });

  it('cannot be dismissed by the backdrop or Escape while the request is pending', async () => {
    dialog.open('login');
    const request = deferred<typeof googleProfile>();
    signInWithGoogleMock.mockReturnValueOnce(request.promise);
    googleButton('auth-panel-login').click();

    pressBackdrop();
    pressEscape();
    expect(closeAuthModalMock).not.toHaveBeenCalled();

    request.reject({ code: 'auth/popup-closed-by-user' });
    await settled();

    pressEscape();
    expect(closeAuthModalMock).toHaveBeenCalledTimes(1);
    pressBackdrop();
    expect(closeAuthModalMock).toHaveBeenCalledTimes(2);
  });

  it('starts the session, closes the dialog and confirms with a Snackbar on success', async () => {
    dialog.open('register');
    signInWithGoogleMock.mockResolvedValueOnce(googleProfile);

    googleButton('auth-panel-register').click();
    await settled();

    expect(logInMock).toHaveBeenCalledWith(googleProfile);
    expect(closeAuthModalMock).toHaveBeenCalledTimes(1);
    expect(showSnackbarMock).toHaveBeenCalledWith('Signed in as Alex Gamer.', 'success');
    expect(controls().some((control) => control.disabled && control.type !== 'submit')).toBe(false);
  });

  it('works from the login tab as well', async () => {
    dialog.open('login');
    signInWithGoogleMock.mockResolvedValueOnce(googleProfile);

    googleButton('auth-panel-login').click();
    await settled();

    expect(logInMock).toHaveBeenCalledWith(googleProfile);
  });

  it('stays open, unlocks and stays quiet when the user cancels the Google popup', async () => {
    dialog.open('register');
    typeInto('register-username', 'Alex1');
    signInWithGoogleMock.mockRejectedValueOnce({ code: 'auth/popup-closed-by-user' });

    googleButton('auth-panel-register').click();
    await settled();

    expect(logInMock).not.toHaveBeenCalled();
    expect(closeAuthModalMock).not.toHaveBeenCalled();
    expect(showSnackbarMock).not.toHaveBeenCalled();
    expect(byId('register-username').disabled).toBe(false);
    expect(byId('register-username').value).toBe('Alex1');
    const button = googleButton('auth-panel-register');
    expect(button.classList.contains('is-loading')).toBe(false);
    expect(button.querySelector('.auth-google-btn__label')?.textContent).toBe(
      'Sign up with Google',
    );
  });

  it('shows an error Snackbar and unlocks the dialog when sign-in fails', async () => {
    dialog.open('login');
    signInWithGoogleMock.mockRejectedValueOnce({ code: 'auth/popup-blocked' });

    googleButton('auth-panel-login').click();
    await settled();

    expect(logInMock).not.toHaveBeenCalled();
    expect(closeAuthModalMock).not.toHaveBeenCalled();
    expect(showSnackbarMock).toHaveBeenCalledTimes(1);
    expect(showSnackbarMock).toHaveBeenCalledWith(expect.stringContaining('popup'), 'error');
    expect(googleButton('auth-panel-login').disabled).toBe(false);
  });

  it('can be retried after a failure', async () => {
    dialog.open('login');
    signInWithGoogleMock.mockRejectedValueOnce({ code: 'auth/network-request-failed' });
    googleButton('auth-panel-login').click();
    await settled();

    signInWithGoogleMock.mockResolvedValueOnce(googleProfile);
    googleButton('auth-panel-login').click();
    await settled();

    expect(signInWithGoogleMock).toHaveBeenCalledTimes(2);
    expect(logInMock).toHaveBeenCalledWith(googleProfile);
  });

  it('keeps the submit button disabled for an invalid form after unlocking', async () => {
    dialog.open('register');
    typeInto('register-username', 'alex1');
    signInWithGoogleMock.mockRejectedValueOnce({ code: 'auth/popup-closed-by-user' });

    googleButton('auth-panel-register').click();
    await settled();

    expect(submitButton('auth-panel-register').disabled).toBe(true);
  });

  it('keeps the submit button enabled for a valid form after unlocking', async () => {
    dialog.open('register');
    fillValidRegistration();
    signInWithGoogleMock.mockRejectedValueOnce({ code: 'auth/popup-closed-by-user' });

    googleButton('auth-panel-register').click();
    await settled();

    expect(submitButton('auth-panel-register').disabled).toBe(false);
  });
});
