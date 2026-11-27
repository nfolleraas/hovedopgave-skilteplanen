import type { ContactPersonFormField } from '../../../../types/contact-person.types.js';

/** Element id of a form field, so the step can move focus to it. */
export function contactFieldId(field: ContactPersonFormField): string {
  return `contact-form-${field}`;
}

/** Element ids, so the step can move focus into the list. */
export const contactListIds = {
  add: (actorId: string) => `actor-${actorId}-add-contact`,
  edit: (key: string) => `contact-${key}-edit`,
  delete: (key: string) => `contact-${key}-delete`,
};

/** Element ids, so the step can move focus into the panel. */
export const contactPanelIds = {
  title: 'contact-panel-title',
  errorSummary: 'contact-panel-errors',
};
