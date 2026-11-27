import type {
  Area,
  AreaFormField,
  AreaFormValues,
} from '../../types/area.types.js';
import { emptyAreaFormValues, toAreaFormValues } from './area-validation.js';

/**
 * Where the road came from. Searched roads cannot be renamed (UC-036). The
 * API stores it as `isManual`, so it is kept after a page reload.
 */
export type AreaSource = 'search' | 'manual';

export interface AreaEntry {
  /** The area uuid, or a temporary key until a manual area is saved. */
  key: string;
  saved: Area | null;
  source: AreaSource;
}

export interface AreaEditState {
  entries: AreaEntry[];
  activeKey: string | null;
  draft: AreaFormValues | null;
  showErrors: boolean;
  /** Area the user wants to open while the active one has unsaved changes. */
  pendingKey: string | null;
  nextTempId: number;
}

export type AreaEditAction =
  | { type: 'loaded'; areas: Area[] }
  | { type: 'added'; areas: Area[] }
  | { type: 'addManual' }
  | { type: 'open'; key: string }
  | { type: 'discardAndOpenPending' }
  | { type: 'cancelPending' }
  | { type: 'change'; field: AreaFormField; value: string }
  | { type: 'cancel' }
  | { type: 'close' }
  | { type: 'showErrors' }
  | { type: 'saved'; key: string; area: Area }
  | { type: 'removed'; key: string };

export const initialAreaEditState: AreaEditState = {
  entries: [],
  activeKey: null,
  draft: null,
  showErrors: false,
  pendingKey: null,
  nextTempId: 1,
};

/**
 * Gets the temporary key the next manually added area gets.
 * @param state - The current edit state
 * @returns The temporary key, e.g. `new-1`
 */
export function nextManualKey(state: AreaEditState): string {
  return `new-${state.nextTempId}`;
}

/**
 * Finds where a saved area's road came from.
 * @param area - The saved area
 * @returns `manual` if the road was entered manually, otherwise `search`
 */
function sourceOf(area: Area): AreaSource {
  return area.isManual ? 'manual' : 'search';
}

/**
 * Creates a list entry for a saved area.
 * @param area - The saved area
 * @returns The entry, keyed by the area uuid
 */
function toEntry(area: Area): AreaEntry {
  return { key: area.uuid, saved: area, source: sourceOf(area) };
}

/**
 * Checks whether the road of an area can be changed. Only manually entered
 * roads can be renamed (UC-036).
 * @param entry - The area entry
 * @returns True if the road can be edited
 */
export function isRoadEditable(entry: AreaEntry): boolean {
  return entry.source === 'manual';
}

/**
 * Finds the area that is open for editing.
 * @param state - The current edit state
 * @returns The active entry, or undefined if no area is open
 */
export function getActiveEntry(state: AreaEditState): AreaEntry | undefined {
  return state.entries.find((entry) => entry.key === state.activeKey);
}

/**
 * Gets the stored form values of an area.
 * @param entry - The area entry
 * @returns The saved values, or empty values for an unsaved area
 */
function savedValues(entry: AreaEntry): AreaFormValues {
  return entry.saved ? toAreaFormValues(entry.saved) : emptyAreaFormValues;
}

/**
 * Checks whether the open area has changes that are not saved.
 * @param state - The current edit state
 * @returns True if the draft differs from the saved values
 */
export function isDirty(state: AreaEditState): boolean {
  const active = getActiveEntry(state);
  if (!active || !state.draft) {
    return false;
  }
  const saved = savedValues(active);
  return (Object.keys(saved) as AreaFormField[]).some(
    (field) => saved[field] !== state.draft?.[field],
  );
}

/**
 * Opens an area for editing with its saved values, or closes all areas.
 * @param state - The current edit state
 * @param key - The key of the area to open, or null to close all areas
 * @returns The new edit state
 */
function open(state: AreaEditState, key: string | null): AreaEditState {
  const entry = state.entries.find((candidate) => candidate.key === key);
  return {
    ...state,
    activeKey: entry ? entry.key : null,
    draft: entry ? savedValues(entry) : null,
    showErrors: false,
    pendingKey: null,
  };
}

/**
 * Removes the active area if it was never saved.
 * @param state - The current edit state
 * @returns The edit state without the unsaved area
 */
function dropUnsavedActive(state: AreaEditState): AreaEditState {
  const active = getActiveEntry(state);
  if (!active || active.saved) {
    return state;
  }
  return {
    ...state,
    entries: state.entries.filter((entry) => entry.key !== active.key),
  };
}

/**
 * Updates the area edit state. Unsaved changes are protected: opening
 * another area while the active one is dirty only stores it as pending.
 * @param state - The current edit state
 * @param action - The action to apply
 * @returns The new edit state
 */
export function areaEditReducer(
  state: AreaEditState,
  action: AreaEditAction,
): AreaEditState {
  switch (action.type) {
    case 'loaded': {
      const entries = action.areas.map(toEntry);
      return open({ ...state, entries }, state.activeKey);
    }
    case 'added':
      return {
        ...state,
        entries: [...state.entries, ...action.areas.map(toEntry)],
      };
    case 'addManual': {
      if (isDirty(state)) {
        return state;
      }
      const key = nextManualKey(state);
      const base = dropUnsavedActive(state);
      return open(
        {
          ...base,
          entries: [...base.entries, { key, saved: null, source: 'manual' }],
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
      // Cancelling discards the changes and collapses the area. A manual
      // area that was never saved disappears.
      return open(dropUnsavedActive(state), null);
    }
    case 'close':
      // Used when the step is left. Unsaved input is kept, but an untouched
      // manual area is removed so no empty form is left in the list.
      if (isDirty(state)) {
        return state;
      }
      return open(dropUnsavedActive(state), null);
    case 'showErrors':
      return { ...state, showErrors: true };
    case 'saved': {
      const entries = state.entries.map((entry) =>
        entry.key === action.key ? toEntry(action.area) : entry,
      );
      const next = { ...state, entries, activeKey: action.area.uuid };
      // A saved area collapses, unless the user chose another area to open.
      return open(next, state.pendingKey);
    }
    case 'removed': {
      const entries = state.entries.filter((entry) => entry.key !== action.key);
      const next = { ...state, entries };
      return state.activeKey === action.key ? open(next, null) : next;
    }
  }
}
