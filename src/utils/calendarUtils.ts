import { Conference, Deadline } from "@/types/conference";
import { format, isValid } from "date-fns";
import { getDeadlineInLocalTime } from './dateUtils';
import { getAllDeadlines } from './deadlineUtils';
import { getApiBaseUrl } from './apiClient';

/**
 * Format a date for iCalendar format (RFC 5545)
 */
export function formatICalDate(date: Date): string {
  return format(date, "yyyyMMdd'T'HHmmss'Z'");
}

/**
 * Escape special characters in iCalendar text fields
 */
export function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

/**
 * Generate a unique identifier for an iCalendar event
 */
export function generateEventUid(conferenceId: string, deadlineType: string): string {
  return `${conferenceId}-${deadlineType}@ai-deadlines.com`;
}

/**
 * Generate an iCalendar VEVENT for a single deadline
 */
export function generateVEvent(
  conference: Conference,
  deadline: Deadline
): string | null {
  const deadlineDate = getDeadlineInLocalTime(
    deadline.date,
    deadline.timezone || conference.timezone
  );

  if (!deadlineDate || !isValid(deadlineDate)) {
    return null;
  }

  const endDate = new Date(deadlineDate.getTime() + 60 * 60 * 1000); // 1 hour after deadline
  const uid = generateEventUid(conference.id, deadline.type);
  const now = formatICalDate(new Date());

  const location = conference.venue ||
    [conference.city, conference.country].filter(Boolean).join(', ') ||
    'TBD';

  const summary = escapeICalText(`${conference.title} - ${deadline.label}`);
  const description = escapeICalText(
    `${deadline.label} for ${conference.full_name || conference.title}\n` +
    `Event: ${conference.date}\n` +
    `Location: ${location}\n` +
    `${conference.link ? `Website: ${conference.link}` : ''}`
  );

  return `BEGIN:VEVENT
UID:${uid}
DTSTAMP:${now}
DTSTART:${formatICalDate(deadlineDate)}
DTEND:${formatICalDate(endDate)}
SUMMARY:${summary}
DESCRIPTION:${description}
LOCATION:${escapeICalText(location)}
URL:${conference.link || ''}
END:VEVENT`;
}

/**
 * Generate a complete iCalendar feed for a conference
 */
export function generateICalendarFeed(conference: Conference): string {
  const deadlines = getAllDeadlines(conference);
  const events = deadlines
    .map(deadline => generateVEvent(conference, deadline))
    .filter(Boolean)
    .join('\n');

  const calendarName = escapeICalText(`${conference.title} ${conference.year}`);

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//AI Deadlines//ai-deadlines.com//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:${calendarName}
X-WR-TIMEZONE:UTC
X-WR-CALDESC:Conference deadlines for ${conference.title}
REFRESH-INTERVAL;VALUE=DURATION:PT1H
${events}
END:VCALENDAR`;
}

/**
 * Get calendar subscription URL for a conference
 * Works across development and production environments with any domain
 */
export function getCalendarSubscriptionUrl(conferenceId: string): string {
  const apiBaseUrl = getApiBaseUrl();
  return `${apiBaseUrl}/api/calendar/${conferenceId}.ics`;
}

/**
 * Get calendar subscription link for different calendar providers
 */
export function getCalendarSubscriptionLink(
  conferenceId: string,
  calendarType: 'google' | 'apple' | 'outlook'
): string {
  const icsUrl = getCalendarSubscriptionUrl(conferenceId);

  switch (calendarType) {
    case 'google':
      return `https://www.google.com/calendar/render?cid=${encodeURIComponent(icsUrl)}`;
    case 'apple':
      return `webcal://${icsUrl.replace(/^https?:\/\//, '')}`;
    case 'outlook':
      return `https://outlook.live.com/calendar/0/addevent?rru=addevent&url=${encodeURIComponent(icsUrl)}`;
    default:
      return icsUrl;
  }
}
