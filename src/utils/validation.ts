import type { FieldValidationResult } from '@/types/auth';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

export function validateEmail(value: string): FieldValidationResult {
  if (value.trim().length === 0) {
    return { state: 'default', message: null };
  }
  if (!EMAIL_PATTERN.test(value)) {
    return { state: 'error', message: 'Please enter a valid email address.' };
  }
  return { state: 'filled', message: null };
}

export function validatePassword(value: string): FieldValidationResult {
  if (value.length === 0) {
    return { state: 'default', message: null };
  }
  if (value.length < MIN_PASSWORD_LENGTH) {
    return {
      state: 'error',
      message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    };
  }
  return { state: 'filled', message: null };
}

export function validateName(value: string): FieldValidationResult {
  if (value.trim().length === 0) {
    return { state: 'default', message: null };
  }
  if (value.trim().length < 2) {
    return { state: 'error', message: 'Please enter your full name.' };
  }
  return { state: 'filled', message: null };
}
