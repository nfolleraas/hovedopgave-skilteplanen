import { describe, expect, test } from 'bun:test';
import type { Area } from '../../types/area.types.js';
import {
  type AreaEditState,
  areaEditReducer,
  getActiveEntry,
  initialAreaEditState,
  isDirty,
  isRoadEditable,
  nextManualKey,
} from './area-edit-state.js';

function buildArea(uuid: string, overrides: Partial<Area> = {}): Area {
  return {
    uuid,
    applicationId: 'APP-1',
    roadName: 'Strandvej',
    roadOwnership: 'Municipality',
    postalCode: '5000',
    houseNumberFrom: '10',
    houseNumberTo: '24',
    alternativeDescription: null,
    roadSection: 'Pavement',
    roadSectionDescription: null,
    roadSide: 'Right',
    direction: 'Along',
    lengthInMeters: 18,
    widthInMeters: 0.6,
    depthInMeters: 1.2,
    areaInSquareMeters: 10.8,
    ...overrides,
  };
}

function loaded(): AreaEditState {
  return areaEditReducer(initialAreaEditState, {
    type: 'loaded',
    areas: [buildArea('a1'), buildArea('a2', { roadName: 'Havnegade' })],
  });
}

describe('update area (UC-036)', () => {
  test('Redigér prefills the form from the saved area', () => {
    const state = areaEditReducer(loaded(), { type: 'open', key: 'a1' });
    expect(state.draft).toMatchObject({
      roadName: 'Strandvej',
      houseNumberFrom: '10',
      roadSection: 'Pavement',
      widthInMeters: '0,6',
      depthInMeters: '1,2',
    });
    expect(isDirty(state)).toBe(false);
  });

  test('Annuller restores the saved values', () => {
    let state = areaEditReducer(loaded(), { type: 'open', key: 'a1' });
    state = areaEditReducer(state, {
      type: 'change',
      field: 'lengthInMeters',
      value: '25',
    });
    expect(isDirty(state)).toBe(true);

    state = areaEditReducer(state, { type: 'cancel' });
    expect(state.draft?.lengthInMeters).toBe('18');
    expect(isDirty(state)).toBe(false);
    expect(state.activeKey).toBe('a1');
  });

  test('opening another area with unsaved changes asks first', () => {
    let state = areaEditReducer(loaded(), { type: 'open', key: 'a1' });
    state = areaEditReducer(state, {
      type: 'change',
      field: 'houseNumberTo',
      value: '30',
    });
    state = areaEditReducer(state, { type: 'open', key: 'a2' });
    expect(state.activeKey).toBe('a1');
    expect(state.pendingKey).toBe('a2');

    state = areaEditReducer(state, { type: 'discardAndOpenPending' });
    expect(state.activeKey).toBe('a2');
    expect(state.draft?.roadName).toBe('Havnegade');
  });

  test('searched roads are read-only, manual roads are editable', () => {
    let state = loaded();
    expect(isRoadEditable(state.entries[0])).toBe(false);

    state = areaEditReducer(state, { type: 'addManual' });
    const manual = getActiveEntry(state);
    expect(manual && isRoadEditable(manual)).toBe(true);
    expect(state.draft?.roadName).toBe('');
  });

  test('a saved manual area keeps its source and gets its uuid', () => {
    let state = areaEditReducer(loaded(), { type: 'addManual' });
    const tempKey = state.activeKey ?? '';
    state = areaEditReducer(state, {
      type: 'saved',
      key: tempKey,
      area: buildArea('a3', { roadName: 'Ny vej' }),
    });
    const saved = state.entries.find((entry) => entry.key === 'a3');
    expect(saved?.source).toBe('manual');
    expect(state.activeKey).toBe('a3');
  });

  test('closing removes an untouched manual area and collapses all', () => {
    let state = areaEditReducer(loaded(), { type: 'addManual' });
    state = areaEditReducer(state, { type: 'close' });
    expect(state.entries).toHaveLength(2);
    expect(state.activeKey).toBeNull();

    state = areaEditReducer(state, { type: 'open', key: 'a1' });
    state = areaEditReducer(state, { type: 'close' });
    expect(state.activeKey).toBeNull();
  });

  test('closing keeps an area with unsaved changes open', () => {
    let state = areaEditReducer(loaded(), { type: 'addManual' });
    state = areaEditReducer(state, {
      type: 'change',
      field: 'roadName',
      value: 'Ny vej',
    });
    state = areaEditReducer(state, { type: 'close' });
    expect(state.entries).toHaveLength(3);
    expect(state.draft?.roadName).toBe('Ny vej');
  });

  test('cancelling an unsaved manual area removes it', () => {
    let state = areaEditReducer(loaded(), { type: 'addManual' });
    state = areaEditReducer(state, { type: 'cancel' });
    expect(state.entries).toHaveLength(2);
    expect(state.activeKey).toBeNull();
  });
});

