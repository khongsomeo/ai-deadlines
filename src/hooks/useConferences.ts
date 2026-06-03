import { useState, useEffect } from 'react';
import { Conference, Deadline } from '@/types/conference';
import { getAllDeadlines, getNextUpcomingDeadline, getPrimaryDeadline } from '@/utils/deadlineUtils';
import { getDeadlineInLocalTime } from '@/utils/dateUtils';

// Non-eager glob: each value is a () => Promise<module> factory.
// Vite still bundles these files, but the actual parsing is deferred
// to when the factory is invoked — not at module initialisation time.
const conferenceModules = import.meta.glob('@/data/conferences/*.yml');

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
};

type UseConferencesResult = {
  data: Conference[];
  isLoading: boolean;
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

    cache.set(conf.id, {
      allDeadlines,
      primaryDeadline,
      primaryDeadlineDate,
      hasUpcoming: nextUpcoming !== null,
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
  const [data, setData] = useState<Conference[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [metaCache, setMetaCache] = useState<Map<string, ConferenceMeta>>(new Map());

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const all: Conference[] = [];

      await Promise.all(
        Object.values(conferenceModules).map(async (factory) => {
          const mod = (await factory()) as { default: Conference[] };
          if (mod.default && Array.isArray(mod.default)) {
            all.push(...mod.default);
          }
        })
      );

      if (!cancelled) {
        // Build the metadata cache in the same tick as the data load —
        // React 18 batches these three state updates into one re-render.
        const cache = buildMetaCache(all);
        setData(all);
        setMetaCache(cache);
        setIsLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []); // Run once on mount

  return { data, isLoading, metaCache };
}
