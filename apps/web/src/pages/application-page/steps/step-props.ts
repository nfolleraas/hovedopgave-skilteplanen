import type { ApplicationDraft } from '../../../features/application-draft/application-draft.js';
import type { WizardApplication } from '../../../types/application.types.js';

/** Runs before a step is left. Resolves false to stay on the step. */
export type LeaveGuard = () => Promise<boolean>;

export type DraftUpdater = (
  update: (draft: ApplicationDraft) => ApplicationDraft,
) => void;

/** Props shared by the steps that edit the application draft. */
export interface DraftStepProps {
  application: WizardApplication;
  draft: ApplicationDraft;
  update: DraftUpdater;
  onBack: () => void;
  onNext: () => void;
}

/** Replaces the fields of one item in a list, matched by id. */
export function patchItem<T extends { id: string }>(
  items: T[],
  id: string,
  patch: Partial<T>,
): T[] {
  return items.map((item) => (item.id === id ? { ...item, ...patch } : item));
}
