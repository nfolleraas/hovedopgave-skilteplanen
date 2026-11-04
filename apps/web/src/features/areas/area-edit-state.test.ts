import { describe, expect, test } from 'bun:test';
import type { Area } from '../../types/area.types.js';
import {
  type AreaEditState,
  areaEditReducer,
  getActiveEntry,
  initialAreaEditState,
  isDirty,
  isRoadEditable,
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

  test('cancelling an unsaved manual area removes it', () => {
    let state = areaEditReducer(loaded(), { type: 'addManual' });
    state = areaEditReducer(state, { type: 'cancel' });
    expect(state.entries).toHaveLength(2);
    expect(state.activeKey).toBeNull();
  });
});
