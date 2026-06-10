import { CalendarDays, ChartNoAxesColumn, Globe, Tag, Clock, AlarmClock } from "lucide-react";
import { Conference } from "@/types/conference";
import { formatDistanceToNow, isValid, isPast } from "date-fns";
import { useMemo, useCallback, memo } from "react";
import { getDeadlineInLocalTime } from '@/utils/dateUtils';
import DeadlineProgress from './DeadlineProgress';
import { getNextUpcomingDeadline, getPrimaryDeadline, getAllDeadlines, getCountdownColorClass, getDaysRemaining, formatDeadlineDate } from "@/utils/deadlineUtils";
import { CATEGORY_LABELS, RANK_COLORS, DEFAULT_RANK_COLOR, UNRANKED_BADGE_COLOR } from "@/utils/constants";

const getRankBadgeStyles = (rankName: string | undefined) => {
  if (!rankName) return UNRANKED_BADGE_COLOR;
  return RANK_COLORS.get(rankName.toUpperCase()) || DEFAULT_RANK_COLOR;
};

const getTimeRemaining = (deadlineDate: Date | null) => {
  if (!deadlineDate || !isValid(deadlineDate)) {
    return 'TBD';
  }

  if (isPast(deadlineDate)) {
    return 'Deadline passed';
  }

  try {
    return formatDistanceToNow(deadlineDate, { addSuffix: true });
  } catch (error) {
    console.error('Error formatting time remaining:', error);
    return 'Invalid date';
  }
};

interface ConferenceCardProps extends Conference {
  onTagClick?: (tag: string) => void;
  onClick?: (conf: Conference) => void;
}

const ConferenceCard = memo((props: ConferenceCardProps) => {
  const {
    title,
    year,
    date,
    deadline,
    timezone,
    tags = [],
    link,
    rankings,
    format,
    onClick,
  } = props;

  // Memoize ALL expensive deadline/date computations under stable primitive deps.
  // Without this, getNextUpcomingDeadline (O(N log N) sort) and date parsing
  // run on every render even though memo() is wrapping this component.
  const { nextDeadline, timeRemaining, location, countdownColorClass, hasActiveDeadline } = useMemo(() => {
    const nextDeadline = getNextUpcomingDeadline(props) || getPrimaryDeadline(props);
    const deadlineDate = nextDeadline
      ? getDeadlineInLocalTime(nextDeadline.date, nextDeadline.timezone || props.timezone)
      : null;
    const timeRemaining = getTimeRemaining(deadlineDate);
    return {
      nextDeadline,
      timeRemaining,
      // Derived from already-computed timeRemaining — zero extra function calls
      hasActiveDeadline: timeRemaining !== 'TBD' && timeRemaining !== 'Deadline passed' && timeRemaining !== 'Invalid date',
      location: [props.city, props.country].filter(Boolean).join(", "),
      countdownColorClass: getCountdownColorClass(
        nextDeadline ? getDaysRemaining(nextDeadline, props.timezone) : null
      ),
    };
  }, [props.id, props.deadline, props.abstract_deadline, props.deadlines, props.timezone, props.city, props.country]);

  // Memoize steps array for DeadlineProgress under the same stable primitive deps.
  const deadlineSteps = useMemo(() => {
    return getAllDeadlines(props).map(d => ({
      label: d.label,
      date: d.date,
      timezone: d.timezone || props.timezone
    }));
  }, [props.id, props.deadline, props.abstract_deadline, props.deadlines, props.timezone]);

  // useCallback prevents a new function reference on every render; the deps
  // are stable (onClick from VirtualConferenceGrid is itself useCallback-stable).
  const handleCardClick = useCallback((e: React.MouseEvent) => {
    if (!(e.target as HTMLElement).closest('a') &&
      !(e.target as HTMLElement).closest('.tag-button')) {
      onClick?.(props);
    }
  }, [onClick, props]);

  const handleTagClick = (e: React.MouseEvent, tag: string) => {
    e.stopPropagation();

    if (props.onTagClick) {
      props.onTagClick(tag);
    }
  };

  return (
    <>
      <div
        className="bg-card dark:bg-card rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 flex flex-col cursor-pointer"
        onClick={handleCardClick}
      >
        <div className="flex justify-between items-start mb-2">
          <h3 className={`text-lg font-semibold ${getRankBadgeStyles(rankings?.rank_name)}`}>
            {title} {year}
          </h3>
          {link ? (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              <Globe className="h-4 w-4 mr-2 flex-shrink-0" />
            </a>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center text-muted-foreground">
            <CalendarDays className="h-4 w-4 mr-2 flex-shrink-0" />
            <span className="text-sm truncate">{date}</span>
          </div>
          {location ? (
            <div className="flex items-center text-muted-foreground">
              <Globe className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="text-sm truncate">{location} <span className={`font-semibold`}>({format})</span></span>
            </div>
          ) : null}
          {rankings ? (
            <div className="flex items-center text-muted-foreground">
              <ChartNoAxesColumn className="h-4 w-4 mr-2 flex-shrink-0" />
              <div className="flex items-center gap-2">
                <a
                  href={rankings.rank_source_url}
                  className={`text-sm py-0.5 font-medium ${getRankBadgeStyles(rankings?.rank_name)} hover:underline`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                >
                  {rankings.rank_name} ({rankings.rank_source})
                </a>
              </div>
            </div>
          ) : null}
          {hasActiveDeadline ? (
            <>
              <div className="flex items-center text-muted-foreground">
                <Clock className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="text-sm truncate">
                  {nextDeadline ? `${nextDeadline.label}: ${formatDeadlineDate(nextDeadline.date, nextDeadline.timezone || timezone, false)}` : (deadline === 'TBD' ? 'TBD' : `${formatDeadlineDate(deadline, timezone, false)}`)}
                </span>
              </div>
              <div className="flex items-center">
                <AlarmClock className={`h-4 w-4 mr-2 flex-shrink-0 ${countdownColorClass}`} />
                <span className={`text-sm font-medium truncate ${countdownColorClass}`}>
                  {timeRemaining}
                </span>
              </div>
            </>
          ) : null}
        </div>

        <DeadlineProgress steps={deadlineSteps} />

        {Array.isArray(tags) && tags.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <button
                key={tag}
                className="tag tag-button"
                onClick={(e) => handleTagClick(e, tag)}
              >
                <Tag className="h-3 w-3 mr-1" />
                {CATEGORY_LABELS.get(tag) || tag}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </>
  );
});

export default ConferenceCard;
