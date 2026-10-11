import { showSnackbar } from '@/components/feedback/snackbar';
import { openAuthModal } from '@/router';
import { sessionStore } from '@/state/session';
import { createProtectedActionGuard } from '@/state/protected-action-guard';

/**
 * Returns the signed-in user, or `null` after opening the Auth dialog (with a warning for a
 * guest; an expired session has already been announced by the session store).
 */
export const requireAuthenticatedUser = createProtectedActionGuard({
  validate: () => sessionStore.validate(),
  getState: () => sessionStore.getState(),
  onUnauthenticated: ({ expired }) => {
    if (!expired) {
      showSnackbar('Please log in to use this feature.', 'warning');
    }
    openAuthModal('login');
  },
});
