interface VisibilitySource {
  readonly visibilityState: DocumentVisibilityState;
  addEventListener: (type: 'visibilitychange', listener: () => void) => void;
  removeEventListener: (type: 'visibilitychange', listener: () => void) => void;
}

interface FocusSource {
  addEventListener: (type: 'focus', listener: () => void) => void;
  removeEventListener: (type: 'focus', listener: () => void) => void;
}

/**
 * Runs `check` whenever the page becomes active again: the tab turns visible
 * or the window regains focus. Returns a function that removes both listeners.
 */
export function watchPageActivity(
  check: () => void,
  doc: VisibilitySource,
  win: FocusSource,
): () => void {
  const onVisibilityChange = (): void => {
    if (doc.visibilityState === 'visible') {
      check();
    }
  };

  doc.addEventListener('visibilitychange', onVisibilityChange);
  win.addEventListener('focus', check);

  return () => {
    doc.removeEventListener('visibilitychange', onVisibilityChange);
    win.removeEventListener('focus', check);
  };
}
