/** The first non-whitespace character of a name, upper-cased — `?` when there is none. */
export function getAvatarInitial(name: string): string {
  const first = Array.from(name.trimStart())[0];
  return first === undefined ? '?' : first.toUpperCase();
}

/** How many `--color-avatar-N` design tokens exist. */
export const AVATAR_COLOR_COUNT = 5;

export interface AvatarPalette {
  /** The color number (1..`AVATAR_COLOR_COUNT`) of a commenter — the same one every time. */
  colorFor: (commenter: string) => number;
}

/**
 * Hands out a random avatar color per commenter and remembers it, so the same person keeps
 * the same color across re-renders for as long as the palette lives.
 */
export function createAvatarPalette(random: () => number = Math.random): AvatarPalette {
  const assigned = new Map<string, number>();

  return {
    colorFor: (commenter) => {
      let color = assigned.get(commenter);
      if (color === undefined) {
        color = Math.min(AVATAR_COLOR_COUNT, Math.floor(random() * AVATAR_COLOR_COUNT) + 1);
        assigned.set(commenter, color);
      }
      return color;
    },
  };
}
