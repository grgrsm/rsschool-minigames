const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MIN_PASSWORD_LENGTH = 6;
const MIN_USERNAME_LENGTH = 2;
const MAX_USERNAME_LENGTH = 30;

const USERNAME_START_PATTERN = /^[A-Z]/;
const USERNAME_CHARS_PATTERN = /^[A-Za-z0-9]+$/;

/** Printable ASCII without spaces: English letters, digits and special characters. */
const PASSWORD_ALLOWED_PATTERN = /^[\x21-\x7E]+$/;
const UPPERCASE_PATTERN = /[A-Z]/;
const DIGIT_PATTERN = /[0-9]/;
const SPECIAL_CHAR_PATTERN = /[^A-Za-z0-9]/;

/**
 * Rule functions return an error message, or `null` when the value is valid.
 * Empty values are reported as "required" — the dialog decides when to show it.
 */
export type ValidationError = string | null;

export function getEmailError(value: string): ValidationError {
  const email = value.trim();
  if (email.length === 0) {
    return 'Email is required.';
  }
  if (!EMAIL_PATTERN.test(email)) {
    return 'Please enter a valid email address.';
  }
  return null;
}

export function getUsernameError(value: string): ValidationError {
  if (value.length === 0) {
    return 'Username is required.';
  }
  if (value.length < MIN_USERNAME_LENGTH || value.length > MAX_USERNAME_LENGTH) {
    return `Username must be ${MIN_USERNAME_LENGTH}–${MAX_USERNAME_LENGTH} characters long.`;
  }
  if (!USERNAME_START_PATTERN.test(value)) {
    return 'Username must start with an uppercase English letter.';
  }
  if (!USERNAME_CHARS_PATTERN.test(value)) {
    return 'Username may contain only English letters and digits.';
  }
  return null;
}

export function getLoginPasswordError(value: string): ValidationError {
  if (value.length === 0) {
    return 'Password is required.';
  }
  if (value.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  return null;
}

export function getRegisterPasswordError(value: string): ValidationError {
  if (value.length === 0) {
    return 'Password is required.';
  }
  if (value.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (!PASSWORD_ALLOWED_PATTERN.test(value)) {
    return 'Password may contain only English letters, digits and special characters.';
  }
  if (!UPPERCASE_PATTERN.test(value)) {
    return 'Password must contain at least one uppercase English letter.';
  }
  if (!DIGIT_PATTERN.test(value)) {
    return 'Password must contain at least one digit.';
  }
  if (!SPECIAL_CHAR_PATTERN.test(value)) {
    return 'Password must contain at least one special character.';
  }
  return null;
}

/** Only checks that the value matches the password — strength rules are not applied here. */
export function getConfirmPasswordError(value: string, password: string): ValidationError {
  if (value.length === 0) {
    return 'Please confirm your password.';
  }
  if (value !== password) {
    return 'Passwords do not match.';
  }
  return null;
}
