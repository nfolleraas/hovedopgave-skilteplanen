import { afterEach, describe, expect, mock, test } from 'bun:test';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { roadSearchService } from '../../../../api/road-search.api.js';
import { renderWithProviders } from '../../../../test/render.js';
import { MapStep } from './map-step.js';
import { roadOwnershipId } from './selected-road-ids.js';

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
    const onNext = mock();
    renderWithProviders(
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
