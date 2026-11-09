import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useReducer, useRef } from 'react';
import {
  areaEditReducer,
  initialAreaEditState,
} from '../../../../features/areas/area-edit-state.js';
import { buildArea, FakeAreasApi } from '../../../../test/fake-areas-api.js';
import { renderWithProviders } from '../../../../test/render.js';
import type { Area, AreaApplication } from '../../../../types/area.types.js';
import { AreasStep, type LeaveGuard } from './areas-step.js';

// Functional tests for the areas step: filling in areas (UC-034 step 5),
// manual roads (UC-034 A3), updating (UC-036) and deleting (UC-035).

type User = ReturnType<typeof userEvent.setup>;

const excavation: AreaApplication = {
  caseNumber: 'APP-1',
  type: 'ExcavationPermit',
  status: 'Draft',
};

/** A road from the search, before the applicant fills in details. */
const strandvej = buildArea('a1');

const havnegade = buildArea('a2', {
  roadName: 'Havnegade',
  roadOwnership: 'Private',
  houseNumberFrom: '2',
  houseNumberTo: '8',
  roadSection: 'Lane',
  roadSide: 'Left',
  direction: 'Across',
  lengthInMeters: 10,
  widthInMeters: 2,
  depthInMeters: 1,
  areaInSquareMeters: 20,
});

let api: FakeAreasApi;

function AreasHarness({
  application,
  areas,
  onBack,
  onNext,
}: {
  application: AreaApplication;
  areas: Area[];
  onBack: () => void;
  onNext: () => void;
}) {
  // Like the application page: areas are loaded once, then edited here.
  const [state, dispatch] = useReducer(
    areaEditReducer,
    areaEditReducer(initialAreaEditState, { type: 'loaded', areas }),
  );
  const leaveGuard = useRef<LeaveGuard | null>(null);
  return (
    <AreasStep
      application={application}
      dispatch={dispatch}
      leaveGuard={leaveGuard}
      onBack={onBack}
      onNext={onNext}
      state={state}
    />
  );
}

function renderAreasStep(areas: Area[], application = excavation) {
  api.seed(...areas);
  const onBack = mock();
  const onNext = mock();
  renderWithProviders(
    <AreasHarness
      application={application}
      areas={areas}
      onBack={onBack}
      onNext={onNext}
    />,
  );
  return { onBack, onNext, user: userEvent.setup() };
}

function field(label: string): HTMLInputElement {
  return screen.getByLabelText(new RegExp(`^${label}`)) as HTMLInputElement;
}

async function choose(user: User, label: string, option: string) {
  await user.click(screen.getByRole('combobox', { name: new RegExp(label) }));
  await user.click(await screen.findByRole('option', { name: option }));
}

async function type(user: User, label: string, value: string) {
  await user.clear(field(label));
  await user.type(field(label), value);
}

async function fillExcavationDetails(user: User) {
  await type(user, 'Husnr\\. fra', '10');
  await type(user, 'Husnr\\. til', '24');
  await choose(user, '^Vejelement', 'Fortov');
  await choose(user, '^Vejside', 'Højre');
  await choose(user, '^Retning', 'På langs');
  await type(user, 'Længde', '18');
  await type(user, 'Bredde', '0,6');
  await type(user, 'Dybde', '1,2');
}

beforeEach(() => {
  api = new FakeAreasApi().install();
});

afterEach(() => {
  api.restore();
});

