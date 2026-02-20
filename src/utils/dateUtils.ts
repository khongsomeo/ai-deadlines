import { parseISO, isValid } from 'date-fns';
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz';

/**
 * Convert a deadline string from its specified timezone to UTC Date
 * Used for iCalendar events which require UTC times
 */
export const getDeadlineInUTC = (deadline: string | undefined, timezone: string | undefined): Date | null => {
  if (!deadline || deadline === 'TBD') {
    return null;
  }

  try {
    const parsedDate = parseISO(deadline);
    if (!isValid(parsedDate)) {
      console.error('Invalid date parsed from deadline:', deadline);
      return null;
    }

    // If no timezone specified, assume UTC
    if (!timezone) {
      return parsedDate;
    }

    // Normalize the timezone string
    const normalizeTimezone = (tz: string | undefined): string => {
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
    };

    const normalizedTz = normalizeTimezone(timezone);

    // Handle numeric UTC offsets (e.g., "UTC-12", "UTC+5")
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
    console.error('Error processing deadline:', error);
    return null;
  }
};

export const getDeadlineInLocalTime = (deadline: string | undefined, timezone: string | undefined): Date | null => {
  if (!deadline || deadline === 'TBD') {
    return null;
  }

  try {
    // Parse the deadline string to a Date object
    const parsedDate = parseISO(deadline);

    if (!isValid(parsedDate)) {
      console.error('Invalid date parsed from deadline:', deadline);
      return null;
    }

    // Handle timezone normalization
    const normalizeTimezone = (tz: string | undefined): string => {
      if (!tz) return 'UTC';

      // Handle AoE (Anywhere on Earth) timezone
      if (tz === 'AoE') return '-12:00';

      // Handle GMT±XX format
      const gmtMatch = tz.match(/^GMT([+-])(\d+)$/);
      if (gmtMatch) {
        const [, sign, hours] = gmtMatch;
        const paddedHours = hours.padStart(2, '0');
        return `${sign}${paddedHours}:00`;
      }

      // If it's already an IANA timezone, return as is
      if (!tz.toUpperCase().startsWith('UTC') && !tz.toUpperCase().startsWith('GMT')) return tz;

      // Convert UTC±XX to proper format
      const utcMatch = tz.match(/^UTC([+-])(\d+)$/);
      if (utcMatch) {
        const [, sign, hours] = utcMatch;
        const paddedHours = hours.padStart(2, '0');
        return `${sign}${paddedHours}:00`;
      }

      // Handle special case of UTC+0/UTC-0
      if (tz === 'UTC+0' || tz === 'UTC-0' || tz === 'UTC+00' || tz === 'UTC-00') {
        return 'UTC';
      }

      return 'UTC';
    };

    const normalizedTimezone = normalizeTimezone(timezone);

    try {
      // Get user's local timezone
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      // We need to:
      // 1. Treat the parsed date as being in the conference's timezone
      // 2. Convert it to UTC
      // 3. Then convert to the user's local timezone

      // Convert from conference timezone to UTC
      const utcDate = zonedTimeToUtc(parsedDate, normalizedTimezone);

      // Convert from UTC to user's local timezone
      const localDate = utcToZonedTime(utcDate, userTimezone);

      return isValid(localDate) ? localDate : null;
    } catch (error) {
      console.error('Timezone conversion error:', error);
      return parsedDate; // Fall back to the parsed date if conversion fails
    }
  } catch (error) {
    console.error('Error processing deadline:', error);
    return null;
  }
}; 