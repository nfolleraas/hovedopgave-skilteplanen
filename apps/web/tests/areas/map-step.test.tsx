import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { roadSearchService } from '../../src/api/road-search.api.js';
import { MapStep } from '../../src/pages/application-page/steps/map-step/map-step.js';
import { roadOwnershipId } from '../../src/pages/application-page/steps/map-step/selected-road-ids.js';
import { renderWithTranslations } from '../renderWithTranslations';

const originalSearch = roadSearchService.search;

afterEach(() => {
  roadSearchService.search = originalSearch;
});

describe('MapStep', () => {
  test('Next without a road status shows the error and focuses the field', async () => {
    const user = userEvent.setup();
    roadSearchService.search = async () => [
      {
        id: 'road-1',
        roadName: 'Strandvej',
        postalCode: '5000',
        city: 'Odense C',
      },
    ];
    const onNext = vi.fn();
    await renderWithTranslations(
      <MapStep
        application={{
          caseNumber: 'APP-1',
          type: 'ExcavationPermit',
          status: 'Draft',
        }}
        existingAreaCount={0}
        onAddManually={() => {}}
        onAreasCreated={() => {}}
        onBack={() => {}}
        onNext={onNext}
      />,
      'da',
    );

    await user.type(
      screen.getByRole('combobox', { name: 'Søg vej' }),
      'Strand',
    );
    await user.click(await screen.findByRole('option', { name: /Strandvej/ }));
    await user.click(screen.getByRole('button', { name: 'Næste' }));

    expect(
      screen.getByText(
        'Vælg om vejen er en kommunevej eller privat fællesvej.',
      ),
    ).toBeTruthy();
    expect(document.activeElement?.id).toBe(roadOwnershipId('road-1'));
    expect(onNext).not.toHaveBeenCalled();
  });
});
