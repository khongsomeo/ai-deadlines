import { CalendarDays, ChartNoAxesColumn, Globe, Tag, Clock, AlarmClock } from "lucide-react";
import { Conference } from "@/types/conference";
import { formatDistanceToNow, isValid, isPast } from "date-fns";
import ConferenceDialog from "./ConferenceDialog";
import { useState } from "react";
import { getDeadlineInLocalTime } from '@/utils/dateUtils';
import DeadlineProgress from './DeadlineProgress';
import { getNextUpcomingDeadline, getPrimaryDeadline, getAllDeadlines, getCountdownColorClass, getDaysRemaining, formatDeadlineDate } from "@/utils/deadlineUtils";

const ConferenceCard = ({
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
  ...conferenceProps
}: Conference) => {
  const [dialogOpen, setDialogOpen] = useState(false);

  // Get the next upcoming deadline or primary deadline for dialog
  const conference = {
    title, full_name, year, date, deadline, timezone, tags, link, note,
    abstract_deadline, city, country, venue, ...conferenceProps
  };
  const nextDeadline = getNextUpcomingDeadline(conference) || getPrimaryDeadline(conference);
  const deadlineDate = nextDeadline ? getDeadlineInLocalTime(nextDeadline.date, nextDeadline.timezone || timezone) : null;

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
  const countdownColorClass = getCountdownColorClass(getDaysRemaining(nextDeadline, timezone));

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
    if (!rankings?.rank_name) return "text-gray-600 bg-gray-100";

    switch (rankings.rank_name.toUpperCase()) {
      case "A*":
        return "text-red-600";
      case "A":
        return "text-orange-600";
      case "B":
        return "text-blue-600";
      case "C":
        return "text-green-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <>
      <div
        className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 flex flex-col cursor-pointer"
        onClick={handleCardClick}
      >
        <div className="flex justify-between items-start mb-2">
          <h3 className={`text-lg font-semibold ${getRankBadgeStyles()}`}>
            {title} {year}
          </h3>
          {link && (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              <Globe className="h-4 w-4 mr-2 flex-shrink-0" />
            </a>
          )}
        </div>

        <div className="flex flex-col gap-2 mb-6">
          <div className="flex items-center text-neutral">
            <CalendarDays className="h-4 w-4 mr-2 flex-shrink-0" />
            <span className="text-sm truncate">{date}</span>
          </div>
          {location && (
            <div className="flex items-center text-neutral">
              <Globe className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="text-sm truncate">{location} <span className={`font-semibold`}>({format})</span></span>
            </div>
          )}
          {rankings && (
            <div className="flex items-center text-neutral">
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
          )}
          <div className="flex items-center text-neutral">
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

        <DeadlineProgress
          steps={getAllDeadlines(conference).map(deadline => ({
            label: deadline.label,
            date: deadline.date,
            timezone: deadline.timezone || conference.timezone
          }))}
        />

        {Array.isArray(tags) && tags.length > 0 && (
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
        )}
      </div>

      <ConferenceDialog
        conference={{
          title,
          full_name,
          year,
          date,
          deadline,
          timezone,
          tags,
          link,
          note,
          abstract_deadline,
          city,
          country,
          venue,
          ...conferenceProps
        }}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
};

export default ConferenceCard;
