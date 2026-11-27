import type {
  ActorRole,
  Availability,
  CableSubtype,
  CableType,
  ExecutionMethod,
  MaterialType,
  PermitType,
  SignPlanType,
  TrafficCalmingMeasureScope,
  TrafficCalmingMeasureType,
  TrafficChange,
  Usage,
  WorkCategory,
} from '../../types/prisma-enums.js';

// Client-side draft of the parts of an application that are not saved yet.
// Field names follow the Prisma domain models so the draft can be sent to
// the API once those endpoints exist. Values are kept as text while editing.

/** Fields from ExcavationPermit and RoadUsePermit (UC-004, UC-007). */
export interface PeriodDraft {
  municipality: string;
  title: string;
  permitType: PermitType | '';
  startDate: string;
  endDate: string;
  usage: Usage | '';
  usageDescription: string;
}

/** CableTask (UC-028). */
export interface CableTaskDraft {
  id: string;
  cableType: CableType | '';
  cableTypesDescription: string;
  cableSubtypes: CableSubtype[];
  cableSubtypesDescription: string;
  workCategories: WorkCategory[];
  workCategoriesDescription: string;
  executionMethods: ExecutionMethod[];
  executionMethodsDescription: string;
}

/** Material on a road use permit (UC-007). */
export interface MaterialDraft {
  id: string;
  type: MaterialType | '';
  amount: string;
  description: string;
}

/** Actor (UC-040). */
export interface ActorDraft {
  id: string;
  role: ActorRole | '';
  name: string;
  phoneNumber: string;
  email: string;
  cvrNumber: string;
  department: string;
  contactPersonName: string;
}

/** ContactPerson (UC-031). */
export interface ContactPersonDraft {
  id: string;
  name: string;
  availability: Availability | '';
  phoneNumber: string;
  email: string;
}

/** TrafficCalmingMeasure. */
export interface TrafficCalmingMeasureDraft {
  id: string;
  type: TrafficCalmingMeasureType | '';
  protectionLevel: string;
  scope: TrafficCalmingMeasureScope | '';
  description: string;
}

/** SignPlan chosen from the standard plans (UC-019 A2). */
export interface SignPlanDraft {
  signPlanType: SignPlanType | '';
  group: string;
  plan: string;
  fileName: string;
}

/** Document (UC-019). Only the file name is kept until upload exists. */
export interface DocumentDraft {
  id: string;
  name: string;
  date: string;
}

export interface ApplicationDraft {
  period: PeriodDraft;
  cableTasks: CableTaskDraft[];
  materials: MaterialDraft[];
  actors: ActorDraft[];
  contactPersons: ContactPersonDraft[];
  signPlan: SignPlanDraft;
  trafficChanges: TrafficChange[];
  trafficCalmingMeasures: TrafficCalmingMeasureDraft[];
  documents: DocumentDraft[];
}

/**
 * Creates a unique ID for a draft list item.
 * @returns A random UUID
 */
export function newId(): string {
  return crypto.randomUUID();
}

/**
 * Creates an empty cable task.
 * @returns A cable task with a new ID and no values
 */
export function emptyCableTask(): CableTaskDraft {
  return {
    id: newId(),
    cableType: '',
    cableTypesDescription: '',
    cableSubtypes: [],
    cableSubtypesDescription: '',
    workCategories: [],
    workCategoriesDescription: '',
    executionMethods: [],
    executionMethodsDescription: '',
  };
}

/**
 * Creates an empty material.
 * @returns A material with a new ID and no values
 */
export function emptyMaterial(): MaterialDraft {
  return { id: newId(), type: '', amount: '', description: '' };
}

/**
 * Creates an empty actor.
 * @returns An actor with a new ID and no values
 */
export function emptyActor(): ActorDraft {
  return {
    id: newId(),
    role: '',
    name: '',
    phoneNumber: '',
    email: '',
    cvrNumber: '',
    department: '',
    contactPersonName: '',
  };
}

/**
 * Creates an empty contact person.
 * @returns A contact person with a new ID and no values
 */
export function emptyContactPerson(): ContactPersonDraft {
  return {
    id: newId(),
    name: '',
    availability: '',
    phoneNumber: '',
    email: '',
  };
}

/**
 * Creates an empty traffic calming measure.
 * @returns A traffic calming measure with a new ID and no values
 */
export function emptyTrafficCalmingMeasure(): TrafficCalmingMeasureDraft {
  return {
    id: newId(),
    type: '',
    protectionLevel: '',
    scope: '',
    description: '',
  };
}

/**
 * Creates an empty application draft with one cable task, one material and
 * one contact person, so each list starts with a form to fill in.
 * @returns The empty draft
 */
export function emptyApplicationDraft(): ApplicationDraft {
  return {
    period: {
      municipality: '',
      title: '',
      permitType: '',
      startDate: '',
      endDate: '',
      usage: '',
      usageDescription: '',
    },
    cableTasks: [emptyCableTask()],
    materials: [emptyMaterial()],
    actors: [],
    contactPersons: [emptyContactPerson()],
    signPlan: { signPlanType: '', group: '', plan: '', fileName: '' },
    trafficChanges: [],
    trafficCalmingMeasures: [],
    documents: [],
  };
}

/** Dummy municipalities until the municipality endpoint exists. */
export const dummyMunicipalities = [
  'Aarhus Kommune',
  'Fredericia Kommune',
  'Holstebro Kommune',
  'Københavns Kommune',
  'Odense Kommune',
  'Vejle Kommune',
];

/**
 * Builds the session storage key for an application's draft.
 * @param caseNumber - The case number of the application
 * @returns The storage key
 */
const storageKey = (caseNumber: string) => `application-draft:${caseNumber}`;

/**
 * Result of reading a stored draft. `corrupt` and `unavailable` still carry an
 * empty draft so the form can render, but the caller must tell the user that
 * their saved data could not be restored.
 */
export type LoadedApplicationDraft = {
  status: 'loaded' | 'new' | 'corrupt' | 'unavailable';
  draft: ApplicationDraft;
};

/**
 * Reads the draft kept in this browser tab and reports why it failed, if it
 * did.
 * @param caseNumber - The case number of the application
 * @returns The load status and the stored or an empty draft
 */
export function loadApplicationDraft(
  caseNumber: string,
): LoadedApplicationDraft {
  let stored: string | null;
  try {
    stored = sessionStorage.getItem(storageKey(caseNumber));
  } catch {
    // Storage is blocked (private mode, browser settings).
    return { status: 'unavailable', draft: emptyApplicationDraft() };
  }
  if (!stored) return { status: 'new', draft: emptyApplicationDraft() };

  try {
    const parsed: unknown = JSON.parse(stored);
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return { status: 'corrupt', draft: emptyApplicationDraft() };
    }
    return {
      status: 'loaded',
      draft: { ...emptyApplicationDraft(), ...parsed },
    };
  } catch {
    return { status: 'corrupt', draft: emptyApplicationDraft() };
  }
}

/**
 * Saves the draft in this browser tab. If storage is blocked, the draft is
 * only kept in memory for this visit.
 * @param caseNumber - The case number of the application
 * @param draft - The draft to save
 */
export function saveApplicationDraft(
  caseNumber: string,
  draft: ApplicationDraft,
): void {
  try {
    sessionStorage.setItem(storageKey(caseNumber), JSON.stringify(draft));
  } catch {
    // The draft still lives in memory for this visit.
  }
}
