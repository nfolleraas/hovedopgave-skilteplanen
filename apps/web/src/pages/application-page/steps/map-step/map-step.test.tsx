import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { roadSearchService } from '../../../../api/road-search.api.js';
import { FakeAreasApi } from '../../../../test/fake-areas-api.js';
import { renderWithProviders } from '../../../../test/render.js';
import type {
  AreaApplication,
  RoadSearchResult,
} from '../../../../types/area.types.js';
import { MapStep } from './map-step.js';

// Functional tests for the map step (UC-034 step 1-3): the applicant searches
// roads, selects them, chooses road status and creates one area per road.

const application: AreaApplication = {
  caseNumber: 'APP-1',
  type: 'ExcavationPermit',
  status: 'Draft',
};

const roads: RoadSearchResult[] = [
  { id: 'r1', roadName: 'Strandvej', postalCode: '5000', city: 'Odense C' },
  { id: 'r2', roadName: 'Strandvejen', postalCode: '2900', city: 'Hellerup' },
];

const originalSearch = roadSearchService.search;
let api: FakeAreasApi;
let searchMock: ReturnType<typeof mock>;

function renderMapStep(existingAreaCount = 0) {
  const props = {
    onAreasCreated: mock(),
    onAddManually: mock(),
    onBack: mock(),
    onNext: mock(),
  };
  renderWithProviders(
    <MapStep
      application={application}
      existingAreaCount={existingAreaCount}
      {...props}
    />,
  );
  return { ...props, user: userEvent.setup() };
}

async function searchAndSelect(
  user: ReturnType<typeof userEvent.setup>,
  query: string,
  roadName: string,
) {
  await user.type(screen.getByRole('combobox', { name: /Søg vej/ }), query);
  const option = await screen.findByRole('option', {
    name: new RegExp(`^${roadName}\\b`),
  });
  await user.click(option);
}

async function chooseOwnership(
  user: ReturnType<typeof userEvent.setup>,
  index: number,
  label: string,
) {
  const selects = screen.getAllByRole('combobox', { name: /^Vejstatus/ });
  await user.click(selects[index]);
  await user.click(await screen.findByRole('option', { name: label }));
}

beforeEach(() => {
  api = new FakeAreasApi().install();
  searchMock = mock(async () => roads);
  roadSearchService.search = searchMock;
});

afterEach(() => {
  api.restore();
  roadSearchService.search = originalSearch;
});

