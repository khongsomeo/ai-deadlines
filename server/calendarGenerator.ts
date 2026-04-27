import { Conference, Deadline } from '../src/types/conference';
import { format, isValid, parseISO } from 'date-fns';
import { zonedTimeToUtc } from 'date-fns-tz';

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
 * Format a date for iCalendar all-day event format (RFC 5545)
 * All-day events use VALUE=DATE format: YYYYMMDD
 */
export function formatICalAllDayDate(date: Date | string): string {
  try {
    const parsedDate = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(parsedDate)) {
      return '';
    }
    return format(parsedDate, 'yyyyMMdd');
  } catch {
    return '';
  }
}

/**
 * Normalize timezone string to a standard format
 */
function normalizeTimezone(tz: string | undefined): string {
  if (!tz) return 'UTC';
  if (tz === 'AoE') return 'UTC-12';
  
  // Handle GMT±XX format - convert to UTC±XX
  const gmtMatch = tz.match(/^GMT([+-])(\d+)$/);
  if (gmtMatch) {
    const [, sign, hours] = gmtMatch;
    return `UTC${sign}${hours}`;
  }

  // If it's already UTC±XX format, keep it
  if (tz.match(/^UTC[+-]\d+$/)) {
    return tz;
  }

  // Handle UTC+0, UTC-0 formats
  if (tz === 'UTC+0' || tz === 'UTC-0' || tz === 'UTC+00' || tz === 'UTC-00') {
    return 'UTC';
  }

  return tz;
}

/**
 * Parse date string to Date object and convert from specified timezone to UTC
 * Handles various formats and numeric UTC offsets (matches client-side getDeadlineInUTC)
 */
function parseDeadlineDate(dateString: string, timezone?: string): Date | null {
  if (!dateString || dateString === 'TBD') {
    return null;
  }

  try {
    const parsedDate = parseISO(dateString);
    if (!isValid(parsedDate)) {
      console.error('Invalid date parsed from deadline:', dateString);
      return null;
    }

    // If no timezone specified, assume UTC
    if (!timezone) {
      return parsedDate;
    }

    const normalizedTz = normalizeTimezone(timezone);

    // Handle numeric UTC offsets (e.g., "UTC-12", "UTC+5:30")
    const numericOffsetMatch = normalizedTz.match(/^UTC([+-])(\d{1,2})(?::(\d{2}))?$/);
    if (numericOffsetMatch) {
      const [, sign, hours, minutes] = numericOffsetMatch;
      const offsetHours = parseInt(hours, 10);
      const offsetMinutes = parseInt(minutes || '0', 10);
      
      // Calculate total offset in minutes
      let totalOffsetMinutes = offsetHours * 60 + offsetMinutes;
      if (sign === '-') {
        totalOffsetMinutes = -totalOffsetMinutes;
      }
      
      // Convert from timezone to UTC by subtracting the offset
      // E.g., if timezone is UTC-12 (offset = -12 hours), we add 12 hours to get UTC
      // E.g., if timezone is UTC+5 (offset = +5 hours), we subtract 5 hours to get UTC
      const utcDate = new Date(parsedDate.getTime() - totalOffsetMinutes * 60 * 1000);
      return utcDate;
    }

    // For IANA timezone names, use zonedTimeToUtc
    try {
      const utcDate = zonedTimeToUtc(parsedDate, normalizedTz);
      return utcDate;
    } catch (tzError) {
      console.warn(`Failed to parse timezone "${normalizedTz}" as IANA timezone, treating as UTC:`, tzError);
      return parsedDate;
    }
  } catch (error) {
    console.error(`Failed to parse deadline date "${dateString}" with timezone "${timezone}":`, error);
    return null;
  }
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
  return `${conferenceId}-${deadlineType}@trhgquan.xyz`;
}

/**
 * Get all deadlines from a conference (supporting both new and legacy formats)
 */
