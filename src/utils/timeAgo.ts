const MS_IN_MINUTE = 60_000;
const MINUTES_IN_HOUR = 60;
const HOURS_IN_DAY = 24;
const DAYS_IN_WEEK = 7;
const DAYS_IN_MONTH = 30;
const DAYS_IN_YEAR = 365;

const MAX_WEEKS = 3;
const MAX_MONTHS = 11;

function pluralize(value: number, unit: string): string {
  return `${value} ${unit}${value === 1 ? '' : 's'} ago`;
}

/**
 * Human-readable relative time for an ISO 8601 date.
 *
 *   < 1 min   → "just now"        1–6 days   → "1 day ago" … "6 days ago"
 *   1–59 min  → "1 min ago" …     1–3 weeks  → "1 week ago" … "3 weeks ago"
 *   1–23 hrs  → "1 hour ago" …    1–11 mon   → "1 month ago" … "11 months ago"
 *                                 ≥ 1 year   → "1 year ago" …
 *
 * Invalid dates return an empty string; dates in the future count as "just now".
 * `now` is injectable so the function stays pure and easy to test.
 */
export function formatTimeAgo(isoDate: string, now: Date = new Date()): string {
  const timestamp = Date.parse(isoDate);

  if (Number.isNaN(timestamp)) {
    return '';
  }

  const minutes = Math.floor(Math.max(0, now.getTime() - timestamp) / MS_IN_MINUTE);

  if (minutes < 1) {
    return 'just now';
  }

  if (minutes < MINUTES_IN_HOUR) {
    return `${minutes} min ago`;
  }

  const hours = Math.floor(minutes / MINUTES_IN_HOUR);

  if (hours < HOURS_IN_DAY) {
    return pluralize(hours, 'hour');
  }

  const days = Math.floor(hours / HOURS_IN_DAY);

  if (days < DAYS_IN_WEEK) {
    return pluralize(days, 'day');
  }

  if (days < DAYS_IN_MONTH) {
    return pluralize(Math.min(MAX_WEEKS, Math.floor(days / DAYS_IN_WEEK)), 'week');
  }

  if (days < DAYS_IN_YEAR) {
    return pluralize(Math.min(MAX_MONTHS, Math.floor(days / DAYS_IN_MONTH)), 'month');
  }

  return pluralize(Math.floor(days / DAYS_IN_YEAR), 'year');
}
