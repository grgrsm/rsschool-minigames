import { describe, expect, it } from 'vitest';
import { toSessionProfile } from '@/auth/auth-profile';

describe('toSessionProfile', () => {
  it('maps a complete Google user', () => {
    expect(
      toSessionProfile({
        displayName: 'Alex Gamer',
        email: 'alex@gmail.com',
        photoURL: 'https://example.com/a.png',
      }),
    ).toEqual({
      displayName: 'Alex Gamer',
      email: 'alex@gmail.com',
      avatarUrl: 'https://example.com/a.png',
    });
  });

  it('trims the name, email and avatar url', () => {
    expect(
      toSessionProfile({
        displayName: '  Alex  ',
        email: ' alex@gmail.com ',
        photoURL: ' https://example.com/a.png ',
      }),
    ).toEqual({
      displayName: 'Alex',
      email: 'alex@gmail.com',
      avatarUrl: 'https://example.com/a.png',
    });
  });

  it.each([null, '', '   '])('uses the email name when the display name is %j', (displayName) => {
    expect(
      toSessionProfile({ displayName, email: 'alex.gamer@gmail.com', photoURL: null }),
    ).toEqual({ displayName: 'alex.gamer', email: 'alex.gamer@gmail.com' });
  });

  it('uses a neutral name when the email has no name part', () => {
    expect(toSessionProfile({ displayName: null, email: '@gmail.com', photoURL: null })).toEqual({
      displayName: 'Player',
      email: '@gmail.com',
    });
  });

  it.each([null, '', '   '])('leaves out the avatar when the photo is %j', (photoURL) => {
    const profile = toSessionProfile({ displayName: 'Alex', email: 'alex@gmail.com', photoURL });
    expect(profile).toEqual({ displayName: 'Alex', email: 'alex@gmail.com' });
    expect(profile).not.toHaveProperty('avatarUrl');
  });

  it.each([null, '', '   '])('returns null when the email is %j', (email) => {
    expect(toSessionProfile({ displayName: 'Alex', email, photoURL: null })).toBeNull();
  });
});