function getConferenceDeadlines(conference: Conference): Array<{ label: string; date: string; type: string; timezone?: string }> {
  const deadlines: Array<{ label: string; date: string; type: string; timezone?: string }> = [];

  // New format deadlines take priority
  if (conference.deadlines && Array.isArray(conference.deadlines)) {
    conference.deadlines.forEach((deadline: Deadline) => {
      deadlines.push({
        label: deadline.label,
        date: deadline.date,
        type: deadline.type,
        timezone: deadline.timezone,
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
  deadline: { label: string; date: string; type: string; timezone?: string }
): string | null {
  // Use deadline's timezone first, fall back to conference timezone
  const deadlineDate = parseDeadlineDate(deadline.date, deadline.timezone || conference.timezone);

  if (!deadlineDate) {
    return null;
  }

  const endDate = new Date(deadlineDate.getTime() + 60 * 60 * 1000); // 1 hour after deadline
  const uid = generateEventUid(conference.id, deadline.type);
  const now = formatICalDate(new Date());

  const venue = conference.venue || '';
  const cityCountry = [conference.city, conference.country].filter(Boolean).join(', ') || 'TBD';
  const location = venue || cityCountry;

  const summary = escapeICalText(`${conference.title} - ${deadline.label}`);
  const tags = conference.tags ? `Category: ${conference.tags.join(", ")}`.trim() : '';
  const rankingInfo = conference.rankings 
    ? `Rankings: ${conference.rankings.rank_name || ''} (${conference.rankings.rank_source || ''})`.trim()
    : '';
  const description = escapeICalText(
    `${deadline.label} for ${conference.full_name || conference.title}\n` +
    `🗓️ Event Dates: ${conference.date}\n` +
    `📍 Location: ${cityCountry}\n` +
    `⏰ Deadline (${deadline.timezone || conference.timezone}): ${deadline.date}\n` +
    (rankingInfo ? `📈 ${rankingInfo}\n` : '') +
    (tags ? `🏷️ ${tags}\n` : '') +
    (conference.link ? `🌐 Website: ${conference.link}` : '')
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
 * Generate an iCalendar VEVENT for an all-day conference event
 */
export function generateAllDayConferenceVEvent(conference: Conference): string | null {
  // Need both start and end dates for an all-day event
  if (!conference.start || !conference.end) {
    return null;
  }

  try {
    // Handle both Date objects and string dates (YAML loader may convert to Date automatically)
    let startDateObj: Date | null = null;
    let endDateObj: Date | null = null;

    // Try to parse as string first, otherwise treat as Date
    if (typeof conference.start === 'string') {
      startDateObj = parseISO(conference.start);
    } else {
      // Assume it's already a Date object
      startDateObj = new Date(conference.start as any);
    }

    if (typeof conference.end === 'string') {
      endDateObj = parseISO(conference.end);
    } else {
      // Assume it's already a Date object
      endDateObj = new Date(conference.end as any);
    }

    if (!startDateObj || !isValid(startDateObj) || !endDateObj || !isValid(endDateObj)) {
      return null;
    }

    const startDate = formatICalAllDayDate(startDateObj);
    
    // For all-day events, DTEND is exclusive, so we add 1 day
    const endDateExclusive = new Date(endDateObj.getTime() + 24 * 60 * 60 * 1000);
    const endDate = formatICalAllDayDate(endDateExclusive);

    if (!startDate || !endDate) {
      return null;
    }

    const uid = generateEventUid(conference.id, 'conference');
    const now = formatICalDate(new Date());

    const venue = conference.venue || '';
    const cityCountry = [conference.city, conference.country].filter(Boolean).join(', ') || 'TBD';
    const location = venue || cityCountry;

    const summary = escapeICalText(`${conference.title} ${conference.year} - Conference Date`);
    const tags = conference.tags ? `Category: ${conference.tags.join(", ")}`.trim() : '';
    const rankingInfo = conference.rankings 
      ? `Rankings: ${conference.rankings.rank_name || ''} (${conference.rankings.rank_source || ''})`.trim()
      : '';
    const description = escapeICalText(
      `${conference.full_name || conference.title}\n` +
      `📍 Location: ${cityCountry}\n` +
      (rankingInfo ? `📈 ${rankingInfo}\n` : '') +
      (tags ? `🏷️ ${tags}\n` : '') +
      (conference.link ? `🌐 Website: ${conference.link}` : '')
    );

    return `BEGIN:VEVENT
UID:${uid}
DTSTAMP:${now}
DTSTART;VALUE=DATE:${startDate}
DTEND;VALUE=DATE:${endDate}
SUMMARY:${summary}
DESCRIPTION:${description}
LOCATION:${escapeICalText(location)}
URL:${conference.link || ''}
END:VEVENT`;
  } catch (error) {
    console.error(`Failed to generate all-day conference event for "${conference.title}":`, error);
    return null;
  }
}

/**
 * Generate a complete iCalendar feed for a conference
 */
export function generateICalendarFeed(conference: Conference): string {
  const deadlines = getConferenceDeadlines(conference);
  const deadlineEvents = deadlines
    .map(deadline => generateVEvent(conference, deadline))
    .filter(Boolean);
  
  // Add the all-day conference event
  const conferenceEvent = generateAllDayConferenceVEvent(conference);
  if (conferenceEvent) {
    deadlineEvents.unshift(conferenceEvent);
  }
  
  const events = deadlineEvents.join('\n');

  const calendarName = escapeICalText(`${conference.title} ${conference.year}`);

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//AI Deadlines//ai-deadlines.trhgquan.xyz//EN
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
 * Generate a complete iCalendar feed for all conferences with upcoming deadlines
 */
export function generateAllConferencesCalendarFeed(conferences: Conference[]): string {
  const now = new Date();
  const allEvents: string[] = [];
  const eventUids = new Set<string>(); // Track UIDs to prevent duplicates

  // Collect all deadlines and conference events from all conferences
  conferences.forEach(conference => {
    // Add all-day conference event
    const conferenceEvent = generateAllDayConferenceVEvent(conference);
    if (conferenceEvent) {
      const uid = generateEventUid(conference.id, 'conference');
      if (!eventUids.has(uid)) {
        allEvents.push(conferenceEvent);
        eventUids.add(uid);
      }
    }

    // Add deadline events
    const deadlines = getConferenceDeadlines(conference);

    deadlines.forEach(deadline => {
      // Use deadline's timezone first, fall back to conference timezone
      const deadlineDate = parseDeadlineDate(deadline.date, deadline.timezone || conference.timezone);

      // Only include future deadlines (allow events happening now)
      if (deadlineDate && deadlineDate >= now) {
        const event = generateVEvent(conference, deadline);
        if (event) {
          const uid = generateEventUid(conference.id, deadline.type);
          // Avoid duplicate events
          if (!eventUids.has(uid)) {
            allEvents.push(event);
            eventUids.add(uid);
          }
        }
      }
    });
  });

  // Sort events by date (handle both VALUE=DATE and VALUE=DATE-TIME formats)
  allEvents.sort((a, b) => {
    // Try to extract DATE-TIME format first (DTSTART:20270405T000000Z)
    let aMatch = a.match(/DTSTART:(\d{8}T\d{6}Z)/);
    let bMatch = b.match(/DTSTART:(\d{8}T\d{6}Z)/);
    
    // If not found, try DATE format (DTSTART;VALUE=DATE:20270405)
    if (!aMatch) {
      aMatch = a.match(/DTSTART;VALUE=DATE:(\d{8})/);
    }
    if (!bMatch) {
      bMatch = b.match(/DTSTART;VALUE=DATE:(\d{8})/);
    }
    
    if (!aMatch || !bMatch) return 0;
    return aMatch[1].localeCompare(bMatch[1]);
  });

  const calendarName = escapeICalText('AI Deadlines - All Conferences');

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//AI Deadlines//ai-deadlines.trhgquan.xyz//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:${calendarName}
X-WR-TIMEZONE:UTC
X-WR-CALDESC:All upcoming conference deadlines
REFRESH-INTERVAL;VALUE=DURATION:PT1H
${allEvents.join('\n')}
END:VCALENDAR`;
}
