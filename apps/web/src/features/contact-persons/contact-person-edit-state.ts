import type {
  ContactPerson,
  ContactPersonFormField,
  ContactPersonFormValues,
} from '../../types/contact-person.types.js';
import {
  emptyContactPersonFormValues,
  toContactPersonFormValues,
} from './contact-person-validation.js';

export interface ContactPersonEntry {
  /** The contact person uuid, or a temporary key until a new one is saved. */
  key: string;
  /** The actor the contact person belongs to. */
  actorId: string;
  saved: ContactPerson | null;
}

export interface ContactPersonEditState {
  entries: ContactPersonEntry[];
  activeKey: string | null;
  draft: ContactPersonFormValues | null;
  showErrors: boolean;
  /** Entry the user wants to open while the active one has unsaved changes. */
  pendingKey: string | null;
  nextTempId: number;
}

export type ContactPersonEditAction =
  | { type: 'loaded'; contactPersons: ContactPerson[] }
  | { type: 'addNew'; actorId: string }
  | { type: 'open'; key: string }
  | { type: 'discardAndOpenPending' }
  | { type: 'cancelPending' }
  | { type: 'change'; field: ContactPersonFormField; value: string }
  | { type: 'cancel' }
  | { type: 'showErrors' }
  | { type: 'saved'; key: string; contactPerson: ContactPerson }
  | { type: 'removed'; key: string };

export const initialContactPersonEditState: ContactPersonEditState = {
  entries: [],
  activeKey: null,
  draft: null,
  showErrors: false,
  pendingKey: null,
  nextTempId: 1,
};

/** The key the next new contact person gets. */
export function nextNewKey(state: ContactPersonEditState): string {
  return `new-${state.nextTempId}`;
}

export function getActiveEntry(
  state: ContactPersonEditState,
): ContactPersonEntry | undefined {
  return state.entries.find((entry) => entry.key === state.activeKey);
}

function savedValues(entry: ContactPersonEntry): ContactPersonFormValues {
  return entry.saved
    ? toContactPersonFormValues(entry.saved)
    : emptyContactPersonFormValues;
}

export function isDirty(state: ContactPersonEditState): boolean {
  const active = getActiveEntry(state);
  if (!active || !state.draft) {
    return false;
  }
  const saved = savedValues(active);
  return (Object.keys(saved) as ContactPersonFormField[]).some(
    (field) => saved[field] !== state.draft?.[field],
  );
}

function open(
  state: ContactPersonEditState,
  key: string | null,
): ContactPersonEditState {
  const entry = state.entries.find((candidate) => candidate.key === key);
  return {
    ...state,
    activeKey: entry ? entry.key : null,
    draft: entry ? savedValues(entry) : null,
    showErrors: false,
    pendingKey: null,
  };
}

/** Removes the active contact person if it was never saved. */
function dropUnsavedActive(
  state: ContactPersonEditState,
): ContactPersonEditState {
  const active = getActiveEntry(state);
  if (!active || active.saved) {
    return state;
  }
  return {
    ...state,
    entries: state.entries.filter((entry) => entry.key !== active.key),
  };
}

export function contactPersonEditReducer(
  state: ContactPersonEditState,
  action: ContactPersonEditAction,
): ContactPersonEditState {
  switch (action.type) {
    case 'loaded': {
      const entries = action.contactPersons.map((contactPerson) => ({
        key: contactPerson.uuid,
        actorId: contactPerson.actorId,
        saved: contactPerson,
      }));
      return open({ ...state, entries }, state.activeKey);
    }
    case 'addNew': {
      if (isDirty(state)) {
        return state;
      }
      const key = nextNewKey(state);
      const base = dropUnsavedActive(state);
      return open(
        {
          ...base,
          entries: [
            ...base.entries,
            { key, actorId: action.actorId, saved: null },
          ],
          nextTempId: state.nextTempId + 1,
        },
        key,
      );
    }
    case 'open':
      if (action.key === state.activeKey) {
        return state;
      }
      if (isDirty(state)) {
        return { ...state, pendingKey: action.key };
      }
      return open(dropUnsavedActive(state), action.key);
    case 'discardAndOpenPending':
      return open(dropUnsavedActive(state), state.pendingKey);
    case 'cancelPending':
      return { ...state, pendingKey: null };
    case 'change':
      if (!state.draft) {
        return state;
      }
      return {
        ...state,
        draft: { ...state.draft, [action.field]: action.value },
      };
    case 'cancel': {
      const active = getActiveEntry(state);
      if (!active) {
        return state;
      }
      // A new contact person that was never saved disappears on cancel.
      if (!active.saved) {
        return open(dropUnsavedActive(state), null);
      }
      return open(state, active.key);
    }
    case 'showErrors':
      return { ...state, showErrors: true };
    case 'saved': {
      const entries = state.entries.map((entry) =>
        entry.key === action.key
          ? {
              ...entry,
              key: action.contactPerson.uuid,
              saved: action.contactPerson,
            }
          : entry,
      );
      const next = { ...state, entries, activeKey: action.contactPerson.uuid };
      return open(next, state.pendingKey ?? action.contactPerson.uuid);
    }
    case 'removed': {
      const entries = state.entries.filter((entry) => entry.key !== action.key);
      const next = { ...state, entries };
      return state.activeKey === action.key ? open(next, null) : next;
    }
  }
}
