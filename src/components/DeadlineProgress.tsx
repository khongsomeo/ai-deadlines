import { useRef, useLayoutEffect, useState, useMemo } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { isValid, isPast, format, differenceInMilliseconds } from "date-fns";
import { getDeadlineInLocalTime } from '@/utils/dateUtils';
import { useSharedResizeObserver } from "@/hooks/useSharedResizeObserver";

// 9.3 — Hoisted to module level: the user's timezone never changes during a session,
// so creating a new Intl.DateTimeFormat object per step per render is pure waste.
const LOCAL_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

interface DeadlineStep {
  label: string;
  date: string;
  timezone?: string;
}

interface DeadlineProgressProps {
  steps: DeadlineStep[];
}

const DAYS_BEFORE_START = 30;
const MIN_STEP_DISTANCE = 18; // Minimum pixels between step centers

const DeadlineProgress = ({ steps }: DeadlineProgressProps) => {
  // 9.1 — Memoize date parsing so it only re-runs when `steps` reference changes,
  // not on every parent re-render (e.g. barWidth state updates).
  const validSteps = useMemo(() => {
    return steps.flatMap(step => {
      if (step.date === 'TBD') return [];
      const parsedDate = getDeadlineInLocalTime(step.date, step.timezone);
      if (!parsedDate || !isValid(parsedDate)) return [];
      if (isPast(parsedDate)) return []; // Only keep future deadlines
      return [{ ...step, parsedDate }];
    }).sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());
  }, [steps]);

  const barRef = useRef<HTMLDivElement>(null);
  const [barWidth, setBarWidth] = useState(0);

  useLayoutEffect(() => {
    if (barRef.current) {
      setBarWidth(barRef.current.offsetWidth);
    }
  }, []);

  useSharedResizeObserver(barRef, (entry) => {
    setBarWidth(Math.round(entry.contentRect.width));
  });

  // 9.1 — Wrap all coordinate math in a single useMemo so it only re-computes
  //        when validSteps or barWidth changes.
  // 9.4 — Use step.parsedDate in the anchor loop instead of re-calling
  //        getDeadlineInLocalTime (which already ran during validSteps building).
  const computed = useMemo(() => {
    if (validSteps.length === 0) return null;

    const now = new Date();
    const singleDeadline = validSteps.length === 1;
    const firstStepDate = validSteps[0].parsedDate;
    const lastStepDate = singleDeadline
      ? firstStepDate
      : validSteps[validSteps.length - 1].parsedDate;

    if (!firstStepDate || !lastStepDate || !isValid(firstStepDate) || !isValid(lastStepDate)) {
      return null;
    }

    const extendedStartDate = new Date(
      firstStepDate.getTime() - DAYS_BEFORE_START * 24 * 60 * 60 * 1000
    );

    // Calculate base positions using time ratios
    const baseStepPositions = barWidth > 0
      ? validSteps.map(step => {
          const stepDate = step.parsedDate;
          if (!stepDate || !isValid(stepDate)) return 0;
          if (singleDeadline) return barWidth;
          const preDeadlineWidth = barWidth * 0.2;
          const deadlineWidth = barWidth * 0.8;
          return preDeadlineWidth +
            (differenceInMilliseconds(stepDate, firstStepDate) /
              differenceInMilliseconds(lastStepDate, firstStepDate)) * deadlineWidth;
        })
      : validSteps.map(() => 0);

    // Enforce minimum spacing between dots
    const adjustedPositions: number[] = [];
    for (let i = 0; i < baseStepPositions.length; i++) {
      if (i === 0) {
        adjustedPositions.push(baseStepPositions[i]);
      } else {
        const minPos = adjustedPositions[i - 1] + MIN_STEP_DISTANCE;
        adjustedPositions.push(Math.max(baseStepPositions[i], minPos));
      }
    }

    // Scale down if adjusted positions exceed bar width
    let stepPositions = adjustedPositions;
    const lastAdj = adjustedPositions[adjustedPositions.length - 1];
    if (adjustedPositions.length > 0 && lastAdj > barWidth) {
      const scaleFactor = barWidth / lastAdj;
      stepPositions = adjustedPositions.map(pos => pos * scaleFactor);
    }

    // Build time→pixel anchor mapping for progress interpolation.
    // 9.4 — Use step.parsedDate directly (already computed) instead of
    //        re-calling getDeadlineInLocalTime in this loop.
    const anchorTimes: number[] = [extendedStartDate.getTime()];
    const anchorPx: number[] = [0];
    validSteps.forEach((step, i) => {
      const stepDate = step.parsedDate; // ← was: getDeadlineInLocalTime(step.date, step.timezone)
      if (stepDate && isValid(stepDate)) {
        anchorTimes.push(stepDate.getTime());
        anchorPx.push(stepPositions[i]);
      }
    });
    if (anchorTimes[anchorTimes.length - 1] !== lastStepDate.getTime()) {
      anchorTimes.push(lastStepDate.getTime());
      anchorPx.push(barWidth);
    }

    // Interpolate current progress position
    let progressPx = 0;
    if (barWidth > 0) {
      const nowMs = now.getTime();
      if (nowMs <= anchorTimes[0]) {
        progressPx = 0;
      } else if (nowMs >= anchorTimes[anchorTimes.length - 1]) {
        progressPx = barWidth;
      } else {
        for (let i = 1; i < anchorTimes.length; i++) {
          if (nowMs <= anchorTimes[i]) {
            const segT = (nowMs - anchorTimes[i - 1]) / (anchorTimes[i] - anchorTimes[i - 1]);
            progressPx = anchorPx[i - 1] + segT * (anchorPx[i] - anchorPx[i - 1]);
            break;
          }
        }
      }
    }

    return { extendedStartDate, stepPositions, progressPx };
  }, [validSteps, barWidth]);

  if (validSteps.length === 0 || !computed) {
    const hasTbdOrEmpty = steps.length === 0 || steps.every(s => s.date === 'TBD');
    return (
      <div className="w-full flex items-center justify-center mt-4 py-2 text-sm text-muted-foreground bg-neutral-50 dark:bg-neutral-800/50 rounded-md border border-dashed border-neutral-200 dark:border-neutral-700">
        <span className="flex items-center gap-2">
          {hasTbdOrEmpty ? (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              No deadlines announced yet
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              All deadlines have passed
            </>
          )}
        </span>
      </div>
    );
  }

  const { extendedStartDate, stepPositions, progressPx } = computed;

  return (
    <div className="flex justify-center w-full mt-14 mb-4">
      <div className="relative w-full max-w-xl px-2">
        <div ref={barRef} className="relative w-full h-2 bg-muted dark:bg-muted rounded-full mx-auto">
          {/* Progress fill */}
          <div
            className="absolute top-0 left-0 h-2 bg-primary dark:bg-iris rounded-full transition-all"
            style={{ width: `${progressPx}px`, zIndex: 1 }}
          />

          {/* Extended start marker */}
          {extendedStartDate ? (
            <div
              className="absolute"
              style={{ left: 0, top: "50%", transform: "translate(-50%, -50%)", zIndex: 2 }}
            >
              <div className="w-3 h-3 bg-card dark:bg-card rounded-full border-2 border-muted dark:border-muted-foreground/50" />
              <span
                className="absolute whitespace-nowrap text-[10px] text-muted-foreground dark:text-muted-foreground"
                style={{ top: "-24px", transform: "rotate(-45deg)", transformOrigin: "left bottom", left: "10px" }}
              >
                Start
              </span>
            </div>
          ) : null}

          {/* Step markers */}
          {validSteps.map((step, idx) => {
            const stepDate = step.parsedDate;
            const status = stepDate && isPast(stepDate) ? 'past' : 'upcoming';
            const leftPx = stepPositions[idx];
            const dateLabel = stepDate ? format(stepDate, "MMM d") : 'TBD';

            return (
              <TooltipProvider key={step.label + idx}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className="absolute flex flex-col items-center"
                      style={{
                        left: `${leftPx}px`,
                        top: "50%",
                        transform: "translate(-50%, -50%)",
                        zIndex: 2,
                        cursor: "pointer"
                      }}
                    >
                      <span
                        className="absolute whitespace-nowrap text-[10px] text-muted-foreground dark:text-muted-foreground"
                        style={{ top: "-24px", transform: "rotate(-45deg)", transformOrigin: "left bottom", left: "10px" }}
                      >
                        {dateLabel}
                      </span>
                      <div
                        className={`w-4 h-4 rounded-full ${
                          status === 'past'
                            ? 'bg-primary dark:bg-iris brightness-110 dark:brightness-125 border border-black/10 dark:border-white/10 shadow-sm'
                            : 'bg-card dark:bg-card border-2 border-muted dark:border-muted-foreground/50'
                        }`}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-medium text-foreground">{step.label}</p>
                    <p className="text-foreground">{stepDate ? format(stepDate, "MMMM d, yyyy") : 'TBD'}</p>
                    {/* 9.3 — Use module-level LOCAL_TZ instead of creating Intl object per step */}
                    <p className="text-xs text-muted-foreground">Timezone: {step.timezone || LOCAL_TZ}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}

          {/* Today marker */}
          {progressPx > 0 && progressPx < barWidth ? (
            <div
              className="absolute"
              style={{ left: `${progressPx}px`, top: "50%", transform: "translate(-50%, -50%)", zIndex: 3 }}
            >
              <div className="w-3 h-3 bg-card dark:bg-card rounded-full border-2 border-primary dark:border-iris shadow-sm" />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default DeadlineProgress;