import { CalendarDays, ChartNoAxesColumn, Globe, Tag, Clock, AlarmClock } from "lucide-react";
import { Conference } from "@/types/conference";
import { formatDistanceToNow, isValid, isPast } from "date-fns";
import ConferenceDialog from "./ConferenceDialog";
import { useState, useMemo } from "react";
import { getDeadlineInLocalTime } from '@/utils/dateUtils';
import DeadlineProgress from './DeadlineProgress';
import { getNextUpcomingDeadline, getPrimaryDeadline, getAllDeadlines, getCountdownColorClass, getDaysRemaining, formatDeadlineDate } from "@/utils/deadlineUtils";

const ConferenceCard = (props: Conference) => {
  const {
    title,
    full_name,
    year,
    date,
    deadline,
    timezone,
    tags = [],
    link,
    note,
    abstract_deadline,
    rankings,
    city,
    country,
    venue,
    format,
  } = props;
  const [dialogOpen, setDialogOpen] = useState(false);

  // Use props directly to avoid recreating the object on every render
  const conference = props;
  const nextDeadline = getNextUpcomingDeadline(conference) || getPrimaryDeadline(conference);
  const deadlineDate = nextDeadline ? getDeadlineInLocalTime(nextDeadline.date, nextDeadline.timezone || timezone) : null;

  // Memoize steps array for DeadlineProgress.
  // Use stable primitive deps instead of [conference] (which is `props` — a
  // new object reference on every parent render, making useMemo a no-op).
  const deadlineSteps = useMemo(() => {
    return getAllDeadlines(props).map(d => ({
      label: d.label,
      date: d.date,
      timezone: d.timezone || props.timezone
    }));
  }, [props.id, props.deadline, props.abstract_deadline, props.deadlines, props.timezone]);

  // Add validation before using formatDistanceToNow
  const getTimeRemaining = () => {
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

  const timeRemaining = getTimeRemaining();

  // Create location string by concatenating city and country
  const location = [city, country].filter(Boolean).join(", ");

  // Determine countdown color based on days remaining
  const countdownColorClass = getCountdownColorClass(nextDeadline ? getDaysRemaining(nextDeadline, timezone) : null);

  const handleCardClick = (e: React.MouseEvent) => {
    if (!(e.target as HTMLElement).closest('a') &&
      !(e.target as HTMLElement).closest('.tag-button')) {
      setDialogOpen(true);
    }
  };

  const handleTagClick = (e: React.MouseEvent, tag: string) => {
    e.stopPropagation();

    // Create a custom event with the selected tag
    const event = new CustomEvent('filterByTag', {
      detail: { tag }
    });
    window.dispatchEvent(event);
  };

  // Add this function inside ConferenceCard component, before the render return
  const getRankBadgeStyles = () => {
    if (!rankings?.rank_name) return "text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800";

    switch (rankings.rank_name.toUpperCase()) {
      case "A*":
        return "text-red-600 dark:text-red-400";
      case "A":
        return "text-orange-600 dark:text-orange-400";
      case "B":
        return "text-blue-600 dark:text-blue-400";
      case "C":
        return "text-green-600 dark:text-green-400";
      default:
        return "text-gray-600 dark:text-gray-400";
    }
  };

  return (
    <>
      <div
        className="bg-card dark:bg-card rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 flex flex-col cursor-pointer"
        onClick={handleCardClick}
      >
        <div className="flex justify-between items-start mb-2">
          <h3 className={`text-lg font-semibold ${getRankBadgeStyles()}`}>
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

        <div className="flex flex-col gap-2 mb-6">
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
                  className={`text-sm py-0.5 font-medium ${getRankBadgeStyles()} hover:underline`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                >
                  {rankings.rank_name} ({rankings.rank_source})
                </a>
              </div>
            </div>
          ) : null}
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
        </div>

        <div className="mt-4">
          <DeadlineProgress steps={deadlineSteps} />
        </div>

        {Array.isArray(tags) && tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <button
                key={tag}
                className="tag tag-button"
                onClick={(e) => handleTagClick(e, tag)}
              >
                <Tag className="h-3 w-3 mr-1" />
                {tag}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <ConferenceDialog
        conference={conference}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
};

export default ConferenceCard;
