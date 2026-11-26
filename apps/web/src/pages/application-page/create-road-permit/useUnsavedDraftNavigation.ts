import { useEffect } from 'react';
import { useBlocker } from 'react-router';

export function useUnsavedDraftNavigation(
  hasUnsavedChanges: boolean,
  handleSave: () => Promise<boolean>,
) {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      hasUnsavedChanges &&
      (currentLocation.pathname !== nextLocation.pathname ||
        currentLocation.search !== nextLocation.search),
  );

  useEffect(() => {
    if (!hasUnsavedChanges) return;

    /** Requests the browser confirmation for reloads and tab or window closure. */
    function confirmUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = '';
    }

    window.addEventListener('beforeunload', confirmUnload);
    return () => window.removeEventListener('beforeunload', confirmUnload);
  }, [hasUnsavedChanges]);

  /** Continues the blocked navigation only after the draft saves successfully. */
  async function saveAndLeave() {
    if (blocker.state !== 'blocked') return;
    if (!hasUnsavedChanges || (await handleSave())) blocker.proceed();
  }

  return { blocker, saveAndLeave };
}
