import {
  ActorRole,
  ApplicationType,
  CableType,
  PermitType,
  Usage,
} from '../../types/prisma-enums.js';
import type {
  ActorDraft,
  ApplicationDraft,
  CableTaskDraft,
  ContactPersonDraft,
  MaterialDraft,
  PeriodDraft,
} from './application-draft.js';

export type DraftError =
  | 'required'
  | 'endBeforeStart'
  | 'startInPast'
  | 'phone'
  | 'email'
  | 'cvr'
  | 'lettersOnly'
  | 'positiveWhole'
  | 'atLeastOneTask'
  | 'atLeastOneMaterial'
  | 'atLeastOneContact'
  | 'atLeastOneMeasure';

/**
 * Errors keyed by field path, e.g. `period.startDate` or
 * `contactPersons.<id>.email`. List-level errors use the list name.
 */
export type DraftErrors = Record<string, DraftError>;

const phonePattern = /^\d{8}$/;
const cvrPattern = /^\d{8}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const lettersPattern = /^[\p{L} '-]+$/u;

/**
 * Gets today's date in the user's local time zone.
 * @returns The date as `YYYY-MM-DD`
 */
function today(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

/**
 * Adds a `required` error when a text is blank or a list is empty.
 * @param errors - The errors to add to
 * @param path - The field path to use as the error key
 * @param value - The text or list to check
 */
function requireText(
  errors: DraftErrors,
  path: string,
  value: string | readonly unknown[],
): void {
  const isEmpty = Array.isArray(value)
    ? value.length === 0
    : String(value).trim() === '';
  if (isEmpty) errors[path] = 'required';
}

/**
 * Validates the period step (UC-004 F1–F5, UC-007 F1–F2). Excavation
 * permits need a permit type; road use permits need a title and usage.
 * @param type - The application type
 * @param period - The period values
 * @returns The errors keyed by field path
 */
export function validatePeriod(
  type: ApplicationType,
  period: PeriodDraft,
): DraftErrors {
  const errors: DraftErrors = {};
  requireText(errors, 'period.municipality', period.municipality);
  requireText(errors, 'period.startDate', period.startDate);
  requireText(errors, 'period.endDate', period.endDate);

  if (type === ApplicationType.ExcavationPermit) {
    requireText(errors, 'period.permitType', period.permitType);
    // An application (not a notice) cannot start in the past (UC-004 F5).
    if (
      period.permitType === PermitType.Application &&
      period.startDate &&
      period.startDate < today()
    ) {
      errors['period.startDate'] = 'startInPast';
    }
  } else {
    requireText(errors, 'period.title', period.title);
    requireText(errors, 'period.usage', period.usage);
    if (period.usage === Usage.Other) {
      requireText(errors, 'period.usageDescription', period.usageDescription);
    }
  }

  if (period.startDate && period.endDate && period.endDate < period.startDate) {
    errors['period.endDate'] = 'endBeforeStart';
  }

  return errors;
}

/**
 * Validates a cable task (UC-028 F1–F2).
 * @param errors - The errors to add to
 * @param task - The cable task to check
 */
function validateCableTask(errors: DraftErrors, task: CableTaskDraft): void {
  const path = `cableTasks.${task.id}`;
  requireText(errors, `${path}.cableType`, task.cableType);
  if (task.cableType === CableType.Other) {
    requireText(
      errors,
      `${path}.cableTypesDescription`,
      task.cableTypesDescription,
    );
  }
  requireText(errors, `${path}.cableSubtypes`, task.cableSubtypes);
  if (task.cableSubtypes.includes('Other')) {
    requireText(
      errors,
      `${path}.cableSubtypesDescription`,
      task.cableSubtypesDescription,
    );
  }
  requireText(errors, `${path}.workCategories`, task.workCategories);
  if (task.workCategories.includes('Other')) {
    requireText(
      errors,
      `${path}.workCategoriesDescription`,
      task.workCategoriesDescription,
    );
  }
  requireText(errors, `${path}.executionMethods`, task.executionMethods);
  if (task.executionMethods.includes('Other')) {
    requireText(
      errors,
      `${path}.executionMethodsDescription`,
      task.executionMethodsDescription,
    );
  }
}

/**
 * Validates a material (UC-007 F2–F3).
 * @param errors - The errors to add to
 * @param material - The material to check
 */
function validateMaterial(errors: DraftErrors, material: MaterialDraft): void {
  const path = `materials.${material.id}`;
  requireText(errors, `${path}.type`, material.type);
  if (!/^\d+$/.test(material.amount.trim()) || Number(material.amount) < 1) {
    errors[`${path}.amount`] = 'positiveWhole';
  }
}

/**
 * Validates the tasks step: cable tasks for excavation permits, materials
 * for road use permits.
 * @param type - The application type
 * @param draft - The application draft
 * @returns The errors keyed by field path
 */
export function validateTasks(
  type: ApplicationType,
  draft: ApplicationDraft,
): DraftErrors {
  const errors: DraftErrors = {};
  if (type === ApplicationType.ExcavationPermit) {
    if (draft.cableTasks.length === 0) errors.cableTasks = 'atLeastOneTask';
    for (const task of draft.cableTasks) validateCableTask(errors, task);
    return errors;
  }

  // At least one material is required (UC-007 F2).
  if (draft.materials.length === 0) errors.materials = 'atLeastOneMaterial';
  for (const material of draft.materials) validateMaterial(errors, material);
  return errors;
}

/**
 * Validates the phone number and email of an actor or contact person.
 * @param errors - The errors to add to
 * @param path - The field path of the item
 * @param item - The item with a phone number and email
 */
function validatePhoneAndEmail(
  errors: DraftErrors,
  path: string,
  item: { phoneNumber: string; email: string },
): void {
  if (!phonePattern.test(item.phoneNumber.trim())) {
    errors[`${path}.phoneNumber`] = 'phone';
  }
  if (!emailPattern.test(item.email.trim())) {
    errors[`${path}.email`] = 'email';
  }
}

/**
 * Validates an actor (UC-040 F1–F6). Private actors have no CVR,
 * department or contact.
 * @param errors - The errors to add to
 * @param actor - The actor to check
 */
function validateActor(errors: DraftErrors, actor: ActorDraft): void {
  const path = `actors.${actor.id}`;
  requireText(errors, `${path}.role`, actor.role);
  if (!lettersPattern.test(actor.name.trim())) {
    errors[`${path}.name`] = actor.name.trim() ? 'lettersOnly' : 'required';
  }
  validatePhoneAndEmail(errors, path, actor);
  if (actor.role && actor.role !== ActorRole.Private) {
    if (!cvrPattern.test(actor.cvrNumber.trim())) {
      errors[`${path}.cvrNumber`] = 'cvr';
    }
    const contact = actor.contactPersonName.trim();
    if (contact && !lettersPattern.test(contact)) {
      errors[`${path}.contactPersonName`] = 'lettersOnly';
    }
  }
}

/**
 * Validates all actors in the draft.
 * @param draft - The application draft
 * @returns The errors keyed by field path
 */
export function validateActors(draft: ApplicationDraft): DraftErrors {
  const errors: DraftErrors = {};
  for (const actor of draft.actors) validateActor(errors, actor);
  return errors;
}

/**
 * Validates a contact person (UC-031 F1–F4, UC-004 F7).
 * @param errors - The errors to add to
 * @param contact - The contact person to check
 */
function validateContactPerson(
  errors: DraftErrors,
  contact: ContactPersonDraft,
): void {
  const path = `contactPersons.${contact.id}`;
  requireText(errors, `${path}.name`, contact.name);
  requireText(errors, `${path}.availability`, contact.availability);
  validatePhoneAndEmail(errors, path, contact);
}

/**
 * Validates that the draft has at least one valid contact person.
 * @param draft - The application draft
 * @returns The errors keyed by field path
 */
export function validateContactPersons(draft: ApplicationDraft): DraftErrors {
  const errors: DraftErrors = {};
  if (draft.contactPersons.length === 0) {
    errors.contactPersons = 'atLeastOneContact';
  }
  for (const contact of draft.contactPersons) {
    validateContactPerson(errors, contact);
  }
  return errors;
}

/**
 * Validates the sign plan step (UC-004 F10): at least one traffic calming
 * measure with a type and scope.
 * @param draft - The application draft
 * @returns The errors keyed by field path
 */
export function validateSignPlanAndTraffic(
  draft: ApplicationDraft,
): DraftErrors {
  const errors: DraftErrors = {};
  if (draft.trafficCalmingMeasures.length === 0) {
    errors.trafficCalmingMeasures = 'atLeastOneMeasure';
  }
  for (const measure of draft.trafficCalmingMeasures) {
    const path = `trafficCalmingMeasures.${measure.id}`;
    requireText(errors, `${path}.type`, measure.type);
    requireText(errors, `${path}.scope`, measure.scope);
  }
  return errors;
}

/**
 * Checks whether a file can be uploaded. Only PNG and JPG files are allowed
 * (UC-019 F2).
 * @param fileName - The name of the file
 * @returns True if the file has an allowed extension
 */
export function isAllowedDocument(fileName: string): boolean {
  return /\.(png|jpe?g)$/i.test(fileName);
}

/**
 * Checks whether a validation result contains any errors.
 * @param errors - The validation result
 * @returns True if there is at least one error
 */
export function hasErrors(errors: DraftErrors): boolean {
  return Object.keys(errors).length > 0;
}
