import { el } from '@/utils/dom';

export type SnackbarVariant = 'info' | 'success' | 'warning' | 'error';

const DEFAULT_DURATION_MS = 4000;
const MIN_DURATION_MS = 3000;
const MAX_DURATION_MS = 5000;
const MAX_VISIBLE = 3;
const EXIT_ANIMATION_MS = 200;

let region: HTMLElement | null = null;

function getRegion(): HTMLElement {
  if (region && region.isConnected) {
    return region;
  }

  region = el('div', {
    className: 'snackbar-region',
    attrs: { role: 'status', 'aria-live': 'polite' },
  });
  document.body.append(region);

  return region;
}

function dismiss(snackbar: HTMLElement): void {
  if (!snackbar.isConnected || snackbar.classList.contains('snackbar--leaving')) {
    return;
  }

  snackbar.classList.add('snackbar--leaving');
  window.setTimeout(() => snackbar.remove(), EXIT_ANIMATION_MS);
}

/**
 * Non-blocking notification that hides itself after 3–5 seconds
 * (the requested duration is clamped into that range).
 */
export function showSnackbar(
  message: string,
  variant: SnackbarVariant = 'info',
  durationMs: number = DEFAULT_DURATION_MS,
): void {
  const container = getRegion();
  const snackbar = el('div', { className: `snackbar snackbar--${variant}`, text: message });

  snackbar.addEventListener('click', () => dismiss(snackbar));
  container.append(snackbar);

  while (container.children.length > MAX_VISIBLE) {
    container.firstElementChild?.remove();
  }

  const duration = Math.min(MAX_DURATION_MS, Math.max(MIN_DURATION_MS, durationMs));
  window.setTimeout(() => dismiss(snackbar), duration);
}