describe('map step (UC-034)', () => {
  test('creates one area per selected road and continues', async () => {
    const { user, onAreasCreated, onNext } = renderMapStep();

    await searchAndSelect(user, 'Strandvej', 'Strandvej');
    await searchAndSelect(user, 'n', 'Strandvejen');
    await chooseOwnership(user, 0, 'Kommunevej');
    await chooseOwnership(user, 1, 'Privat fællesvej');
    await user.click(screen.getByRole('button', { name: 'Næste' }));

    await waitFor(() => expect(onNext).toHaveBeenCalledTimes(1));
    expect(api.requests).toEqual([
      {
        method: 'POST',
        path: '/api/areas/bulk',
        body: {
          applicationId: 'APP-1',
          areas: [
            {
              roadName: 'Strandvej',
              roadOwnership: 'Municipality',
              postalCode: '5000',
            },
            {
              roadName: 'Strandvejen',
              roadOwnership: 'Private',
              postalCode: '2900',
            },
          ],
        },
      },
    ]);
    const [created] = onAreasCreated.mock.calls[0];
    expect(created.map((area: { roadName: string }) => area.roadName)).toEqual([
      'Strandvej',
      'Strandvejen',
    ]);
  });

  test('searches for what the applicant types', async () => {
    const { user } = renderMapStep();

    await user.type(
      screen.getByRole('combobox', { name: /Søg vej/ }),
      'Strandvej 5000',
    );

    await screen.findByRole('option', { name: /^Strandvej\b/ });
    expect(searchMock).toHaveBeenLastCalledWith('Strandvej 5000');
    expect(screen.getByText(/2 veje fundet/)).toBeTruthy();
  });

  test('a road can be selected with the keyboard', async () => {
    const { user } = renderMapStep();

    await user.type(screen.getByRole('combobox', { name: /Søg vej/ }), 'S');
    await screen.findByRole('option', { name: /^Strandvej\b/ });
    await user.keyboard('{ArrowDown}{Enter}');

    const selected = screen.getByRole('region', { name: 'Valgte veje' });
    expect(within(selected).getByText('Strandvejen')).toBeTruthy();
  });

  test('requires a road status before areas are created (F3)', async () => {
    const { user, onNext } = renderMapStep();

    await searchAndSelect(user, 'Strandvej', 'Strandvej');
    await user.click(screen.getByRole('button', { name: 'Næste' }));

    expect(
      await screen.findByText(
        'Vælg om vejen er en kommunevej eller privat fællesvej.',
      ),
    ).toBeTruthy();
    expect(api.requests).toEqual([]);
    expect(onNext).not.toHaveBeenCalled();
  });

  test('a road is only selected once', async () => {
    const { user } = renderMapStep();

    await searchAndSelect(user, 'Strandvej', 'Strandvej');
    await user.click(
      screen.getByRole('option', { name: /^Strandvej · valgt/ }),
    );

    const selected = screen.getByRole('region', { name: 'Valgte veje' });
    expect(within(selected).getAllByText('Strandvej')).toHaveLength(1);
  });

  test('a selected road can be removed again', async () => {
    const { user } = renderMapStep();

    await searchAndSelect(user, 'Strandvej', 'Strandvej');
    await user.click(screen.getByRole('button', { name: 'Fjern Strandvej' }));

    expect(
      screen.getByText('Du har ikke valgt nogen veje endnu.'),
    ).toBeTruthy();
  });

  test('Næste is disabled until a road is selected', () => {
    renderMapStep();

    const next = screen.getByRole('button', { name: 'Næste' });
    expect(next.hasAttribute('disabled')).toBe(true);
  });

  test('with existing areas, Næste continues without creating new ones', async () => {
    const { user, onNext } = renderMapStep(2);

    await user.click(screen.getByRole('button', { name: 'Næste' }));

    expect(onNext).toHaveBeenCalledTimes(1);
    expect(api.requests).toEqual([]);
  });

  test('shows an error and stays when the areas cannot be created', async () => {
    const { user, onNext } = renderMapStep();
    api.failNext(500);

    await searchAndSelect(user, 'Strandvej', 'Strandvej');
    await chooseOwnership(user, 0, 'Kommunevej');
    await user.click(screen.getByRole('button', { name: 'Næste' }));

    expect(
      await screen.findByText(/Områderne kunne ikke oprettes/),
    ).toBeTruthy();
    expect(onNext).not.toHaveBeenCalled();
    // The selection is kept, so the applicant can try again.
    const selected = screen.getByRole('region', { name: 'Valgte veje' });
    expect(within(selected).getByText('Strandvej')).toBeTruthy();
  });

  test('tells the applicant when no roads are found', async () => {
    searchMock.mockImplementation(async () => []);
    const { user } = renderMapStep();

    await user.type(screen.getByRole('combobox', { name: /Søg vej/ }), 'xyz');

    expect(await screen.findByText('Ingen veje fundet')).toBeTruthy();
  });

  test('suggests adding the road manually when the search fails', async () => {
    searchMock.mockImplementation(async () => {
      throw new Error('offline');
    });
    const { user } = renderMapStep();

    await user.type(screen.getByRole('combobox', { name: /Søg vej/ }), 'S');

    expect(
      await screen.findByText(/Vejsøgningen virker ikke lige nu/),
    ).toBeTruthy();
  });

  test('"Opret vej manuelt" opens a manual road (A3)', async () => {
    const { user, onAddManually } = renderMapStep();

    await user.click(
      screen.getByRole('button', { name: '+ Opret vej manuelt' }),
    );

    expect(onAddManually).toHaveBeenCalledTimes(1);
  });
});
