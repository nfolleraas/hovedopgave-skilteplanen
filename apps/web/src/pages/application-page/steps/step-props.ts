import type { ApplicationDraft } from '../../../features/application-draft/application-draft.js';
import type { AreaApplication } from '../../../types/area.types.js';

export type DraftUpdater = (
  update: (draft: ApplicationDraft) => ApplicationDraft,
) => void;

/** Props shared by the steps that edit the application draft. */
export interface DraftStepProps {
  application: AreaApplication;
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
