import type { ContactPersonFormField } from '../../types/contact-person.types.js';
import type { ActorRole, Availability } from '../../types/prisma-enums.js';

// Enum labels are shared with the rest of the wizard and live in
// locales/*/translation.json under `wizard.enums`.
export const actorRoleLabelKeys: Record<ActorRole, string> = {
  Supplier: 'wizard.enums.ActorRole.Supplier',
  Contractor: 'wizard.enums.ActorRole.Contractor',
  NetworkOperator: 'wizard.enums.ActorRole.NetworkOperator',
  ProjectCoordinator: 'wizard.enums.ActorRole.ProjectCoordinator',
  Private: 'wizard.enums.ActorRole.Private',
};

export const availabilityLabelKeys: Record<Availability, string> = {
  Day: 'wizard.enums.Availability.Day',
  Evening: 'wizard.enums.Availability.Evening',
  Night: 'wizard.enums.Availability.Night',
  AllDay: 'wizard.enums.Availability.AllDay',
};

export const contactPersonFieldLabelKeys: Record<
  ContactPersonFormField,
  string
> = {
  name: 'contacts.fields.name',
  availability: 'contacts.fields.availability',
  phoneNumber: 'contacts.fields.phoneNumber',
  email: 'contacts.fields.email',
};

/** Shows an 8 digit phone number in pairs, e.g. `22 33 44 55`. */
export function formatPhoneNumber(phoneNumber: string): string {
  return /^\d{8}$/.test(phoneNumber)
    ? phoneNumber.replace(/(\d{2})(?=\d)/g, '$1 ')
    : phoneNumber;
}
