import {
  ActorRole,
  type ActorSubmission,
  type SavedActor,
} from '../pages/actors-page/actor.types.js';
import { apiClient } from './client.api.js';

/**
 * Checks that a response value is a record before reading its fields.
 * @param value - Response value to check
 * @returns Whether the value is a non-null object that is not an array
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Requires a nonempty string for fields used to identify or display actors.
 * @param value - Response field to check
 * @returns Whether the value is a string containing non-whitespace text
 */
function isText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Validates an actor and its nested address and contact persons at the API
 * boundary.
 * @param value - Response value to validate
 * @returns Whether the value satisfies the saved actor response shape
 */
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

/**
 * Rejects malformed actor responses before they reach the UI.
 * @param data - Untrusted actor response
 * @returns The validated saved actor
 */
function parseActor(data: unknown): SavedActor {
  if (!isSavedActor(data)) {
    throw new Error('Serveren returnerede ugyldige aktøroplysninger.');
  }
  return data;
}

/**
 * Fetches and validates all actors, allowing the request to be cancelled.
 * @param signal - Optional signal to cancel the request
 * @param caseNumber - Optional application case number to filter by
 * @returns The validated actors returned by the API
 */
export async function getActors(
  signal?: AbortSignal,
  caseNumber?: string,
): Promise<SavedActor[]> {
  const path = caseNumber
    ? `/actors?${new URLSearchParams({ caseNumber })}`
    : '/actors';
  const data = await apiClient.get<unknown>(path, signal);
  if (!Array.isArray(data)) {
    throw new Error('Serveren returnerede en ugyldig aktørliste.');
  }
  return data.map(parseActor);
}

/**
 * Deletes the actor identified by its UUID.
 * @param uuid - UUID of the actor to delete
 */
export async function deleteActor(uuid: string): Promise<void> {
  await apiClient.delete(`/actors/${encodeURIComponent(uuid)}`);
}

/**
 * Creates an actor linked to the supplied application case number.
 * @param caseNumber - Case number of the application receiving the actor
 * @param draft - Actor details to submit
 * @returns The validated created actor
 */
export async function createActor(
  caseNumber: string,
  draft: ActorSubmission,
): Promise<SavedActor> {
  if (!caseNumber.trim()) {
    throw new Error('En aktør skal knyttes til en valgt ansøgning.');
  }
  const data = await apiClient.post<unknown>('/actors', {
    ...draft,
    applicationCaseNumber: caseNumber,
  });
  return parseActor(data);
}

/**
 * Updates an actor while excluding its immutable role from the request.
 * @param uuid - UUID of the actor to update
 * @param draft - Actor details whose mutable fields should be submitted
 * @returns The validated updated actor
 */
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
