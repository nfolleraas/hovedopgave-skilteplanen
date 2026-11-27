import { useEffect, useState } from 'react';

/**
 * Delays a value until it has stopped changing.
 * @param value - The value that changes, e.g. a search text
 * @param delayMs - How long the value must stay the same, in milliseconds
 * @returns The last value that stayed the same for `delayMs`
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timeout);
  }, [value, delayMs]);

  return debounced;
}
