import { describe, expect, it, vi } from 'vitest';
import { AVATAR_COLOR_COUNT, createAvatarPalette, getAvatarInitial } from '@/utils/avatar';

describe('getAvatarInitial', () => {
  it('upper-cases the first letter', () => {
    expect(getAvatarInitial('alex')).toBe('A');
    expect(getAvatarInitial('Zoe')).toBe('Z');
  });

  it('skips leading whitespace', () => {
    expect(getAvatarInitial('   maria')).toBe('M');
  });

  it('works for non-Latin letters and digits', () => {
    expect(getAvatarInitial('алекс')).toBe('А');
    expect(getAvatarInitial('7even')).toBe('7');
  });

  it('keeps a whole character that is made of two UTF-16 units', () => {
    expect(getAvatarInitial('😀 smile')).toBe('😀');
  });

  it('falls back to a question mark when there is nothing to show', () => {
    expect(getAvatarInitial('')).toBe('?');
    expect(getAvatarInitial('    ')).toBe('?');
  });
});

describe('createAvatarPalette', () => {
  it('picks a color between 1 and the number of avatar tokens', () => {
    for (const value of [0, 0.19, 0.2, 0.5, 0.99, 1]) {
      const color = createAvatarPalette(() => value).colorFor('Alex');
      expect(color).toBeGreaterThanOrEqual(1);
      expect(color).toBeLessThanOrEqual(AVATAR_COLOR_COUNT);
    }
  });

  it('maps the random value onto the colors', () => {
    expect(createAvatarPalette(() => 0).colorFor('a')).toBe(1);
    expect(createAvatarPalette(() => 0.99).colorFor('a')).toBe(5);
  });

  it('keeps a commenter on the same color', () => {
    const values = [0.1, 0.9, 0.5];
    const palette = createAvatarPalette(() => values.shift() ?? 0);

    const first = palette.colorFor('Alex');

    expect(palette.colorFor('Alex')).toBe(first);
    expect(palette.colorFor('Alex')).toBe(first);
  });

  it('draws once per commenter and lets different commenters differ', () => {
    const random = vi.fn<() => number>().mockReturnValueOnce(0.1).mockReturnValueOnce(0.9);
    const palette = createAvatarPalette(random);

    expect(palette.colorFor('Alex')).toBe(1);
    expect(palette.colorFor('Maria')).toBe(5);
    palette.colorFor('Alex');
    palette.colorFor('Maria');

    expect(random).toHaveBeenCalledTimes(2);
  });

  it('starts fresh with a new palette', () => {
    const first = createAvatarPalette(() => 0).colorFor('Alex');
    const second = createAvatarPalette(() => 0.99).colorFor('Alex');

    expect(first).not.toBe(second);
  });

  it('uses Math.random by default', () => {
    const color = createAvatarPalette().colorFor('Alex');
    expect(Number.isInteger(color)).toBe(true);
  });
});
