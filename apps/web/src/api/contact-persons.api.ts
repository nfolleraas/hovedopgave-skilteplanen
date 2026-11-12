import type {
  ApplicationContactPersons,
  ContactPerson,
  ContactPersonInput,
} from '../types/contact-person.types.js';
import { apiClient } from './client.js';

export function getApplicationContactPersons(
  applicationId: string,
): Promise<ApplicationContactPersons> {
  const query = new URLSearchParams({ applicationId });
  return apiClient.get(`/contact-persons?${query}`);
}

export function createContactPerson(
  applicationId: string,
  contactPerson: ContactPersonInput,
): Promise<ContactPerson> {
  return apiClient.post('/contact-persons', {
    applicationId,
    ...contactPerson,
  });
}

export function updateContactPerson(
  id: string,
  contactPerson: ContactPersonInput,
): Promise<ContactPerson> {
  return apiClient.patch(
    `/contact-persons/${encodeURIComponent(id)}`,
    contactPerson,
  );
}

export function deleteContactPerson(id: string): Promise<void> {
  return apiClient.delete(`/contact-persons/${encodeURIComponent(id)}`);
}
