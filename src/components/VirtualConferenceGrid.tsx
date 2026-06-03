import { useRef, useLayoutEffect, useState, useEffect, memo } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import ConferenceCard from "./ConferenceCard";
import { Conference } from "@/types/conference";

interface VirtualConferenceGridProps {
  conferences: Conference[];
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
    window.addEventListener("resize", onResize);
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
}: VirtualConferenceGridProps) {
  const columnCount = useColumnCount();
  const rowCount = Math.ceil(conferences.length / columnCount);

  // Ref to the outer wrapper div so we can measure its distance from the
  // top of the page — required by useWindowVirtualizer to translate
  // scroll position into virtual-item indices correctly.
  const listRef = useRef<HTMLDivElement>(null);
  const listOffsetRef = useRef(0);

  // Run once on mount to record the list's distance from the page top.
  // The header height is static, so this value doesn't change on scroll.
  // A resize listener in useColumnCount() already re-renders the component
  // when the viewport width changes, which re-runs this effect via columnCount dep.
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
                  <ConferenceCard key={conf.id} {...conf} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
/**
 * Memoized so it only re-renders when the `conferences` array reference changes
 * (i.e. when the debounce fires and the filter produces a new result).
 * Keystrokes between debounce fires no longer cause this component to re-render.
 */
export default memo(VirtualConferenceGrid);
