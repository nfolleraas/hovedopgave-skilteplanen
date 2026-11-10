import i18n from '../config/i18n.js';

export function formatReadableDate(
  value: Date | string,
  language = i18n.resolvedLanguage ?? i18n.language,
): string {
  const date = value instanceof Date ? value : new Date(value);
  const locale = language.startsWith('da') ? 'da-DK' : 'en-GB';

  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'long',
  }).format(date);
}

export function formatReadableTime(
  value: Date | string,
  language = i18n.resolvedLanguage ?? i18n.language,
): string {
  const date = value instanceof Date ? value : new Date(value);
  const locale = language.startsWith('da') ? 'da-DK' : 'en-GB';

  return new Intl.DateTimeFormat(locale, {
    timeStyle: 'short',
  }).format(date);
}
