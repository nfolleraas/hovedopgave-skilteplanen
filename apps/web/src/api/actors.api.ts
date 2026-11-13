import {
  ActorRole,
  type ActorSubmission,
  type SavedActor,
} from '../pages/actors-page/actor.types.js';
import { apiClient } from './client.api.js';

/** @summary Check that a response value is a record before reading its fields. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** @summary Require a nonempty string for fields used to identify or display actors. */
function isText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/** @summary Validate an actor and its nested address and contact persons at the API boundary. */
function isSavedActor(value: unknown): value is SavedActor {
  return (
    isRecord(value) &&
    isText(value.uuid) &&
    isText(value.name) &&
    Object.values(ActorRole).some((role) => role === value.role) &&
    isText(value.phoneNumber) &&
    isText(value.email) &&
    (value.cvrNumber === null || typeof value.cvrNumber === 'string') &&
    (value.department === null || typeof value.department === 'string') &&
    isRecord(value.address) &&
    isText(value.address.uuid) &&
    isText(value.address.street) &&
    isText(value.address.houseNumber) &&
    isText(value.address.postalCode) &&
    isText(value.address.city) &&
    Array.isArray(value.contactPersons) &&
    value.contactPersons.every(
      (person: unknown) =>
        isRecord(person) &&
        isText(person.uuid) &&
        isText(person.name) &&
        isText(person.email) &&
        isText(person.phoneNumber) &&
        ['Day', 'Evening', 'Night', 'AllDay'].some(
          (availability) => availability === person.availability,
        ),
    )
  );
}

/** @summary Reject malformed actor responses before they reach the UI. */
function parseActor(data: unknown): SavedActor {
  if (!isSavedActor(data)) {
    throw new Error('Serveren returnerede ugyldige aktøroplysninger.');
  }
  return data;
}

/** @summary Fetch and validate all actors, allowing the request to be cancelled. */
export async function getActors(signal?: AbortSignal): Promise<SavedActor[]> {
  const data = await apiClient.get<unknown>('/actors', signal);
  if (!Array.isArray(data)) {
    throw new Error('Serveren returnerede en ugyldig aktørliste.');
  }
  return data.map(parseActor);
}

/** @summary Delete the actor identified by its UUID. */
export async function deleteActor(uuid: string): Promise<void> {
  await apiClient.delete(`/actors/${encodeURIComponent(uuid)}`);
}

/** @summary Create an actor linked to the supplied application case number. */
export async function createActor(
  caseNumber: string,
  draft: ActorSubmission,
): Promise<SavedActor> {
  const data = await apiClient.post<unknown>('/actors', {
    ...draft,
    applicationCaseNumber: caseNumber,
  });
  return parseActor(data);
}

/** @summary Update an actor while excluding its immutable role from the request. */
export async function updateActor(
  uuid: string,
  draft: ActorSubmission,
): Promise<SavedActor> {
  const { role: _role, ...update } = draft;
  const data = await apiClient.patch<unknown>(
    `/actors/${encodeURIComponent(uuid)}`,
    update,
  );
  return parseActor(data);
}
