import { useRef, useLayoutEffect, useState, useEffect, memo, useCallback } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import ConferenceCard from "./ConferenceCard";
import ConferenceDialog from "./ConferenceDialog";
import { Conference } from "@/types/conference";

interface VirtualConferenceGridProps {
  conferences: Conference[];
  onTagClick?: (tag: string) => void;
}

/**
 * Returns the number of grid columns matching the Tailwind responsive
 * breakpoints used in the original layout (1 / md:2 / lg:3).
 * Re-evaluates on window resize.
 */
function useColumnCount(): number {
  const getCount = (): number => {
    if (window.innerWidth >= 1024) return 3; // lg:
    if (window.innerWidth >= 768) return 2;  // md:
    return 1;
  };

  const [count, setCount] = useState(getCount);

  useEffect(() => {
    const onResize = () => setCount(getCount());
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return count;
}

/**
 * Estimated row height (px) used as the initial size guess.
 * `measureElement` corrects this per-row after first paint, so accuracy
 * here only affects the initial scroll-thumb size.
 */
const ESTIMATED_ROW_HEIGHT = 380;

/**
 * Extra rows rendered above and below the visible window to prevent
 * blank flashes during fast scrolling.
 */
const OVERSCAN_ROWS = 2;

/**
 * Virtualized conference grid.
 *
 * Fixes Problem 3 — only the rows currently in (or near) the viewport
 * are mounted in the DOM. When "Show past conferences" is toggled on,
 * mounting hundreds of ConferenceCard components simultaneously is avoided.
 *
 * The visual output is identical to the original CSS grid:
 *   `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`
 *
 * Implementation notes:
 * - Uses `useWindowVirtualizer` (page scroll, not a scrollable div).
 * - Groups conferences into rows of `columnCount`, then virtualizes rows.
 * - `measureElement` auto-corrects row heights after the first paint,
 *   handling variable card heights (different deadlines / tags counts).
 * - `scrollMargin` is updated via `useLayoutEffect` to account for the
 *   header and filter controls above the grid.
 */
function VirtualConferenceGrid({
  conferences,
  onTagClick,
}: VirtualConferenceGridProps) {
  // ALL hooks must be called unconditionally before any early return.
  // Previously these were after `if (conferences.length === 0) return ...`,
  // which is a Rules of Hooks violation — React crashes when the list
  // transitions between empty and non-empty while the component stays mounted
  // (e.g. a filter change producing zero results, then being cleared).
  const [selectedConference, setSelectedConference] = useState<Conference | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleCardClick = useCallback((conf: Conference) => {
    setSelectedConference(conf);
    setIsDialogOpen(true);
  }, []);

  const columnCount = useColumnCount();
  const rowCount = Math.ceil(conferences.length / columnCount);

  // Ref to the outer wrapper div so we can measure its distance from the
  // top of the page — required by useWindowVirtualizer to translate
  // scroll position into virtual-item indices correctly.
  const listRef = useRef<HTMLDivElement>(null);
  const listOffsetRef = useRef(0);

  // Run once on mount to record the list's distance from the page top.
  useLayoutEffect(() => {
    listOffsetRef.current = listRef.current?.offsetTop ?? 0;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const virtualizer = useWindowVirtualizer({
    count: rowCount,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    overscan: OVERSCAN_ROWS,
    scrollMargin: listOffsetRef.current,
  });

  const virtualItems = virtualizer.getVirtualItems();

  // Safe to early-return only after all hooks above have been called.
  if (conferences.length === 0) {
    return (
      <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 rounded-md p-4 mb-6">
        <p className="text-center">
          There are no upcoming conferences for the selected categories - enable &quot;Show past conferences&quot; to see previous ones
        </p>
      </div>
    );
  }

  return (
    <div ref={listRef}>
      {/* Outer div holds the full virtual height so the scrollbar is correct */}
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: "relative",
        }}
      >
        {virtualItems.map((virtualRow) => {
          const startIdx = virtualRow.index * columnCount;
          const rowCards = conferences.slice(startIdx, startIdx + columnCount);

          return (
            <div
              key={virtualRow.key}
              // data-index is read by measureElement to update the row height
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                // Subtract scrollMargin so the translateY is relative to this
                // container's top edge, not the page top.
                transform: `translateY(${
                  virtualRow.start - virtualizer.options.scrollMargin
                }px)`,
              }}
            >
              {/*
               * Preserve the original grid layout inside each row.
               * pb-6 reproduces the gap-6 spacing between rows
               * (gap-6 only applies between sibling items within a grid;
               * since each row is an absolute-positioned wrapper, we need
               * bottom padding to replicate the vertical gap).
               */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-6">
                {rowCards.map((conf) => (
                  <ConferenceCard 
                    key={conf.id} 
                    {...conf} 
                    onTagClick={onTagClick} 
                    onClick={handleCardClick}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      
      {selectedConference && (
        <ConferenceDialog
          conference={selectedConference}
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
        />
      )}
    </div>
  );
}
/**
 * Memoized so it only re-renders when the `conferences` array reference changes
 * (i.e. when the debounce fires and the filter produces a new result).
 * Keystrokes between debounce fires no longer cause this component to re-render.
 */
export default memo(VirtualConferenceGrid);
