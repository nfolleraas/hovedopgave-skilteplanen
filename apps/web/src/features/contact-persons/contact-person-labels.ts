import type { ContactPersonFormField } from '../../types/contact-person.types.js';
import type { Availability } from '../../types/prisma-enums.js';

// One place for enum labels. The Danish and English text lives in
// locales/*/translation.json under `contacts.labels`.
export const availabilityLabelKeys: Record<Availability, string> = {
  Day: 'contacts.labels.availability.Day',
  Evening: 'contacts.labels.availability.Evening',
  Night: 'contacts.labels.availability.Night',
  AllDay: 'contacts.labels.availability.AllDay',
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