describe('fill in a searched road (UC-034 step 5)', () => {
  test('saves the details and shows a confirmation', async () => {
    const { user } = renderAreasStep([strandvej]);
    expect(screen.getByText('mangler oplysninger')).toBeTruthy();

    await user.click(
      screen.getByRole('button', { name: 'Redigér Område 1 Strandvej' }),
    );
    await fillExcavationDetails(user);
    expect(field('Areal').value).toBe('10,8');
    await user.click(screen.getByRole('button', { name: 'Gem område' }));

    expect(await screen.findByText('Område 1 Strandvej er gemt.')).toBeTruthy();
    expect(api.requests).toEqual([
      {
        method: 'PATCH',
        path: '/api/areas/a1',
        body: {
          houseNumberFrom: '10',
          houseNumberTo: '24',
          alternativeDescription: null,
          roadSection: 'Pavement',
          roadSectionDescription: null,
          roadSide: 'Right',
          lengthInMeters: 18,
          widthInMeters: 0.6,
          direction: 'Along',
          depthInMeters: 1.2,
        },
      },
    ]);
    expect(screen.queryByText('mangler oplysninger')).toBeNull();
  });

  test('a searched road cannot be renamed', async () => {
    const { user } = renderAreasStep([strandvej]);

    await user.click(
      screen.getByRole('button', { name: 'Redigér Område 1 Strandvej' }),
    );

    expect(screen.queryByLabelText(/^Vejnavn/)).toBeNull();
    expect(screen.queryByLabelText(/^Postnr\./)).toBeNull();
  });

  test('shows what is missing and sends nothing', async () => {
    const { user } = renderAreasStep([strandvej]);

    await user.click(
      screen.getByRole('button', { name: 'Redigér Område 1 Strandvej' }),
    );
    await type(user, 'Længde', '0');
    await user.click(screen.getByRole('button', { name: 'Gem område' }));

    expect(screen.getAllByText('Skal udfyldes').length).toBeGreaterThan(0);
    expect(screen.getByText('Skal være et tal større end 0')).toBeTruthy();
    expect(
      screen.getAllByText(
        'Udfyld husnr. fra og til eller en alternativ beskrivelse',
      ),
    ).toHaveLength(3);
    expect(api.requests).toEqual([]);
  });

  test('an alternative description replaces house numbers (F1)', async () => {
    const { user } = renderAreasStep([strandvej]);

    await user.click(
      screen.getByRole('button', { name: 'Redigér Område 1 Strandvej' }),
    );
    await fillExcavationDetails(user);
    await user.clear(field('Husnr\\. fra'));
    await user.clear(field('Husnr\\. til'));
    await type(user, 'Alternativ beskrivelse', 'Ud for havnen');
    await user.click(screen.getByRole('button', { name: 'Gem område' }));

    await waitFor(() => expect(api.requests).toHaveLength(1));
    expect(api.requests[0].body).toMatchObject({
      houseNumberFrom: null,
      houseNumberTo: null,
      alternativeDescription: 'Ud for havnen',
    });
  });

  test('road element Other asks for a description', async () => {
    const { user } = renderAreasStep([strandvej]);

    await user.click(
      screen.getByRole('button', { name: 'Redigér Område 1 Strandvej' }),
    );
    await fillExcavationDetails(user);
    await choose(user, '^Vejelement', 'Andet');
    await type(user, 'Beskriv vejelement', 'Parkeringsplads');
    await user.click(screen.getByRole('button', { name: 'Gem område' }));

    await waitFor(() => expect(api.requests).toHaveLength(1));
    expect(api.requests[0].body).toMatchObject({
      roadSection: 'Other',
      roadSectionDescription: 'Parkeringsplads',
    });
  });

  test('road use applications have no direction or depth (A1)', async () => {
    const { user } = renderAreasStep([strandvej], {
      ...excavation,
      type: 'RoadUsePermit',
    });

    await user.click(
      screen.getByRole('button', { name: 'Redigér Område 1 Strandvej' }),
    );

    expect(screen.queryByRole('combobox', { name: /^Retning/ })).toBeNull();
    expect(screen.queryByLabelText(/^Dybde/)).toBeNull();
  });

  test('keeps the input when the server refuses the change', async () => {
    const { user } = renderAreasStep([strandvej]);
    api.failNext(409, { code: 'APPLICATION_NOT_EDITABLE' });

    await user.click(
      screen.getByRole('button', { name: 'Redigér Område 1 Strandvej' }),
    );
    await fillExcavationDetails(user);
    await user.click(screen.getByRole('button', { name: 'Gem område' }));

    expect(
      await screen.findByText(/Områder kan kun ændres, mens ansøgningen/),
    ).toBeTruthy();
    expect(field('Husnr\\. fra').value).toBe('10');
  });
});

