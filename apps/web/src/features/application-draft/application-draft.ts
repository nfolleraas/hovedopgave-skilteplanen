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

export function newId(): string {
  return crypto.randomUUID();
}

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

export function emptyMaterial(): MaterialDraft {
  return { id: newId(), type: '', amount: '', description: '' };
}

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

export function emptyContactPerson(): ContactPersonDraft {
  return {
    id: newId(),
    name: '',
    availability: '',
    phoneNumber: '',
    email: '',
  };
}

export function emptyTrafficCalmingMeasure(): TrafficCalmingMeasureDraft {
  return {
    id: newId(),
    type: '',
    protectionLevel: '',
    scope: '',
    description: '',
  };
}

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

const storageKey = (caseNumber: string) => `application-draft:${caseNumber}`;

/** Reads the draft kept in this browser tab, or an empty draft. */
export function loadApplicationDraft(caseNumber: string): ApplicationDraft {
  try {
    const stored = sessionStorage.getItem(storageKey(caseNumber));
    if (stored) {
      return { ...emptyApplicationDraft(), ...JSON.parse(stored) };
    }
  } catch {
    // A broken or blocked storage just starts an empty draft.
  }
  return emptyApplicationDraft();
}

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
