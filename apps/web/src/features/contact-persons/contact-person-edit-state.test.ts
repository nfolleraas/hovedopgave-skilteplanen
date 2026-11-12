import { describe, expect, test } from 'bun:test';
import type { ContactPerson } from '../../types/contact-person.types.js';
import { Availability } from '../../types/prisma-enums.js';
import {
  type ContactPersonEditAction,
  type ContactPersonEditState,
  contactPersonEditReducer,
  initialContactPersonEditState,
  isDirty,
} from './contact-person-edit-state.js';

function buildContactPerson(
  uuid: string,
  overrides: Partial<ContactPerson> = {},
): ContactPerson {
  return {
    uuid,
    applicationId: 'APP-1',
    name: 'Jens Jensen',
    availability: Availability.Day,
    phoneNumber: '12345678',
    email: 'jens@example.com',
    ...overrides,
  };
}

function reduce(
  actions: ContactPersonEditAction[],
  start: ContactPersonEditState = initialContactPersonEditState,
): ContactPersonEditState {
  return actions.reduce(contactPersonEditReducer, start);
}

describe('contactPersonEditReducer', () => {
  test('loaded replaces the entries with the saved contact persons', () => {
    const state = reduce([
      { type: 'loaded', contactPersons: [buildContactPerson('a')] },
    ]);

    expect(state.entries).toHaveLength(1);
    expect(state.entries[0]).toMatchObject({ key: 'a' });
    expect(state.activeKey).toBeNull();
  });

  test('addNew opens an empty form with a temporary key', () => {
    const state = reduce([{ type: 'addNew' }]);

    expect(state.entries).toHaveLength(1);
    expect(state.activeKey).toBe('new-1');
    expect(state.draft).toMatchObject({ name: '', phoneNumber: '' });
  });

  test('saved swaps the temporary key for the stored uuid', () => {
    const state = reduce([
      { type: 'addNew' },
      { type: 'saved', key: 'new-1', contactPerson: buildContactPerson('a') },
    ]);

    expect(state.entries[0]).toMatchObject({ key: 'a' });
    expect(state.activeKey).toBe('a');
    expect(isDirty(state)).toBe(false);
  });

  test('change marks the draft dirty and cancel restores it (UC-033 A4)', () => {
    const loaded = reduce([
      { type: 'loaded', contactPersons: [buildContactPerson('a')] },
      { type: 'open', key: 'a' },
      { type: 'change', field: 'name', value: 'Ny Kontakt' },
    ]);
    expect(isDirty(loaded)).toBe(true);

    const cancelled = reduce([{ type: 'cancel' }], loaded);
    expect(isDirty(cancelled)).toBe(false);
    expect(cancelled.draft?.name).toBe('Jens Jensen');
  });

  test('cancel removes a new contact person that was never saved', () => {
    const state = reduce([{ type: 'addNew' }, { type: 'cancel' }]);

    expect(state.entries).toHaveLength(0);
    expect(state.activeKey).toBeNull();
  });

  test('open over unsaved changes waits for the dialog (UC-032 A1)', () => {
    const dirty = reduce([
      {
        type: 'loaded',
        contactPersons: [buildContactPerson('a'), buildContactPerson('b')],
      },
      { type: 'open', key: 'a' },
      { type: 'change', field: 'name', value: 'Ny Kontakt' },
      { type: 'open', key: 'b' },
    ]);
    expect(dirty.pendingKey).toBe('b');
    expect(dirty.activeKey).toBe('a');

    const discarded = reduce([{ type: 'discardAndOpenPending' }], dirty);
    expect(discarded.activeKey).toBe('b');
    expect(discarded.pendingKey).toBeNull();

    const kept = reduce([{ type: 'cancelPending' }], dirty);
    expect(kept.activeKey).toBe('a');
    expect(kept.pendingKey).toBeNull();
  });

  test('removed drops the entry and closes it when it was open', () => {
    const state = reduce([
      { type: 'loaded', contactPersons: [buildContactPerson('a')] },
      { type: 'open', key: 'a' },
      { type: 'removed', key: 'a' },
    ]);

    expect(state.entries).toHaveLength(0);
    expect(state.activeKey).toBeNull();
  });
});