describe('create area (UC-034)', () => {
  test('roads from the map step are added collapsed as searched roads', () => {
    let state = areaEditReducer(loaded(), { type: 'open', key: 'a1' });
    state = areaEditReducer(state, {
      type: 'added',
      areas: [buildArea('a3', { roadName: 'Kirkestræde' })],
      source: 'search',
    });

    expect(state.entries.map((entry) => entry.key)).toEqual(['a1', 'a2', 'a3']);
    expect(state.entries[2]).toMatchObject({ source: 'search' });
    expect(state.activeKey).toBe('a1');
  });

  test('a manual area gets a temporary key until it is saved', () => {
    const before = loaded();
    expect(nextManualKey(before)).toBe('new-1');

    const state = areaEditReducer(before, { type: 'addManual' });
    expect(state.activeKey).toBe('new-1');
    expect(state.entries.at(-1)).toEqual({
      key: 'new-1',
      saved: null,
      source: 'manual',
    });
    expect(nextManualKey(state)).toBe('new-2');
  });

  test('adding a second manual area replaces an untouched one', () => {
    let state = areaEditReducer(loaded(), { type: 'addManual' });
    state = areaEditReducer(state, { type: 'addManual' });

    expect(state.entries.map((entry) => entry.key)).toEqual([
      'a1',
      'a2',
      'new-2',
    ]);
  });

  test('no manual area is added while the open area has unsaved changes', () => {
    let state = areaEditReducer(loaded(), { type: 'open', key: 'a1' });
    state = areaEditReducer(state, {
      type: 'change',
      field: 'houseNumberTo',
      value: '30',
    });

    expect(areaEditReducer(state, { type: 'addManual' })).toBe(state);
  });

  test('reloading keeps the source of manual areas saved earlier', () => {
    let state = areaEditReducer(loaded(), { type: 'addManual' });
    state = areaEditReducer(state, {
      type: 'saved',
      key: 'new-1',
      area: buildArea('a3', { roadName: 'Ny vej' }),
    });
    state = areaEditReducer(state, {
      type: 'loaded',
      areas: [
        buildArea('a1'),
        buildArea('a2'),
        buildArea('a3', { roadName: 'Ny vej' }),
      ],
    });

    expect(state.entries.map((entry) => entry.source)).toEqual([
      'search',
      'search',
      'manual',
    ]);
    // The open area stays open with the reloaded values.
    expect(state.activeKey).toBe('a3');
    expect(state.draft?.roadName).toBe('Ny vej');
  });
});

describe('editing state', () => {
  test('changes are ignored when no area is open', () => {
    const state = loaded();

    expect(
      areaEditReducer(state, { type: 'change', field: 'roadName', value: 'x' }),
    ).toBe(state);
    expect(isDirty(state)).toBe(false);
  });

  test('opening the open area again keeps the draft', () => {
    let state = areaEditReducer(loaded(), { type: 'open', key: 'a1' });
    state = areaEditReducer(state, {
      type: 'change',
      field: 'lengthInMeters',
      value: '25',
    });

    expect(areaEditReducer(state, { type: 'open', key: 'a1' })).toBe(state);
  });

  test('errors are shown after a save attempt and hidden for the next area', () => {
    let state = areaEditReducer(loaded(), { type: 'open', key: 'a1' });
    state = areaEditReducer(state, { type: 'showErrors' });
    expect(state.showErrors).toBe(true);

    state = areaEditReducer(state, { type: 'open', key: 'a2' });
    expect(state.showErrors).toBe(false);
  });

  test('"Fortsæt redigering" keeps the open area and its changes', () => {
    let state = areaEditReducer(loaded(), { type: 'open', key: 'a1' });
    state = areaEditReducer(state, {
      type: 'change',
      field: 'houseNumberTo',
      value: '30',
    });
    state = areaEditReducer(state, { type: 'open', key: 'a2' });
    state = areaEditReducer(state, { type: 'cancelPending' });

    expect(state.pendingKey).toBeNull();
    expect(state.activeKey).toBe('a1');
    expect(state.draft?.houseNumberTo).toBe('30');
  });

  test('saving with a pending area opens the pending area', () => {
    let state = areaEditReducer(loaded(), { type: 'open', key: 'a1' });
    state = areaEditReducer(state, {
      type: 'change',
      field: 'houseNumberTo',
      value: '30',
    });
    state = areaEditReducer(state, { type: 'open', key: 'a2' });
    state = areaEditReducer(state, {
      type: 'saved',
      key: 'a1',
      area: buildArea('a1', { houseNumberTo: '30' }),
    });

    expect(state.activeKey).toBe('a2');
    expect(state.pendingKey).toBeNull();
    expect(state.entries[0].saved?.houseNumberTo).toBe('30');
  });

  test('a saved area stays open and is no longer dirty', () => {
    let state = areaEditReducer(loaded(), { type: 'open', key: 'a1' });
    state = areaEditReducer(state, {
      type: 'change',
      field: 'lengthInMeters',
      value: '25',
    });
    state = areaEditReducer(state, {
      type: 'saved',
      key: 'a1',
      area: buildArea('a1', { lengthInMeters: 25 }),
    });

    expect(state.activeKey).toBe('a1');
    expect(state.draft?.lengthInMeters).toBe('25');
    expect(isDirty(state)).toBe(false);
  });
});

describe('delete area (UC-035)', () => {
  test('deleting the open area closes it', () => {
    let state = areaEditReducer(loaded(), { type: 'open', key: 'a1' });
    state = areaEditReducer(state, { type: 'removed', key: 'a1' });

    expect(state.entries.map((entry) => entry.key)).toEqual(['a2']);
    expect(state.activeKey).toBeNull();
    expect(state.draft).toBeNull();
  });

  test('deleting another area keeps the open area and its changes', () => {
    let state = areaEditReducer(loaded(), { type: 'open', key: 'a1' });
    state = areaEditReducer(state, {
      type: 'change',
      field: 'lengthInMeters',
      value: '25',
    });
    state = areaEditReducer(state, { type: 'removed', key: 'a2' });

    expect(state.activeKey).toBe('a1');
    expect(state.draft?.lengthInMeters).toBe('25');
  });
});
