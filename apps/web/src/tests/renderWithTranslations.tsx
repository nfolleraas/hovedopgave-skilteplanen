import { render } from '@testing-library/react';
import { createInstance } from 'i18next';
import type { ReactElement } from 'react';
import { I18nextProvider } from 'react-i18next';
import da from '../../locales/da/translation.json';
import en from '../../locales/en/translation.json';

/** Renders a component with an independent i18next instance and the real translations. */
export async function renderWithTranslations(
  element: ReactElement,
  language: 'en' | 'da' = 'en',
) {
  const i18n = createInstance();
  await i18n.init({
    lng: language,
    resources: { da: { translation: da }, en: { translation: en } },
  });
  return render(<I18nextProvider i18n={i18n}>{element}</I18nextProvider>);
}
