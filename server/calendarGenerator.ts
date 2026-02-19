import { Conference, Deadline } from '../src/types/conference';
import { format, isValid } from 'date-fns';

/**
 * Format a date for iCalendar format (RFC 5545)
 */
export function formatICalDate(date: Date): string {
  if (!isValid(date)) {
    return '';
  }
  return format(date, "yyyyMMdd'T'HHmmss'Z'");
}

/**
 * Parse date string to Date object (handles various formats)
 */
function parseDeadlineDate(dateString: string, timezone?: string): Date | null {
  if (!dateString || dateString === 'TBD') {
    return null;
  }

  try {
    // Try to parse ISO format first
    const date = new Date(dateString);
    if (isValid(date)) {
      return date;
    }
  } catch (error) {
    // Continue to fallback
  }

  return null;
}

/**
 * Escape special characters in iCalendar text fields
 */
export function escapeICalText(text: string): string {
  if (!text) return '';
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
 * Get all deadlines from a conference (supporting both new and legacy formats)
 */
function getConferenceDeadlines(conference: Conference): Array<{ label: string; date: string; type: string }> {
  const deadlines: Array<{ label: string; date: string; type: string }> = [];

  // New format deadlines take priority
  if (conference.deadlines && Array.isArray(conference.deadlines)) {
    conference.deadlines.forEach((deadline: Deadline) => {
      deadlines.push({
        label: deadline.label,
        date: deadline.date,
        type: deadline.type,
      });
    });
  }

  // Add legacy deadlines if not already present
  const existingTypes = new Set(deadlines.map(d => d.type));

  if (conference.abstract_deadline && !existingTypes.has('abstract')) {
    deadlines.push({
      label: 'Abstract Submission',
      date: conference.abstract_deadline,
      type: 'abstract',
    });
  }

  if (conference.deadline && !existingTypes.has('submission')) {
    deadlines.push({
      label: 'Paper Submission',
      date: conference.deadline,
      type: 'submission',
    });
  }

  return deadlines;
}

/**
 * Generate an iCalendar VEVENT for a single deadline
 */
export function generateVEvent(
  conference: Conference,
  deadline: { label: string; date: string; type: string }
): string | null {
  const deadlineDate = parseDeadlineDate(deadline.date, conference.timezone);

  if (!deadlineDate) {
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
  const deadlines = getConferenceDeadlines(conference);
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
