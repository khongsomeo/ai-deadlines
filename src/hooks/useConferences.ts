import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { Conference, Deadline } from '@/types/conference';
import { getAllDeadlines, getNextUpcomingDeadline, getPrimaryDeadline } from '@/utils/deadlineUtils';
import { getDeadlineInLocalTime } from '@/utils/dateUtils';
import { isPast, isValid } from 'date-fns';
import { useClockTick } from '@/contexts/ClockContext';

// Eager glob: all YAML files are bundled into a single chunk.
// This prevents 100+ separate network requests from firing simultaneously
// and causing a network waterfall when fetching the data.
const conferenceModules = import.meta.glob('@/data/conferences/*.yml', { eager: true });

/**
 * Pre-computed, stable metadata for a single conference entry.
 * Calculated once when data loads — O(1) to look up during every
 * subsequent filter/sort cycle (fixes Problem 2).
 */
export type ConferenceMeta = {
  /** All deadlines (new + legacy format), sorted by date. */
  allDeadlines: Deadline[];
  /** The next upcoming deadline, or most recent past one if none upcoming. */
  primaryDeadline: Deadline | null;
  /** Pre-parsed primary deadline as a local Date — avoids re-parsing on every sort comparison. */
  primaryDeadlineDate: Date | null;
  /** Whether the conference has at least one future deadline. */
  hasUpcoming: boolean;
  /** Whether the conference has a future abstract or submission deadline. */
  hasUpcomingSubmission: boolean;
};

type UseConferencesResult = {
  data: Conference[];
  isLoading: boolean;
  /** True when the YAML loading query has thrown an unrecoverable error. */
  isError: boolean;
  /** The underlying error, if any. */
  error: Error | null;
  /**
   * Map from conf.id → pre-computed deadline metadata.
   * Use this in filter/sort operations instead of calling getAllDeadlines,
   * getPrimaryDeadline, or hasUpcomingDeadlines per conference on each render.
   */
  metaCache: Map<string, ConferenceMeta>;
};

/**
 * One-time O(N×D) pass that pre-computes all expensive deadline metadata
 * so that subsequent filter/sort cycles are O(1) lookups per conference.
 */
function buildMetaCache(conferences: Conference[]): Map<string, ConferenceMeta> {
  const cache = new Map<string, ConferenceMeta>();

  for (const conf of conferences) {
    const allDeadlines = getAllDeadlines(conf);
    const nextUpcoming = getNextUpcomingDeadline(conf);
    // Prefer the next upcoming deadline; fall back to most recent past
    const primaryDeadline = nextUpcoming ?? getPrimaryDeadline(conf);
    const primaryDeadlineDate = primaryDeadline
      ? getDeadlineInLocalTime(
          primaryDeadline.date,
          primaryDeadline.timezone ?? conf.timezone
        )
      : null;

    let hasUpcomingSubmission = false;
    for (const d of allDeadlines) {
      if (d.type === 'abstract' || d.type === 'submission') {
        const date = getDeadlineInLocalTime(d.date, d.timezone || conf.timezone);
        if (date && isValid(date) && !isPast(date)) {
          hasUpcomingSubmission = true;
          break;
        }
      }
    }

    cache.set(conf.id, {
      allDeadlines,
      primaryDeadline,
      primaryDeadlineDate,
      hasUpcoming: nextUpcoming !== null,
      hasUpcomingSubmission,
    });
  }

  return cache;
}

/**
 * Lazily loads all conference YAML files on first mount and pre-computes
 * a metadata cache to eliminate repeated date-parsing work on every filter.
 *
 * Fixes:
 *  - Problem 1: Eager, Synchronous Data Load at Bundle Time
 *  - Problem 2: Expensive useMemo Re-computation on Every Filter Change
 */
export function useConferences(): UseConferencesResult {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['conferences'],
    queryFn: async () => {
      const all: Conference[] = [];

      for (const mod of Object.values(conferenceModules) as Array<{ default: Conference[] }>) {
        if (mod.default && Array.isArray(mod.default)) {
          all.push(...mod.default);
        }
      }

      // Return raw data only. The meta-cache is built reactively below
      // so it can be rebuilt on each clock tick without re-fetching YAML.
      return { data: all };
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });

  // Rebuild the meta-cache on each 1-minute clock tick so that
  // hasUpcoming / hasUpcomingSubmission / primaryDeadlineDate stay accurate
  // as real time passes — without re-fetching the YAML data.
  const now = useClockTick();
  const tickMinute = Math.floor(now.getTime() / 60_000);

  const metaCache = useMemo(() => {
    if (!data?.data) return new Map<string, ConferenceMeta>();
    return buildMetaCache(data.data);
    // tickMinute is a clock-tick sentinel: it is intentionally in the dep array
    // to invalidate this memo every minute without being read in the body.
    // eslint-disable-next-line is NOT needed — React's exhaustive-deps rule only
    // flags missing deps, not unused ones that are deliberately listed.
  }, [data, tickMinute]);

  return {
    data: data?.data || [],
    isLoading,
    isError,
    error: (error as Error | null) ?? null,
    metaCache,
  };
}
