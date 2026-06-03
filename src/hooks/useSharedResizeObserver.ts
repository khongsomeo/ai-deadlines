import { useEffect, useLayoutEffect, useRef } from 'react';

type ResizeCallback = (entry: ResizeObserverEntry) => void;

// Shared map of callbacks for observed elements
const observerCallbacks = new Map<Element, ResizeCallback>();

// Single shared observer instance
let observer: ResizeObserver | null = null;

const getObserver = () => {
  if (typeof window === 'undefined') return null;
  if (!observer) {
    observer = new ResizeObserver((entries) => {
      // Use requestAnimationFrame to avoid "ResizeObserver loop limit exceeded" errors
      // and ensure state updates are batched smoothly.
      window.requestAnimationFrame(() => {
        for (const entry of entries) {
          const callback = observerCallbacks.get(entry.target);
          if (callback) {
            callback(entry);
          }
        }
      });
    });
  }
  return observer;
};

/**
 * A shared ResizeObserver hook that prevents the layout thrashing caused by
 * instantiating hundreds of individual ResizeObservers or window.resize listeners.
 * 
 * Fixes Problem 4 - DeadlineProgress Causes Layout Thrashing Per Card.
 */
export function useSharedResizeObserver(
  ref: React.RefObject<Element>,
  callback: ResizeCallback
) {
  const callbackRef = useRef(callback);
  
  // Update ref in layout effect so the latest callback is always available
  useLayoutEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const obs = getObserver();
    if (!obs) return;

    observerCallbacks.set(element, (entry) => callbackRef.current(entry));
    obs.observe(element);

    return () => {
      observerCallbacks.delete(element);
      obs.unobserve(element);
      
      // Clean up the observer if it's no longer watching anything
      if (observerCallbacks.size === 0 && observer) {
        observer.disconnect();
        observer = null;
      }
    };
  }, [ref]);
}
