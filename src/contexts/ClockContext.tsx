import { createContext, useContext, type ReactNode } from "react";
import { useNow } from "@/hooks/useNow";

const ClockContext = createContext<Date | undefined>(undefined);

/**
 * Provides a single shared clock tick (every 60 s) to the entire component
 * tree. Wrap the app root in this provider so that only **one** `setInterval`
 * is ever created, regardless of how many components consume `useClockTick`.
 */
export function ClockProvider({ children }: { children: ReactNode }) {
  const now = useNow(60_000);
  return <ClockContext.Provider value={now}>{children}</ClockContext.Provider>;
}

/**
 * Returns the shared current `Date`, updated every 60 seconds.
 *
 * Derive a stable minute-resolution integer before using in `useMemo` deps:
 * ```ts
 * const now = useClockTick();
 * const tickMinute = Math.floor(now.getTime() / 60_000);
 * ```
 *
 * Must be used inside `<ClockProvider>`.
 */
export function useClockTick(): Date {
  const ctx = useContext(ClockContext);
  if (ctx === undefined) {
    throw new Error("useClockTick must be used within a <ClockProvider>");
  }
  return ctx;
}
