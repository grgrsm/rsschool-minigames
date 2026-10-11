import { describe, expect, it, vi } from 'vitest';
import { createProtectedActionGuard } from '@/state/protected-action-guard';
import type { AuthUser, SessionState } from '@/types/auth';

const user: AuthUser = { fullName: 'Alex Gamer', initials: 'AG', email: 'alex@minigames.com' };

function setup(initial: SessionState, validate: () => boolean) {
  let state = initial;
  const onUnauthenticated = vi.fn<(details: { expired: boolean }) => void>();
  const guard = createProtectedActionGuard({
    validate: () => {
      const valid = validate();
      if (!valid) {
        state = { status: 'guest' };
      }
      return valid;
    },
    getState: () => state,
    onUnauthenticated,
  });
  return { guard, onUnauthenticated };
}

describe('protected action guard', () => {
  it('returns the signed-in user and asks for nothing', () => {
    const { guard, onUnauthenticated } = setup({ status: 'authenticated', user }, () => true);

    expect(guard()).toEqual(user);
    expect(onUnauthenticated).not.toHaveBeenCalled();
  });

  it('stops a guest and asks them to authenticate', () => {
    const { guard, onUnauthenticated } = setup({ status: 'guest' }, () => false);

    expect(guard()).toBeNull();
    expect(onUnauthenticated).toHaveBeenCalledTimes(1);
    expect(onUnauthenticated).toHaveBeenCalledWith({ expired: false });
  });

  it('stops a user whose session just expired and reports it as expired', () => {
    const { guard, onUnauthenticated } = setup({ status: 'authenticated', user }, () => false);

    expect(guard()).toBeNull();
    expect(onUnauthenticated).toHaveBeenCalledWith({ expired: true });
  });

  it('re-checks the session on every call', () => {
    let active = true;
    const { guard, onUnauthenticated } = setup({ status: 'authenticated', user }, () => active);

    expect(guard()).toEqual(user);
    active = false;
    expect(guard()).toBeNull();
    expect(onUnauthenticated).toHaveBeenCalledTimes(1);
  });
});
