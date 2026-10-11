import { describe, expect, it } from 'vitest';
import {
  getConfirmPasswordError,
  getEmailError,
  getLoginPasswordError,
  getRegisterPasswordError,
  getUsernameError,
} from '@/utils/validation';

describe('getEmailError', () => {
  it('requires a value', () => {
    expect(getEmailError('')).toBe('Email is required.');
    expect(getEmailError('   ')).toBe('Email is required.');
  });

  it.each(['plain', 'a@b', 'a b@c.com', '@c.com', 'a@.com'])('rejects %s', (value) => {
    expect(getEmailError(value)).toBe('Please enter a valid email address.');
  });

  it('accepts a valid email and ignores surrounding spaces', () => {
    expect(getEmailError('student@rs.school')).toBeNull();
    expect(getEmailError('  student@rs.school  ')).toBeNull();
  });
});

describe('getUsernameError', () => {
  it('requires a value', () => {
    expect(getUsernameError('')).toBe('Username is required.');
  });

  it('enforces the 2–30 character length', () => {
    expect(getUsernameError('A')).toContain('2–30');
    expect(getUsernameError(`A${'b'.repeat(30)}`)).toContain('2–30');
    expect(getUsernameError('Ab')).toBeNull();
    expect(getUsernameError(`A${'b'.repeat(29)}`)).toBeNull();
  });

  it('must start with an uppercase English letter', () => {
    expect(getUsernameError('alex1')).toBe(
      'Username must start with an uppercase English letter (A–Z).',
    );
    expect(getUsernameError('1Alex')).toBe(
      'Username must start with an uppercase English letter (A–Z).',
    );
    expect(getUsernameError('Алекс')).toBe(
      'Username must start with an uppercase English letter (A–Z).',
    );
  });

  it.each(['Alex_1', 'Alex 1', 'Alex-1', 'AЛекс', 'Alexé'])(
    'rejects characters other than English letters and digits: %s',
    (value) => {
      expect(getUsernameError(value)).toBe('Username may contain only English letters and digits.');
    },
  );

  it('accepts English letters and digits', () => {
    expect(getUsernameError('Alex1')).toBeNull();
  });
});

describe('getLoginPasswordError', () => {
  it('requires a value', () => {
    expect(getLoginPasswordError('')).toBe('Password is required.');
  });

  it('requires at least 6 characters', () => {
    expect(getLoginPasswordError('abcde')).toBe('Password must be at least 6 characters.');
  });

  it('applies no strength rules', () => {
    expect(getLoginPasswordError('abcdef')).toBeNull();
  });
});

describe('getRegisterPasswordError', () => {
  it('requires a value', () => {
    expect(getRegisterPasswordError('')).toBe('Password is required.');
  });

  it('requires at least 6 characters', () => {
    expect(getRegisterPasswordError('Ab1!')).toBe('Password must be at least 6 characters.');
  });

  it('rejects non-English letters and spaces', () => {
    const message = 'Password may contain only English letters, digits and special characters.';
    expect(getRegisterPasswordError('Пароль1!')).toBe(message);
    expect(getRegisterPasswordError('Abc 12!')).toBe(message);
  });

  it('requires an uppercase letter, a digit and a special character', () => {
    expect(getRegisterPasswordError('abc12!')).toBe(
      'Password must contain at least one uppercase English letter.',
    );
    expect(getRegisterPasswordError('Abcde!')).toBe('Password must contain at least one digit.');
    expect(getRegisterPasswordError('Abcde1')).toBe(
      'Password must contain at least one special character.',
    );
  });

  it('accepts a password that satisfies every rule', () => {
    expect(getRegisterPasswordError('Abc12!')).toBeNull();
  });
});

describe('getConfirmPasswordError', () => {
  it('requires a value', () => {
    expect(getConfirmPasswordError('', 'Abc12!')).toBe('Please confirm your password.');
  });

  it('must match the password', () => {
    expect(getConfirmPasswordError('Abc12?', 'Abc12!')).toBe('Passwords do not match.');
  });

  it('only compares values and does not apply strength rules', () => {
    expect(getConfirmPasswordError('abc', 'abc')).toBeNull();
  });
});
