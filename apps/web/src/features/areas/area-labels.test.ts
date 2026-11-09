import { describe, expect, test } from 'bun:test';
import da from '../../../locales/da/translation.json';
import en from '../../../locales/en/translation.json';
import {
  applicationTypeLabelKeys,
  areaFieldLabelKeys,
  directionLabelKeys,
  roadOwnershipLabelKeys,
  roadSectionLabelKeys,
  roadSideLabelKeys,
} from './area-labels.js';

function lookup(translations: unknown, key: string): unknown {
  return key
    .split('.')
    .reduce<unknown>(
      (node, part) =>
        node && typeof node === 'object'
          ? (node as Record<string, unknown>)[part]
          : undefined,
      translations,
    );
}

const labelMaps = {
  roadOwnership: roadOwnershipLabelKeys,
  roadSection: roadSectionLabelKeys,
  roadSide: roadSideLabelKeys,
  direction: directionLabelKeys,
  applicationType: applicationTypeLabelKeys,
  areaField: areaFieldLabelKeys,
};

describe('area labels', () => {
  for (const [name, labels] of Object.entries(labelMaps)) {
    test(`every ${name} label has Danish and English text`, () => {
      const missing = Object.values(labels).flatMap((key) =>
        [
          ['da', da],
          ['en', en],
        ]
          .filter(([, translations]) => {
            const text = lookup(translations, key);
            return typeof text !== 'string' || text.trim() === '';
          })
          .map(([language]) => `${language}: ${key}`),
      );
      expect(missing).toEqual([]);
    });
  }
});
