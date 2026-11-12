import i18n from '../config/i18n.js';

const readableDateFormatters = {
  'da-DK': new Intl.DateTimeFormat('da-DK', { dateStyle: 'long' }),
  'en-GB': new Intl.DateTimeFormat('en-GB', { dateStyle: 'long' }),
};
const readableTimeFormatters = {
  'da-DK': new Intl.DateTimeFormat('da-DK', { timeStyle: 'short' }),
  'en-GB': new Intl.DateTimeFormat('en-GB', { timeStyle: 'short' }),
};

export function formatReadableDate(
  value: Date | string,
  language = i18n.resolvedLanguage ?? i18n.language,
): string {
  const date = value instanceof Date ? value : new Date(value);
  const locale = language.startsWith('da') ? 'da-DK' : 'en-GB';

  return readableDateFormatters[locale].format(date);
}

export function formatReadableTime(
  value: Date | string,
  language = i18n.resolvedLanguage ?? i18n.language,
): string {
  const date = value instanceof Date ? value : new Date(value);
  const locale = language.startsWith('da') ? 'da-DK' : 'en-GB';

  return readableTimeFormatters[locale].format(date);
}
