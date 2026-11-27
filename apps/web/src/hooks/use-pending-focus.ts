import { useEffect, useState } from 'react';
import { focusById } from '../utils/focus-by-id.js';

/**
 * Focuses an element by id once it exists, e.g. a card's Edit button after
 * the card collapses, or the next card after one is deleted. The request
 * waits while `isBlocked`, such as while a dialog holds focus.
 *
 * The request is state, not a ref: setting it renders again, and the effect
 * after that render can find an element the render has just added.
 */
export function usePendingFocus(isBlocked: boolean) {
  const [focusId, setFocusId] = useState<string | null>(null);

  // No dependency list: the element can appear in any later render, for
  // example after a save finishes.
  useEffect(() => {
    if (!focusId || isBlocked) return;
    if (focusById(focusId)) setFocusId(null);
  });

  return setFocusId;
}
