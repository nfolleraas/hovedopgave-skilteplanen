import { render } from '@testing-library/react';
import i18n from 'i18next';
import type { ReactElement } from 'react';
import { initReactI18next } from 'react-i18next';
import da from '../../locales/da/translation.json';
import { Providers } from '../app/providers.js';

// Component tests use the Danish texts, as the applicant sees them.
if (!i18n.isInitialized) {
  await i18n.use(initReactI18next).init({
    lng: 'da',
    resources: { da: { translation: da } },
    interpolation: { escapeValue: false },
  });
}

/** Renders a component with the app's theme and Danish translations. */
export function renderWithProviders(ui: ReactElement) {
  return render(<Providers>{ui}</Providers>);
}
