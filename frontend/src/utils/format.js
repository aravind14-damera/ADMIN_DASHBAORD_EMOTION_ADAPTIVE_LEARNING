/**
 * Shared formatting utilities for UI display.
 * These helpers are intentionally pure and safe for frontend rendering.
 */

/**
 * Format a date-like value into a readable string.
 * @param {string|number|Date|null|undefined} value
 * @param {Intl.DateTimeFormatOptions} [options]
 * @param {string} [locale]
 * @returns {string}
 */
export const formatDate = (
  value,
  options = { year: "numeric", month: "short", day: "numeric" },
  locale = "en-US",
) => {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(locale, options).format(date);
};

/**
 * Format a date-like value with time.
 * @param {string|number|Date|null|undefined} value
 * @param {string} [locale]
 * @returns {string}
 */
export const formatDateTime = (value, locale = "en-US") =>
  formatDate(
    value,
    {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
    locale,
  );

/**
 * Format numeric duration (in minutes) into a human-readable label.
 * Examples:
 *  - 45 => "45m"
 *  - 75 => "1h 15m"
 *  - 0 => "0m"
 *
 * @param {number|string|null|undefined} minutes
 * @returns {string}
 */
export const formatDurationMinutes = (minutes) => {
  const total = Number(minutes);
  if (!Number.isFinite(total) || total < 0) return "0m";

  const whole = Math.floor(total);
  const hrs = Math.floor(whole / 60);
  const mins = whole % 60;

  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
};

/**
 * Format numeric duration (in seconds) into a human-readable label.
 * @param {number|string|null|undefined} seconds
 * @returns {string}
 */
export const formatDurationSeconds = (seconds) => {
  const total = Number(seconds);
  if (!Number.isFinite(total) || total < 0) return "0s";

  const whole = Math.floor(total);
  const hrs = Math.floor(whole / 3600);
  const mins = Math.floor((whole % 3600) / 60);
  const secs = whole % 60;

  if (hrs > 0) return `${hrs}h ${mins}m`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
};

/**
 * Format numeric value as percentage.
 * @param {number|string|null|undefined} value
 * @param {number} [fractionDigits=0]
 * @returns {string}
 */
export const formatPercent = (value, fractionDigits = 0) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return "0%";

  const safe = Math.min(100, Math.max(0, num));
  return `${safe.toFixed(fractionDigits)}%`;
};

/**
 * Format number with compact separators.
 * @param {number|string|null|undefined} value
 * @param {string} [locale]
 * @returns {string}
 */
export const formatNumber = (value, locale = "en-US") => {
  const num = Number(value);
  if (!Number.isFinite(num)) return "0";
  return new Intl.NumberFormat(locale).format(num);
};

const formatUtils = {
  formatDate,
  formatDateTime,
  formatDurationMinutes,
  formatDurationSeconds,
  formatPercent,
  formatNumber,
};

export default formatUtils;
