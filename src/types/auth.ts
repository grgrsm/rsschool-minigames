/** Which tab of the Auth Dialog is currently active. */
export type AuthTab = 'login' | 'register';

/** Header/session state — whether a user is signed in. */
export interface AuthUser {
  fullName: string;
  initials: string;
  email: string;
  avatarUrl?: string;
}

/**
 * Minimum profile data kept in the client-side app session.
 * Never contains passwords, Firebase tokens or other credentials.
 */
export interface AppSession {
  displayName: string;
  email: string;
  /** `Date.now()` at successful authentication. Fixed: reloads and activity never extend it. */
  authenticatedAt: number;
  /** Only present when the identity provider supplies one (e.g. Google). */
  avatarUrl?: string;
}

export type SessionState = { status: 'guest' } | { status: 'authenticated'; user: AuthUser };

/** Visual state of a single text input, driven by validation. */
export type InputState = 'default' | 'focus' | 'filled' | 'error';

export interface FieldValidationResult {
  state: InputState;
  message: string | null;
}

/** Raw values collected from the Login form. */
export interface LoginFormValues {
  email: string;
  password: string;
}

/** Raw values collected from the Register form. */
export interface RegisterFormValues {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}
