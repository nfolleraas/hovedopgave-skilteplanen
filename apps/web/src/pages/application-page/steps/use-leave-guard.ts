import { type RefObject, useEffect } from 'react';
import type { LeaveGuard } from './step-props.js';

/**
 * Lets the page run `guard` before it leaves the step, e.g. to save an open
 * form. Does nothing without a `leaveGuard`, such as when the step is
 * embedded in a form with its own navigation. Cleared on unmount.
 */
export function useLeaveGuard(
  leaveGuard: RefObject<LeaveGuard | null> | undefined,
  guard: LeaveGuard,
) {
  // Every render, so the page always calls the guard with the latest state.
  useEffect(() => {
    if (leaveGuard) leaveGuard.current = guard;
  });
  useEffect(
    () => () => {
      if (leaveGuard) leaveGuard.current = null;
    },
    [leaveGuard],
  );
}
