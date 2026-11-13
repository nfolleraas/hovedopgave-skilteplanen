import i18n from '../config/i18n.js';

const readableDateFormatters = {
  'da-DK': new Intl.DateTimeFormat('da-DK', { dateStyle: 'long' }),
  'en-GB': new Intl.DateTimeFormat('en-GB', { dateStyle: 'long' }),
};
const readableTimeFormatters = {
  'da-DK': new Intl.DateTimeFormat('da-DK', { timeStyle: 'short' }),
  'en-GB': new Intl.DateTimeFormat('en-GB', { timeStyle: 'short' }),
};

/**
 * Formats a date using the readable date style for the active language.
 * @param value - The date value to format
 * @param language - The language used to select the locale
 * @returns The localized date string
 */
export function formatReadableDate(
  value: Date | string,
  language = i18n.resolvedLanguage ?? i18n.language,
): string {
  const date = value instanceof Date ? value : new Date(value);
  const locale = language.startsWith('da') ? 'da-DK' : 'en-GB';

  return readableDateFormatters[locale].format(date);
}

/**
 * Formats a time using the short time style for the active language.
 * @param value - The date value whose time should be formatted
 * @param language - The language used to select the locale
 * @returns The localized time string
 */
export function formatReadableTime(
  value: Date | string,
  language = i18n.resolvedLanguage ?? i18n.language,
): string {
  const date = value instanceof Date ? value : new Date(value);
  const locale = language.startsWith('da') ? 'da-DK' : 'en-GB';

  return readableTimeFormatters[locale].format(date);
}