describe('add a road manually (UC-034 A3)', () => {
  test('creates the road with its details', async () => {
    const { user } = renderAreasStep([havnegade]);

    await user.click(
      screen.getByRole('button', { name: '+ Opret vej manuelt' }),
    );
    expect(screen.getByText('Område 2 Ny vej')).toBeTruthy();
    await type(user, 'Vejnavn', 'Bryggen');
    await type(user, 'Postnr\\.', '5200');
    await choose(user, '^Vejstatus', 'Privat fællesvej');
    await fillExcavationDetails(user);
    await user.click(screen.getByRole('button', { name: 'Gem område' }));

    expect(await screen.findByText('Område 2 Bryggen er gemt.')).toBeTruthy();
    expect(api.requests).toHaveLength(1);
    expect(api.requests[0]).toMatchObject({
      method: 'POST',
      path: '/api/areas',
      body: {
        applicationId: 'APP-1',
        roadName: 'Bryggen',
        roadOwnership: 'Private',
        postalCode: '5200',
        houseNumberFrom: '10',
        lengthInMeters: 18,
      },
    });
  });

  test('checks the road fields of a manual road', async () => {
    const { user } = renderAreasStep([havnegade]);

    await user.click(
      screen.getByRole('button', { name: '+ Opret vej manuelt' }),
    );
    await type(user, 'Postnr\\.', '52');
    await user.click(screen.getByRole('button', { name: 'Gem område' }));

    expect(screen.getByText('Skal være 4 cifre')).toBeTruthy();
    expect(api.requests).toEqual([]);
  });

  test('cancelling removes the new road again', async () => {
    const { user } = renderAreasStep([havnegade]);

    await user.click(
      screen.getByRole('button', { name: '+ Opret vej manuelt' }),
    );
    await user.click(screen.getByRole('button', { name: 'Annuller' }));

    expect(screen.queryByText('Område 2 Ny vej')).toBeNull();
  });
});

describe('update area (UC-036)', () => {
  test('Annuller restores the saved values', async () => {
    const { user } = renderAreasStep([havnegade]);

    await user.click(
      screen.getByRole('button', { name: 'Redigér Område 1 Havnegade' }),
    );
    await type(user, 'Længde', '99');
    await user.click(screen.getByRole('button', { name: 'Annuller' }));

    expect(field('Længde').value).toBe('10');
    expect(api.requests).toEqual([]);
  });

  test('asks before opening another area over unsaved changes', async () => {
    const { user } = renderAreasStep([havnegade, strandvej]);

    await user.click(
      screen.getByRole('button', { name: 'Redigér Område 1 Havnegade' }),
    );
    await type(user, 'Længde', '25');
    await user.click(
      screen.getByRole('button', { name: 'Redigér Område 2 Strandvej' }),
    );

    const dialog = await screen.findByRole('dialog', {
      name: 'Gem ændringerne?',
    });
    await user.click(within(dialog).getByRole('button', { name: 'Gem' }));

    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Redigér Område 2 Strandvej' }),
      ).toBeNull(),
    );
    expect(api.requests).toEqual([
      expect.objectContaining({
        method: 'PATCH',
        path: '/api/areas/a2',
        body: expect.objectContaining({ lengthInMeters: 25 }),
      }),
    ]);
    expect(api.stored('a2')?.areaInSquareMeters).toBe(50);
  });

  test('discarding changes opens the other area without saving', async () => {
    const { user } = renderAreasStep([havnegade, strandvej]);

    await user.click(
      screen.getByRole('button', { name: 'Redigér Område 1 Havnegade' }),
    );
    await type(user, 'Længde', '25');
    await user.click(
      screen.getByRole('button', { name: 'Redigér Område 2 Strandvej' }),
    );
    const dialog = await screen.findByRole('dialog');
    await user.click(
      within(dialog).getByRole('button', { name: 'Kassér ændringer' }),
    );

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Redigér Område 1 Havnegade' }),
      ).toBeTruthy(),
    );
    expect(field('Længde').value).toBe('');
    expect(api.requests).toEqual([]);
  });
});

