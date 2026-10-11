import { showSnackbar } from '@/components/feedback/snackbar';
import { openAuthModal } from '@/router';
import { sessionStore } from '@/state/session';
import type { AuthTab } from '@/types/auth';

/**
 * The entry point for every control that opens the Auth dialog. A signed-in user gets a
 * Snackbar instead, and the URL stays untouched (no history entry is added).
 */
export function openAuthDialog(tab: AuthTab): void {
  if (sessionStore.validate()) {
    showSnackbar('You are already logged in.', 'warning');
    return;
  }
  openAuthModal(tab);
}
