import { describe, expect, it, vi } from 'vitest';
import { watchPageActivity } from '@/state/session-checks';

function createSources() {
  const doc = new EventTarget();
  const win = new EventTarget();
  let visibilityState: DocumentVisibilityState = 'visible';

  const docSource = {
    get visibilityState() {
      return visibilityState;
    },
    addEventListener: (type: 'visibilitychange', listener: () => void) =>
      doc.addEventListener(type, listener),
    removeEventListener: (type: 'visibilitychange', listener: () => void) =>
      doc.removeEventListener(type, listener),
  };
  const winSource = {
    addEventListener: (type: 'focus', listener: () => void) => win.addEventListener(type, listener),
    removeEventListener: (type: 'focus', listener: () => void) =>
      win.removeEventListener(type, listener),
  };

  return {
    docSource,
    winSource,
    changeVisibility: (state: DocumentVisibilityState) => {
      visibilityState = state;
      doc.dispatchEvent(new Event('visibilitychange'));
    },
    focusWindow: () => win.dispatchEvent(new Event('focus')),
  };
}

describe('watchPageActivity', () => {
  it('checks when the tab becomes visible again', () => {
    const { docSource, winSource, changeVisibility } = createSources();
    const check = vi.fn<() => void>();
    watchPageActivity(check, docSource, winSource);

    changeVisibility('visible');

    expect(check).toHaveBeenCalledTimes(1);
  });

  it('does not check when the tab is hidden', () => {
    const { docSource, winSource, changeVisibility } = createSources();
    const check = vi.fn<() => void>();
    watchPageActivity(check, docSource, winSource);

    changeVisibility('hidden');

    expect(check).not.toHaveBeenCalled();
  });

  it('checks when the window regains focus', () => {
    const { docSource, winSource, focusWindow } = createSources();
    const check = vi.fn<() => void>();
    watchPageActivity(check, docSource, winSource);

    focusWindow();

    expect(check).toHaveBeenCalledTimes(1);
  });

  it('stops checking after the returned cleanup runs', () => {
    const { docSource, winSource, changeVisibility, focusWindow } = createSources();
    const check = vi.fn<() => void>();
    const stop = watchPageActivity(check, docSource, winSource);

    stop();
    changeVisibility('visible');
    focusWindow();

    expect(check).not.toHaveBeenCalled();
  });
});
