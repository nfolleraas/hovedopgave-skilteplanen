import { type RefObject, useEffect } from 'react';
import type { LeaveGuard } from './areas-step.js';

/**
 * Lets the page run `guard` before it leaves the step, e.g. to save an open
 * form. The guard is cleared when the step unmounts.
 */
export function useLeaveGuard(
  leaveGuard: RefObject<LeaveGuard | null>,
  guard: LeaveGuard,
) {
  // Every render, so the page always calls the guard with the latest state.
  useEffect(() => {
    leaveGuard.current = guard;
  });
  useEffect(
    () => () => {
      leaveGuard.current = null;
    },
    [leaveGuard],
  );
}