describe('delete area (UC-035)', () => {
  test('deletes an area after confirmation', async () => {
    const { user } = renderAreasStep([havnegade, strandvej]);

    await user.click(
      screen.getByRole('button', { name: 'Slet Område 2 Strandvej' }),
    );
    const dialog = await screen.findByRole('dialog', { name: 'Slet område?' });
    expect(within(dialog).getByText('Strandvej')).toBeTruthy();
    await user.click(within(dialog).getByRole('button', { name: 'Slet' }));

    expect(
      await screen.findByText('Området på Strandvej er slettet.'),
    ).toBeTruthy();
    expect(api.requests).toEqual([
      { method: 'DELETE', path: '/api/areas/a1', body: undefined },
    ]);
    expect(screen.queryByText(/Område 2 Strandvej/)).toBeNull();
  });

  test('Annuller in the dialog keeps the area', async () => {
    const { user } = renderAreasStep([havnegade, strandvej]);

    await user.click(
      screen.getByRole('button', { name: 'Slet Område 2 Strandvej' }),
    );
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Annuller' }));

    // Not waiting for the dialog to close: in happy-dom, waitFor blocks
    // while MUI's close animation runs.
    expect(screen.getByText('Område 2 Strandvej')).toBeTruthy();
    expect(document.activeElement?.id).toBe('area-a1-delete');
    expect(api.requests).toEqual([]);
  });

  test('the last area cannot be deleted (F1)', async () => {
    const { user } = renderAreasStep([havnegade]);

    await user.click(
      screen.getByRole('button', { name: 'Slet Område 1 Havnegade' }),
    );

    expect(
      screen.getByText('Der skal være mindst ét område på ansøgningen.'),
    ).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(api.requests).toEqual([]);
  });

  test('shows the server error in the dialog', async () => {
    const { user } = renderAreasStep([havnegade, strandvej]);
    api.failNext(400, { code: 'LAST_AREA' });

    await user.click(
      screen.getByRole('button', { name: 'Slet Område 2 Strandvej' }),
    );
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Slet' }));

    expect(
      await within(dialog).findByText(
        'Der skal være mindst ét område på ansøgningen.',
      ),
    ).toBeTruthy();
  });
});

describe('leaving the step', () => {
  test('Næste is blocked while an area is missing information', async () => {
    const { user, onNext } = renderAreasStep([havnegade, strandvej]);

    await user.click(screen.getByRole('button', { name: 'Næste' }));

    const summary = await screen.findByRole('alert');
    expect(
      within(summary).getByText('Du kan ikke gå videre endnu'),
    ).toBeTruthy();
    expect(
      within(summary).getByText(/^Område 2 Strandvej mangler: Husnr\. fra/),
    ).toBeTruthy();
    // The first area that blocks the step opens with its errors.
    expect(field('Husnr\\. fra')).toBeTruthy();
    expect(onNext).not.toHaveBeenCalled();
  });

  test('Næste continues when every area is complete', async () => {
    const { user, onNext } = renderAreasStep([havnegade]);

    await user.click(screen.getByRole('button', { name: 'Næste' }));

    await waitFor(() => expect(onNext).toHaveBeenCalledTimes(1));
    expect(api.requests).toEqual([]);
  });

  test('Næste saves the open area first', async () => {
    const { user, onNext } = renderAreasStep([havnegade]);

    await user.click(
      screen.getByRole('button', { name: 'Redigér Område 1 Havnegade' }),
    );
    await type(user, 'Bredde', '3');
    await user.click(screen.getByRole('button', { name: 'Næste' }));

    await waitFor(() => expect(onNext).toHaveBeenCalledTimes(1));
    expect(api.requests).toHaveLength(1);
    expect(api.requests[0].body).toMatchObject({ widthInMeters: 3 });
  });

  test('Tilbage keeps the applicant on the step when the open area is invalid', async () => {
    const { user, onBack } = renderAreasStep([havnegade]);

    await user.click(
      screen.getByRole('button', { name: 'Redigér Område 1 Havnegade' }),
    );
    await user.clear(field('Bredde'));
    await user.click(screen.getByRole('button', { name: 'Tilbage' }));

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(onBack).not.toHaveBeenCalled();
    expect(api.requests).toEqual([]);
  });
});

test('areas cannot be changed when the application is not editable (F2)', () => {
  renderAreasStep([havnegade, strandvej], {
    ...excavation,
    status: 'InProgress',
  });

  expect(
    screen.getByText(/Områder kan kun ændres, mens ansøgningen/),
  ).toBeTruthy();
  expect(screen.queryByRole('button', { name: /^Redigér/ })).toBeNull();
  expect(screen.queryByRole('button', { name: /^Slet/ })).toBeNull();
  expect(
    screen.queryByRole('button', { name: '+ Opret vej manuelt' }),
  ).toBeNull();
});
