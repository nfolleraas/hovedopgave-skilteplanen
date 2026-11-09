import type {
  Area,
  AreaFormField,
  AreaFormValues,
} from '../../types/area.types.js';
import { emptyAreaFormValues, toAreaFormValues } from './area-validation.js';

/** Where the road came from. Searched roads cannot be renamed (UC-036). */
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
  | { type: 'added'; areas: Area[]; source: AreaSource }
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

/** The key the next manually added area gets. */
export function nextManualKey(state: AreaEditState): string {
  return `new-${state.nextTempId}`;
}

export function isRoadEditable(entry: AreaEntry): boolean {
  return entry.source === 'manual';
}

export function getActiveEntry(state: AreaEditState): AreaEntry | undefined {
  return state.entries.find((entry) => entry.key === state.activeKey);
}

function savedValues(entry: AreaEntry): AreaFormValues {
  return entry.saved ? toAreaFormValues(entry.saved) : emptyAreaFormValues;
}

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

/** Removes the active area if it was never saved. */
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

export function areaEditReducer(
  state: AreaEditState,
  action: AreaEditAction,
): AreaEditState {
  switch (action.type) {
    case 'loaded': {
      // Keep the source of areas created in this session.
      const sources = new Map(
        state.entries.map((entry) => [entry.key, entry.source]),
      );
      const entries = action.areas.map((area) => ({
        key: area.uuid,
        saved: area,
        source: sources.get(area.uuid) ?? ('search' as const),
      }));
      return open({ ...state, entries }, state.activeKey);
    }
    case 'added': {
      const added = action.areas.map((area) => ({
        key: area.uuid,
        saved: area,
        source: action.source,
      }));
      return { ...state, entries: [...state.entries, ...added] };
    }
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
      // A manual area that was never saved disappears on cancel.
      if (!active.saved) {
        return open(dropUnsavedActive(state), null);
      }
      return open(state, active.key);
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
        entry.key === action.key
          ? { ...entry, key: action.area.uuid, saved: action.area }
          : entry,
      );
      const next = { ...state, entries, activeKey: action.area.uuid };
      return open(next, state.pendingKey ?? action.area.uuid);
    }
    case 'removed': {
      const entries = state.entries.filter((entry) => entry.key !== action.key);
      const next = { ...state, entries };
      return state.activeKey === action.key ? open(next, null) : next;
    }
  }
}
