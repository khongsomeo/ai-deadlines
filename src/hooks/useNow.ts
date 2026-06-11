import { useState, useEffect } from "react";

/**
 * Returns the current `Date`, updated every `intervalMs` milliseconds.
 * Consumers should derive stable primitives (e.g. `Math.floor(now.getTime() / 60_000)`)
 * before using the value in `useMemo` / `useEffect` dep arrays to prevent
 * excessive re-computations.
 *
 * @param intervalMs Tick interval in milliseconds. Defaults to 60 000 (1 minute).
 */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
