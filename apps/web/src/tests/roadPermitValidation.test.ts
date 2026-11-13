// @vitest-environment node
import { createInstance } from 'i18next';
import { beforeAll, describe, expect, it } from 'vitest';
import en from '../../locales/en/translation.json';
import {
  emptyMaterialDraft,
  type UsageDetails,
} from '../pages/application-page/create-road-permit/formTypes';
import {
  hasMaterialDraft,
  validateContactInformation,
  validateUsageDetails,
} from '../pages/application-page/create-road-permit/validation';

const i18n = createInstance();
beforeAll(async () => {
  await i18n.init({ lng: 'en', resources: { en: { translation: en } } });
});

const usage: UsageDetails = {
  usage: 'Byggearbejde',
  startDate: '2026-11-16',
  endDate: '2026-11-18',
  road: 'Adamsgade',
  houseNumberFrom: '5A',
  houseNumberTo: '31',
  postalCode: '5000',
  city: 'Odense C',
  locationDescription: '',
};

describe('Road permit validation', () => {
  it('accepts valid dates and alphanumeric house numbers', () => {
    const errors = validateUsageDetails(usage, i18n.t);
    expect(Object.values(errors).filter(Boolean)).toEqual([]);
  });

  it('reports an end date before the start and a reversed house-number range', () => {
    const errors = validateUsageDetails(
      { ...usage, endDate: '2026-11-15', houseNumberTo: '2' },
      i18n.t,
    );

    expect(errors.endDate).toBe(en.permit.errors.dateOrder);
    expect(errors.houseNumberTo).toBe(en.permit.errors.houseNumberOrder);
  });

  it('requires the first house number when the end of the range is provided', () => {
    const errors = validateUsageDetails(
      { ...usage, houseNumberFrom: '' },
      i18n.t,
    );
    expect(errors.houseNumberFrom).toBe(en.permit.errors.houseNumberMissing);
  });

  it('requires a road, a four-digit postal code, and a city', () => {
    const errors = validateUsageDetails(
      { ...usage, road: ' ', postalCode: 'DK-5000', city: '' },
      i18n.t,
    );

    expect(errors.road).toBe(en.permit.errors.road);
    expect(errors.postalCode).toBe(en.permit.errors.postalCode);
    expect(errors.city).toBe(en.permit.errors.city);
  });

  it('accepts formatted international phone numbers and rejects invalid contact details', () => {
    const valid = validateContactInformation(
      {
        name: 'Test Contact',
        phone: '+45 12 34 56 78',
        email: 'test@example.com',
      },
      i18n.t,
    );
    expect(Object.values(valid).filter(Boolean)).toEqual([]);

    const invalid = validateContactInformation(
      { name: ' ', phone: '1234', email: 'test@' },
      i18n.t,
    );
    expect(invalid).toEqual({
      name: en.permit.errors.contactName,
      phone: en.permit.errors.contactPhone,
      email: en.permit.errors.contactEmail,
    });
  });

  it('recognizes edited and unfinished materials while allowing an empty draft', () => {
    expect(hasMaterialDraft(emptyMaterialDraft)).toBe(false);
    expect(hasMaterialDraft({ ...emptyMaterialDraft, notes: '  ' })).toBe(
      false,
    );
    expect(hasMaterialDraft({ ...emptyMaterialDraft, quantity: '2' })).toBe(
      true,
    );
    expect(
      hasMaterialDraft({ ...emptyMaterialDraft, editingId: 'existing' }),
    ).toBe(true);
  });
});
