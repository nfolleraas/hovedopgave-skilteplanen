import type {
  ActorDraft,
  ActorRole,
  ApplicationType,
  ContactAvailability,
} from '../pages/application-page/actor-form.validation.js';

export interface SavedActor {
  uuid: string;
  role: ActorRole;
  name: string;
  phoneNumber: string;
  email: string;
  cvrNumber: string | null;
  department: string | null;
  address: ActorDraft['address'] & { uuid: string };
  contactPersons: {
    uuid: string;
    name: string;
    email: string;
    phoneNumber: string;
    availability: ContactAvailability;
  }[];
}

export interface ApplicationActors {
  type: ApplicationType;
  actors: SavedActor[];
}

export async function getApplicationActors(
  caseNumber: string,
): Promise<ApplicationActors> {
  const response = await fetch(
    `/api/actors/application/${encodeURIComponent(caseNumber)}`,
  );
  if (!response.ok) throw new Error('Could not load application actors');
  return response.json() as Promise<ApplicationActors>;
}

export async function createActor(
  caseNumber: string,
  draft: ActorDraft,
): Promise<SavedActor> {
  const response = await fetch('/api/actors', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...draft, applicationCaseNumber: caseNumber }),
  });
  if (!response.ok) throw new Error('Could not create actor');
  return response.json() as Promise<SavedActor>;
}
