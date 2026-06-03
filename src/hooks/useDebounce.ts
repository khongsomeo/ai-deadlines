import { useState, useEffect } from 'react';

/**
 * Returns a debounced copy of `value` that only updates after `delay` ms
 * of no further changes.
 *
 * Usage:
 *   const debouncedQuery = useDebounce(searchQuery, 250);
 *   // Use debouncedQuery in useMemo deps instead of searchQuery so that
 *   // expensive filtering only runs when the user pauses typing.
 *
 * Fixes Problem 5 — Search Input Has No Debounce.
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cancel the pending timer if value changes before the delay elapses
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
