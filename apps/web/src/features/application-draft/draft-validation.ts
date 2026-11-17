import {
  ApplicationType,
  CableType,
  PermitType,
  Usage,
} from '../../types/prisma-enums.js';
import type {
  ApplicationDraft,
  CableTaskDraft,
  MaterialDraft,
  PeriodDraft,
} from './application-draft.js';

export type DraftError =
  | 'required'
  | 'endBeforeStart'
  | 'startInPast'
  | 'positiveWhole'
  | 'atLeastOneTask'
  | 'atLeastOneMaterial'
  | 'atLeastOneMeasure';

/**
 * Errors keyed by field path, e.g. `period.startDate` or
 * `cableTasks.<id>.cableType`. List-level errors use the list name.
 */
export type DraftErrors = Record<string, DraftError>;

function today(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

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

/** UC-004 F1–F5, UC-007 F1–F2. */
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

/** UC-028 F1–F2. */
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

/** UC-007 F2–F3. */
function validateMaterial(errors: DraftErrors, material: MaterialDraft): void {
  const path = `materials.${material.id}`;
  requireText(errors, `${path}.type`, material.type);
  if (!/^\d+$/.test(material.amount.trim()) || Number(material.amount) < 1) {
    errors[`${path}.amount`] = 'positiveWhole';
  }
}

/** Tasks for excavation permits, materials for road use permits. */
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

/** UC-004 F10: at least one traffic calming measure with a type. */
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

/** Only PNG and JPG files can be uploaded (UC-019 F2). */
export function isAllowedDocument(fileName: string): boolean {
  return /\.(png|jpe?g)$/i.test(fileName);
}

export function hasErrors(errors: DraftErrors): boolean {
  return Object.keys(errors).length > 0;
}
