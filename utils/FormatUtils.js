/**
 * FormatUtils.js
 * Shared formatting helpers.
 */

/**
 * Format a number as currency.
 * @param {number} amount
 * @param {string} [currency='CAD']
 * @param {string} [locale='en-CA']
 */
export function formatCurrency(amount, currency = 'CAD', locale = 'en-CA') {
  return new Intl.NumberFormat(locale, {
    style:    'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a number with fixed decimal places.
 * @param {number} value
 * @param {number} [decimals=2]
 */
export function formatNumber(value, decimals = 2) {
  return Number(value).toFixed(decimals);
}

/**
 * Format hours as "X hrs Y min".
 * @param {number} totalHours
 */
export function formatHours(totalHours) {
  const h = Math.floor(totalHours);
  const m = Math.round((totalHours - h) * 60);
  if (m === 0) return `${h} hrs`;
  return `${h} hrs ${m} min`;
}

/**
 * Parse a string to float, returning 0 on failure.
 */
export function safeFloat(value, fallback = 0) {
  const n = parseFloat(value);
  return isNaN(n) ? fallback : n;
}

/**
 * Parse a string to int, returning 0 on failure.
 */
export function safeInt(value, fallback = 0) {
  const n = parseInt(value, 10);
  return isNaN(n) ? fallback : n;
}

/**
 * Clamp a number between min and max.
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
