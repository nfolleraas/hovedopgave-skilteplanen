import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { AxiosError } from 'axios';
import { createMemoryRouter, Link, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getActors, updateActor } from '../../src/api/actors.api';
import { getMunicipalities } from '../../src/api/municipalities.api';
import {
  createRoadPermitDraft,
  getRoadPermitDraft,
  getRoadPermitMaterialTypes,
  getRoadPermitTrafficChanges,
  listApplicationDrafts,
  saveRoadPermitDraft,
  submitRoadPermitApplication,
} from '../../src/api/roadPermit.api';
import { routes } from '../../src/app/router';
import ApplicationPage from '../../src/pages/application-page';
import CreateRoadPermitPage from '../../src/pages/application-page/create-road-permit';
import { renderWithTranslations } from '../renderWithTranslations';

vi.mock('../../src/api/roadPermit.api', () => ({
  createRoadPermitDraft: vi.fn(),
  getRoadPermitDraft: vi.fn(),
  getRoadPermitMaterialTypes: vi.fn(),
  getRoadPermitTrafficChanges: vi.fn(),
  listApplicationDrafts: vi.fn(),
  saveRoadPermitDraft: vi.fn(),
  submitRoadPermitApplication: vi.fn(),
}));

vi.mock('../../src/api/municipalities.api', () => ({
  getMunicipalities: vi.fn(),
}));

vi.mock('../../src/api/actors.api', () => ({
  getActors: vi.fn(),
  createActor: vi.fn(),
  updateActor: vi.fn(),
  deleteActor: vi.fn(),
}));

vi.mock('../../src/components/ui/map/DataforsyningenMap', () => ({
  /** Replaces the map so the workflow tests can enter the address manually. */
  DataforsyningenMap: () => null,
}));

const createDraft = vi.mocked(createRoadPermitDraft);
const loadMunicipalities = vi.mocked(getMunicipalities);
const loadMaterialTypes = vi.mocked(getRoadPermitMaterialTypes);
const loadTrafficChanges = vi.mocked(getRoadPermitTrafficChanges);
const loadDraft = vi.mocked(getRoadPermitDraft);
const listDrafts = vi.mocked(listApplicationDrafts);
const saveDraft = vi.mocked(saveRoadPermitDraft);
const submitApplication = vi.mocked(submitRoadPermitApplication);
const draftId = 'draft-123';

/** Renders the permit form and its redirect destination in a memory router. */
async function renderPermitFlow(
  initialEntry = `${routes.createRoadPermit}?draft=${draftId}`,
  waitForDraft = initialEntry.startsWith(routes.createRoadPermit),
  language: 'en' | 'da' = 'en',
) {
  const router = createMemoryRouter(
    [
      {
        path: routes.createRoadPermit,
        element: (
          <>
            <Link to={routes.application}>Application overview</Link>
            <CreateRoadPermitPage />
          </>
        ),
      },
      { path: routes.application, element: <ApplicationPage /> },
    ],
    { initialEntries: [initialEntry] },
  );
  const view = await renderWithTranslations(
    <RouterProvider router={router} />,
    language,
  );
  if (waitForDraft) {
    await screen.findByRole('heading', {
      name: language === 'da' ? 'Kommune & titel' : 'Municipality & title',
    });
  }
  return view;
}

/** Finds a button by its accessible name. */
function button(name: string | RegExp) {
  return screen.getByRole<HTMLButtonElement>('button', { name });
}

/** Advances the form through the visible Next button. */
async function next(user: UserEvent) {
  await user.click(button('Next'));
}

/** Enters a title, filters the municipalities, and selects Odense. */
async function chooseMunicipality(user: UserEvent) {
  await user.type(screen.getByRole('textbox', { name: /title/i }), 'Road work');
  await user.type(screen.getByRole('searchbox'), 'oden');
  await user.click(screen.getByRole('radio', { name: 'Odense' }));
}

/** Completes the municipality step and advances to usage details. */
async function advanceToUsage(user: UserEvent) {
  await chooseMunicipality(user);
  await next(user);
}

/** Completes the required steps and leaves the form on the submission summary. */
async function fillRequiredDetails(user: UserEvent) {
  await advanceToUsage(user);

  await user.click(screen.getByRole('combobox', { name: /type of use/i }));
  await user.click(screen.getByRole('option', { name: 'Construction work' }));
  fireEvent.change(screen.getByLabelText(/start date/i), {
    target: { value: '2026-11-16' },
  });
  fireEvent.change(screen.getByLabelText(/end date/i), {
    target: { value: '2026-11-18' },
  });
  await user.type(
    screen.getByRole('combobox', { name: /^road\b/i }),
    'Adamsgade',
  );
  await user.type(screen.getByLabelText(/house number from/i), '5');
  await user.type(screen.getByLabelText(/house number to/i), '31');
  await user.type(screen.getByLabelText(/postal code/i), '5000');
  await user.type(screen.getByLabelText(/^city\b/i), 'Odense C');
  await next(user);

  await user.click(screen.getByRole('combobox', { name: /material type/i }));
  await user.click(screen.getByRole('option', { name: 'Container' }));
  await user.click(button('Add material'));
  await next(user);

  expect(screen.getByRole('heading', { name: 'Actor' })).toBeTruthy();
  await next(user);
  await user.click(screen.getByRole('combobox', { name: 'Traffic changes' }));
  await user.click(
    screen.getByRole('option', { name: 'Stopping and parking' }),
  );
  await user.keyboard('{Escape}');
  await user.click(
    screen.getByRole('checkbox', { name: 'Type B', exact: true }),
  );
  await next(user);
  await next(user);
}

describe('Road permit application', () => {
  beforeEach(() => {
    vi.mocked(getActors)
      .mockReset()
      .mockResolvedValue([
        {
          uuid: 'actor-123',
          role: 'Private',
          name: 'Test Contact',
          phoneNumber: '12345678',
          email: 'test@example.com',
          cvrNumber: null,
          department: null,
          address: {
            uuid: 'address-123',
            street: 'Testvej',
            houseNumber: '1',
            postalCode: '5000',
            city: 'Odense',
          },
          contactPersons: [],
        },
      ]);
    loadMaterialTypes
      .mockReset()
      .mockResolvedValue([
        'Banner',
        'TemporarySign',
        'PermanentSign',
        'DrillingRig',
        'Container',
        'Crane',
        'Truck',
        'Lift',
        'OfficeCabin',
        'WelfareCabin',
        'TrenchlessUnit',
        'ReliningUnit',
        'Scaffolding',
        'LoadingTower',
        'Tent',
        'Stage',
        'Grandstand',
        'Other',
      ]);
    loadTrafficChanges.mockReset().mockResolvedValue(['NoStoppingAndParking']);
    loadMunicipalities.mockReset().mockResolvedValue([
      { id: 1, name: 'Albertslund' },
      { id: 2, name: 'Billund' },
      { id: 3, name: 'Odense' },
    ]);
    createDraft.mockReset().mockResolvedValue({ caseNumber: draftId });
    loadDraft.mockReset().mockResolvedValue({ status: 'loaded', draft: {} });
    listDrafts.mockReset().mockResolvedValue([]);
    saveDraft.mockReset().mockResolvedValue(undefined);
    submitApplication.mockReset();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ status: 'ok', fund: [] })),
    );
  });

  it('opens actor creation inside step four using the current application', async () => {
    const user = userEvent.setup();
    await renderPermitFlow();
    await user.click(button('Actor'));
    expect(getActors).toHaveBeenCalledWith(expect.any(AbortSignal), draftId);
    await user.click(button('Create actor'));
    expect(screen.getByRole('dialog', { name: 'Opret aktør' })).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Role' })).toBeTruthy();
    await user.click(button('Annuller'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByRole('heading', { name: 'Actor' })).toBeTruthy();
  });

  it('edits an actor without leaving the application and updates the summary', async () => {
    const user = userEvent.setup();
    await renderPermitFlow();
    const [actor] = await vi.mocked(getActors).mock.results[0].value;
    vi.mocked(updateActor).mockResolvedValueOnce({
      ...actor,
      phoneNumber: '87654321',
    });
    await user.click(button('Actor'));
    await user.click(button('Update Test Contact'));
    const phone = screen.getByRole('textbox', { name: 'Telefonnummer' });
    await user.clear(phone);
    await user.type(phone, '87654321');
    await user.click(button('Opdater aktør'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(updateActor).toHaveBeenCalledWith(
      'actor-123',
      expect.objectContaining({ phoneNumber: '87654321' }),
    );
    await user.click(button('Review & submission'));
    expect(screen.getByText('87654321')).toBeTruthy();
  });

  it('creates the draft from the application overview before opening the form', async () => {
    const user = userEvent.setup();
    await renderPermitFlow(routes.application);
    expect(createDraft).not.toHaveBeenCalled();

    await user.click(button('Apply for a road occupancy permit'));

    await screen.findByRole('heading', { name: 'Municipality & title' });
    expect(createDraft).toHaveBeenCalledExactlyOnceWith();
    expect(loadDraft).toHaveBeenCalledExactlyOnceWith(draftId);
    expect(saveDraft).not.toHaveBeenCalled();
    expect(submitApplication).not.toHaveBeenCalled();
  });

  it('lists saved drafts and opens the selected case without creating a new one', async () => {
    const user = userEvent.setup();
    listDrafts.mockResolvedValueOnce([
      { caseNumber: 'saved-case', title: 'Road work', canResume: true },
      { caseNumber: 'untitled-case', title: '', canResume: true },
      { caseNumber: 'legacy-case', title: 'Legacy permit', canResume: false },
    ]);
    loadDraft.mockResolvedValueOnce({
      status: 'loaded',
      draft: { title: 'Road work' },
    });
    await renderPermitFlow(routes.application);

    const draftList = within(
      await screen.findByRole('region', { name: 'Drafts (3)' }),
    );
    const draftLink = draftList.getByRole('link', { name: 'Road work' });
    expect(
      draftList.getByRole('link', { name: 'Untitled draft' }),
    ).toBeTruthy();
    expect(draftList.getByText('Legacy permit')).toBeTruthy();
    expect(draftList.queryByRole('link', { name: 'Legacy permit' })).toBeNull();

    await user.click(draftLink);
    const title = await screen.findByRole<HTMLInputElement>('textbox', {
      name: /title/i,
    });
    expect(title.value).toBe('Road work');
    expect(loadDraft).toHaveBeenCalledExactlyOnceWith('saved-case');
    expect(createDraft).not.toHaveBeenCalled();
  });

  it('shows an empty state when there are no drafts', async () => {
    await renderPermitFlow(routes.application);

    expect(await screen.findByText('There are no drafts yet.')).toBeTruthy();
  });

  it('reports a draft list failure while keeping the create action available', async () => {
    listDrafts.mockRejectedValueOnce(new Error('Connection failed'));
    await renderPermitFlow(routes.application);

    expect((await screen.findByRole('alert')).textContent).toContain(
      'Drafts could not be loaded.',
    );
    expect(button('Apply for a road occupancy permit').disabled).toBe(false);
  });

  it('only saves incomplete field edits when Save draft is pressed', async () => {
    const user = userEvent.setup();
    await renderPermitFlow();
    const title = await screen.findByRole('textbox', { name: /title/i });
    await user.type(title, 'Road work');
    expect(saveDraft).not.toHaveBeenCalled();

    await user.click(button('Save draft'));

    await screen.findByText('Draft saved.');
    expect(saveDraft).toHaveBeenCalledExactlyOnceWith(
      draftId,
      expect.objectContaining({
        title: 'Road work',
        municipalityName: null,
        usageDetails: expect.objectContaining({ startDate: '', road: '' }),
      }),
    );
    expect(createDraft).not.toHaveBeenCalled();
    expect(submitApplication).not.toHaveBeenCalled();
  });

  it('loads the saved fields without creating a new draft', async () => {
    loadDraft.mockResolvedValueOnce({
      status: 'loaded',
      draft: {
        title: 'Saved title',
        municipalityName: 'Odense',
        usageDetails: { road: 'Adamsgade' },
      },
    });
    await renderPermitFlow();
    const title = await screen.findByRole<HTMLInputElement>('textbox', {
      name: /title/i,
    });
    expect(title.value).toBe('Saved title');
    expect(
      (await screen.findByRole<HTMLInputElement>('radio', { name: 'Odense' }))
        .checked,
    ).toBe(true);
    expect(createDraft).not.toHaveBeenCalled();
  });

  it('offers a way back to applications when a saved draft is malformed', async () => {
    loadDraft.mockResolvedValueOnce({ status: 'invalid' });
    await renderPermitFlow(undefined, false);
    expect((await screen.findByRole('alert')).textContent).toContain(
      'The saved draft contains data that could not be loaded.',
    );
    await userEvent
      .setup()
      .click(screen.getByRole('link', { name: 'Back to applications' }));
    expect(
      await screen.findByRole('button', {
        name: 'Apply for a road occupancy permit',
      }),
    ).toBeTruthy();
    expect(saveDraft).not.toHaveBeenCalled();
  });

  it('retries loading a temporarily unavailable draft', async () => {
    loadDraft.mockResolvedValueOnce({ status: 'serviceUnavailable' });
    await renderPermitFlow(undefined, false);
    expect((await screen.findByRole('alert')).textContent).toContain(
      'The service is temporarily unavailable. Stay on this page and try again shortly.',
    );
    await userEvent
      .setup()
      .click(
        await screen.findByRole('button', { name: 'Retry loading draft' }),
      );
    expect(
      await screen.findByRole('heading', { name: 'Municipality & title' }),
    ).toBeTruthy();
    expect(loadDraft).toHaveBeenCalledTimes(2);
  });

  it('retries loading municipality choices without clearing the title', async () => {
    const user = userEvent.setup();
    loadMunicipalities.mockRejectedValueOnce(new Error('Connection failed'));
    await renderPermitFlow();
    const title = screen.getByRole<HTMLInputElement>('textbox', {
      name: /title/i,
    });
    await user.type(title, 'Road work');
    await user.click(button('Retry loading municipalities'));

    expect(await screen.findByRole('radio', { name: 'Odense' })).toBeTruthy();
    expect(title.value).toBe('Road work');
    expect(loadMunicipalities).toHaveBeenCalledTimes(2);
  });

  it('lets the user keep editing or leave without saving', async () => {
    const user = userEvent.setup();
    await renderPermitFlow();
    const title = screen.getByRole<HTMLInputElement>('textbox', {
      name: /title/i,
    });
    await user.type(title, 'Unsaved work');
    const overview = screen.getByRole('link', { name: 'Application overview' });

    await user.click(overview);
    const dialog = screen.getByRole('dialog', { name: 'Unsaved changes' });
    await user.click(
      within(dialog).getByRole('button', { name: 'Keep editing' }),
    );
    expect(title.value).toBe('Unsaved work');

    await user.click(overview);
    await user.click(button('Leave without saving'));
    await screen.findByRole('button', {
      name: 'Apply for a road occupancy permit',
    });
    expect(saveDraft).not.toHaveBeenCalled();
  });

  it('stays on the form if Save and leave fails, then leaves after a successful retry', async () => {
    const user = userEvent.setup();
    saveDraft.mockRejectedValueOnce(new Error('Save failed'));
    await renderPermitFlow();
    await user.type(
      screen.getByRole('textbox', { name: /title/i }),
      'Road work',
    );
    await user.click(
      screen.getByRole('link', { name: 'Application overview' }),
    );
    const dialog = screen.getByRole('dialog', { name: 'Unsaved changes' });

    await user.click(button('Save and leave'));
    expect((await within(dialog).findByRole('alert')).textContent).toContain(
      'The draft could not be saved. Try again.',
    );
    expect(saveDraft).toHaveBeenCalledExactlyOnceWith(
      draftId,
      expect.objectContaining({ title: 'Road work' }),
    );

    await user.click(button('Save and leave'));
    await screen.findByRole('button', {
      name: 'Apply for a road occupancy permit',
    });
    expect(saveDraft).toHaveBeenCalledTimes(2);
  });

  it('requests the browser warning only while the form has unsaved edits', async () => {
    const user = userEvent.setup();
    await renderPermitFlow();
    const title = screen.getByRole('textbox', { name: /title/i });

    expect(
      window.dispatchEvent(new Event('beforeunload', { cancelable: true })),
    ).toBe(true);
    await user.type(title, 'Road work');
    expect(
      window.dispatchEvent(new Event('beforeunload', { cancelable: true })),
    ).toBe(false);
    await user.click(button('Save draft'));
    await screen.findByText('Draft saved.');
    expect(
      window.dispatchEvent(new Event('beforeunload', { cancelable: true })),
    ).toBe(true);

    await user.click(
      screen.getByRole('link', { name: 'Application overview' }),
    );
    await screen.findByRole('button', {
      name: 'Apply for a road occupancy permit',
    });
  });

  it('keeps edited values and allows a retry when saving fails', async () => {
    const user = userEvent.setup();
    saveDraft.mockRejectedValueOnce(
      new AxiosError('Network failed', AxiosError.ERR_NETWORK),
    );
    await renderPermitFlow();

    const title = screen.getByRole<HTMLInputElement>('textbox', {
      name: /title/i,
    });
    await user.type(title, 'Keep these edits');
    await user.click(button('Save draft'));
    await screen.findByText(
      'We could not confirm that the draft was saved. Check your connection and try saving again.',
    );
    expect(title.value).toBe('Keep these edits');
    await user.click(button('Save draft'));

    await screen.findByText('Draft saved.');
    expect(saveDraft).toHaveBeenCalledTimes(2);
    expect(saveDraft.mock.calls[1]).toEqual(saveDraft.mock.calls[0]);
  });

  it('explains that a conflicting draft can no longer be edited', async () => {
    const user = userEvent.setup();
    saveDraft.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 409 },
    });
    await renderPermitFlow();
    await user.click(button('Save draft'));

    await screen.findByText(
      'This draft can no longer be edited. Go to the application overview to check its status.',
    );
  });

  it('shows required-field errors and stays on the first step', async () => {
    const user = userEvent.setup();
    await renderPermitFlow();

    await next(user);

    const errors = within(screen.getByRole('alert'));
    expect(errors.getByText('Enter a title.')).toBeTruthy();
    expect(
      errors.getByText('Select a municipality from the list.'),
    ).toBeTruthy();
    expect(
      screen.getByRole('heading', { name: 'Municipality & title' }),
    ).toBeTruthy();
    expect(submitApplication).not.toHaveBeenCalled();
  });

  it('marks the step left through the sidebar and updates it when corrected', async () => {
    const user = userEvent.setup();
    await renderPermitFlow();

    const steps = within(
      screen.getByRole('navigation', { name: 'Application steps' }),
    );
    const firstStep = steps.getByRole('button', {
      name: 'Choose municipality & title',
    });
    expect(firstStep.hasAttribute('aria-describedby')).toBe(false);

    await user.click(steps.getByRole('button', { name: 'Actor' }));

    expect(document.activeElement).toBe(
      screen.getByRole('heading', { name: 'Actor' }),
    );
    expect(
      steps.getByRole('button', {
        name: 'Choose municipality & title',
        description: /Missing or invalid information.*Enter a title/,
      }),
    ).toBe(firstStep);
    expect(screen.queryByRole('alert')).toBeNull();

    await user.hover(firstStep);
    const missingFields = within(await screen.findByRole('tooltip'));
    expect(missingFields.getByText('Enter a title.')).toBeTruthy();
    expect(
      missingFields.getByText('Select a municipality from the list.'),
    ).toBeTruthy();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull());

    await user.click(firstStep);
    expect(
      within(screen.getByRole('alert')).getByText('Enter a title.'),
    ).toBeTruthy();
    await chooseMunicipality(user);
    await user.click(steps.getByRole('button', { name: 'Materials' }));

    expect(
      steps.getByRole('button', {
        name: 'Choose municipality & title',
        description: 'Step complete',
      }),
    ).toBe(firstStep);
  });

  it('selects a filtered municipality by keyboard and keeps it when going back', async () => {
    const user = userEvent.setup();
    await renderPermitFlow();

    await user.type(
      screen.getByRole('textbox', { name: /title/i }),
      'Road work',
    );
    await user.type(screen.getByRole('searchbox'), 'l');
    expect(screen.getAllByRole('radio')).toHaveLength(2);
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(
      screen.getByRole('radio', { name: 'Albertslund' }),
    );
    await user.tab({ shift: true });
    await user.keyboard('{ArrowUp}');
    const billund = screen.getByRole<HTMLInputElement>('radio', {
      name: 'Billund',
    });
    expect(document.activeElement).toBe(billund);
    await user.keyboard('{Enter}');
    expect(billund.checked).toBe(true);
    await next(user);
    await user.click(button('Back'));

    expect(screen.getByRole<HTMLInputElement>('searchbox').value).toBe(
      'Billund',
    );
    expect(
      screen.getByRole<HTMLInputElement>('radio', { name: 'Billund' }).checked,
    ).toBe(true);
    expect(
      screen.getByRole<HTMLInputElement>('textbox', { name: /title/i }).value,
    ).toBe('Road work');
  });

  it.each([
    [
      'en',
      'Materials',
      'Material type',
      'Crane',
      'Scaffolding',
      'Other',
      'Add material',
    ],
    [
      'da',
      'Materiale',
      'Materialetype',
      'Kran',
      'Stillads',
      'Andet',
      'Tilføj materiale',
    ],
  ] as const)(
    'loads and translates API material choices in %s',
    async (language, step, label, crane, scaffolding, other, add) => {
      const user = userEvent.setup();
      loadMaterialTypes.mockResolvedValue(['Crane', 'Scaffolding', 'Other']);
      await renderPermitFlow(undefined, undefined, language);
      await user.click(button(step));
      await user.click(
        screen.getByRole('combobox', { name: new RegExp(label) }),
      );
      expect(
        screen
          .getAllByRole('option')
          .filter((option) => option.getAttribute('aria-disabled') !== 'true'),
      ).toHaveLength(3);
      expect(screen.getByRole('option', { name: scaffolding })).toBeTruthy();
      expect(screen.getByRole('option', { name: other })).toBeTruthy();
      await user.click(screen.getByRole('option', { name: crane }));
      await user.click(button(add));
      expect(within(screen.getByRole('table')).getByText(crane)).toBeTruthy();
      expect(loadMaterialTypes).toHaveBeenCalledExactlyOnceWith();
    },
  );

  it('retries loading material choices and keeps the saved material selected', async () => {
    const user = userEvent.setup();
    loadMaterialTypes.mockRejectedValueOnce(new Error('Unavailable'));
    loadDraft.mockResolvedValue({
      status: 'loaded',
      draft: { materialDraft: { type: 'Scaffolding', quantity: '2' } },
    });
    await renderPermitFlow();
    await user.click(button('Materials'));
    expect(button('Add material').disabled).toBe(true);
    await user.click(
      within(screen.getByRole('alert')).getByRole('button', {
        name: 'Try again',
      }),
    );
    await waitFor(() => expect(button('Add material').disabled).toBe(false));
    expect(
      screen.getByRole('combobox', { name: /material type/i }).textContent,
    ).toBe('Scaffolding');
    await user.click(button('Add material'));
    await user.click(button('Save draft'));
    expect(saveDraft).toHaveBeenCalledWith(
      draftId,
      expect.objectContaining({
        materials: [
          expect.objectContaining({ type: 'Scaffolding', quantity: 2 }),
        ],
      }),
    );
  });

  it('requires at least one material in the list before advancing', async () => {
    const user = userEvent.setup();
    await renderPermitFlow();
    await user.click(button('Materials'));
    await next(user);

    const steps = within(
      screen.getByRole('navigation', { name: 'Application steps' }),
    );
    expect(
      within(screen.getByRole('alert')).getByText(
        'Add at least one material to the list.',
      ),
    ).toBeTruthy();
    expect(
      steps.getByRole('button', {
        name: 'Materials',
        description:
          /Missing or invalid information.*Add at least one material/,
      }),
    ).toBeTruthy();

    await user.click(screen.getByRole('combobox', { name: /material type/i }));
    await user.click(screen.getByRole('option', { name: 'Container' }));
    await next(user);

    expect(
      within(screen.getByRole('alert')).getByText(
        'Add the material, save your changes, or cancel the draft.',
      ),
    ).toBeTruthy();

    await user.click(button('Add material'));
    expect(
      within(screen.getByRole('table')).getByText('Container'),
    ).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(
      steps.getByRole('button', {
        name: 'Materials',
        description: 'Step complete',
      }),
    ).toBeTruthy();
    await next(user);
    expect(screen.getByRole('heading', { name: 'Actor' })).toBeTruthy();
  });

  it('requires an explicit traffic measure before advancing', async () => {
    const user = userEvent.setup();
    await renderPermitFlow();
    await user.click(button('Road markings'));
    await next(user);

    expect(
      within(screen.getByRole('alert')).getByText(
        'Select at least one traffic measure.',
      ),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', {
        name: 'Road markings',
        description: /Select at least one traffic measure/,
      }),
    ).toBeTruthy();

    await user.click(
      screen.getByRole('checkbox', { name: 'Type I', exact: true }),
    );
    expect(screen.queryByRole('alert')).toBeNull();
    await next(user);
    expect(
      screen.getByRole('heading', { name: 'Attachments for the application' }),
    ).toBeTruthy();
  });

  it('suggests roads with their postal districts and fills the selected location', async () => {
    const user = userEvent.setup();
    const lookup = vi.fn(async () =>
      Response.json({
        status: 'ok',
        fund: [
          { type: 'husnummer', id: '1', titel: 'Parkvej 12' },
          {
            type: 'navngivenvejpostnummer',
            vejnavn: 'Parkvej',
            postnr: '5260',
            postdistrikt: 'Odense S',
          },
          {
            type: 'navngivenvejpostnummer',
            vejnavn: 'Parkvej',
            postnr: '2750',
            postdistrikt: 'Ballerup',
          },
        ],
      }),
    );
    vi.stubGlobal('fetch', lookup);
    await renderPermitFlow();
    await advanceToUsage(user);

    const road = screen.getByRole<HTMLInputElement>('combobox', {
      name: /^road\b/i,
    });
    await user.type(road, 'Parkvej');
    const option = await screen.findByRole('option', {
      name: 'Parkvej, 5260 Odense S',
    });
    expect(screen.getAllByRole('option')).toHaveLength(2);
    expect(lookup).toHaveBeenCalledWith(
      expect.objectContaining({
        href: expect.stringContaining('maal=navngivenvejpostnummer'),
      }),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    await user.click(option);

    expect(road.value).toBe('Parkvej');
    expect(screen.getByLabelText<HTMLInputElement>(/postal code/i).value).toBe(
      '5260',
    );
    expect(screen.getByLabelText<HTMLInputElement>(/^city\b/i).value).toBe(
      'Odense S',
    );
    expect(
      screen.getByLabelText<HTMLInputElement>(/house number from/i).value,
    ).toBe('');
  });

  it('keeps a road suggestion available after typing a full address', async () => {
    const user = userEvent.setup();
    const fullAddress = 'Parkvej 12, 5260 Odense S';
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: URL) =>
        Response.json({
          status: 'ok',
          fund:
            url.searchParams.get('tekst') === fullAddress
              ? [
                  {
                    type: 'husnummer',
                    id: '1',
                    titel: 'Parkvej 12, Hjallese, 5260 Odense S',
                    vejnavn: 'Parkvej',
                    husnummer: '12',
                  },
                ]
              : [],
        }),
      ),
    );
    await renderPermitFlow();
    await advanceToUsage(user);

    const road = screen.getByRole<HTMLInputElement>('combobox', {
      name: /^road\b/i,
    });
    await user.type(road, fullAddress);
    await screen.findByRole('option', { name: 'Parkvej, 5260 Odense S' });
    await user.keyboard('{ArrowDown}{Enter}');

    expect(road.value).toBe('Parkvej');
    expect(screen.getByLabelText<HTMLInputElement>(/postal code/i).value).toBe(
      '5260',
    );
    expect(screen.getByLabelText<HTMLInputElement>(/^city\b/i).value).toBe(
      'Odense S',
    );
  });

  it('highlights incomplete summary fields and only scrolls when requested', async () => {
    vi.mocked(getActors).mockResolvedValueOnce([]);
    const user = userEvent.setup();
    const scrollIntoView = vi.mocked(HTMLElement.prototype.scrollIntoView);
    scrollIntoView.mockClear();
    await renderPermitFlow();
    await user.click(button('Review & submission'));
    const confirmation = screen.getByRole('checkbox', { name: /I declare/i });
    expect(screen.queryByText('Enter a title.')).toBeNull();
    await user.click(confirmation);
    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(confirmation);

    for (const message of [
      'Enter a title.',
      'Select a municipality from the list.',
      'Add at least one material to the list.',
      'Select a start date.',
      'Select at least one traffic measure.',
    ]) {
      expect(screen.getByText(message)).toBeTruthy();
    }
    expect(button('Submit application').disabled).toBe(true);
    expect(
      screen.getByRole('heading', { name: 'Review & submission' }),
    ).toBeTruthy();
    const alert = within(screen.getByRole('alert'));
    expect(alert.getByText('Fix the highlighted fields.')).toBeTruthy();
    await user.click(alert.getByRole('button', { name: 'See what’s missing' }));
    expect(scrollIntoView).toHaveBeenCalledExactlyOnceWith({
      behavior: 'smooth',
      block: 'center',
    });
    const title = screen.getByRole('group', { name: 'Title' });
    expect(scrollIntoView.mock.contexts[0]).toBe(title);
    expect(document.activeElement).toBe(title);

    await user.click(button('Choose municipality & title'));
    await chooseMunicipality(user);
    await user.click(button('Review & submission'));
    expect(screen.queryByText('Enter a title.')).toBeNull();
    await user.click(button('See what’s missing'));
    expect(document.activeElement).toBe(
      screen.getByRole('group', { name: 'Start date' }),
    );
    const checkedConfirmation = screen.getByRole('checkbox', {
      name: /I declare/i,
    });
    await user.click(checkedConfirmation);
    expect(
      screen.queryByText('Add at least one material to the list.'),
    ).toBeNull();
    expect(screen.queryByText('Fix the highlighted fields.')).toBeNull();
  });

  it('allows submission without actors and redirects after confirmation and success', async () => {
    vi.mocked(getActors).mockResolvedValueOnce([]);
    const user = userEvent.setup();
    /** Keeps the request pending until the test has checked the spinner and disabled submit button. */
    let finishRequest: () => void = () => {
      throw new Error('Submission request was not started');
    };
    submitApplication.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishRequest = () => resolve();
        }),
    );
    await renderPermitFlow();
    await fillRequiredDetails(user);

    const submit = button('Submit application');
    expect(submit.disabled).toBe(true);
    await user.click(screen.getByRole('checkbox', { name: /I declare/i }));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(submit.disabled).toBe(false);
    await user.click(submit);

    const pending = await screen.findByRole('dialog', {
      name: 'Sending your application…',
    });
    expect(
      within(pending).getByRole('progressbar', { hidden: true }),
    ).toBeTruthy();
    expect(submit.disabled).toBe(true);
    expect(submitApplication).toHaveBeenCalledExactlyOnceWith(
      draftId,
      expect.objectContaining({
        municipalityName: 'Odense',
        confirmed: true,
        roadMarking: expect.objectContaining({
          trafficChanges: ['NoStoppingAndParking'],
        }),
        usageDetails: expect.objectContaining({
          road: 'Adamsgade',
          houseNumberFrom: '5',
          houseNumberTo: '31',
          postalCode: '5000',
          city: 'Odense C',
        }),
      }),
    );

    await act(async () => finishRequest());
    const success = await screen.findByRole('dialog', {
      name: 'Your application has been submitted.',
    });
    expect(success).toBe(pending);
    expect(submit.disabled).toBe(true);
    await screen.findByRole(
      'heading',
      { name: 'Choose an application type' },
      { timeout: 2000 },
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows a failed request and allows the same application to be retried', async () => {
    const user = userEvent.setup();
    submitApplication.mockRejectedValueOnce(
      new AxiosError('Network failed', AxiosError.ERR_NETWORK),
    );
    submitApplication.mockResolvedValueOnce(undefined);
    await renderPermitFlow();
    await fillRequiredDetails(user);

    await user.click(screen.getByRole('checkbox', { name: /I declare/i }));
    const submit = button('Submit application');
    await user.click(submit);
    await screen.findByText(
      'We could not confirm that your application was submitted. Check its status in the application overview before trying again.',
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(
      screen.queryByRole('heading', { name: 'Choose an application type' }),
    ).toBeNull();
    expect(submit.disabled).toBe(false);
    await user.click(submit);

    await screen.findByRole('dialog', {
      name: 'Your application has been submitted.',
    });
    expect(submitApplication).toHaveBeenCalledTimes(2);
    expect(submitApplication.mock.calls[0][0]).toBe(draftId);
    expect(submitApplication.mock.calls[0]).toEqual(
      submitApplication.mock.calls[1],
    );
  });

  it('marks a municipality rejected by the API until the applicant changes it', async () => {
    const user = userEvent.setup();
    submitApplication.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 400, data: { code: 'MUNICIPALITY_UNAVAILABLE' } },
    });
    await renderPermitFlow();
    await fillRequiredDetails(user);
    await user.click(screen.getByRole('checkbox', { name: /I declare/i }));
    await user.click(button('Submit application'));

    const message =
      'The selected municipality is no longer available. Select another municipality.';
    expect((await screen.findByRole('alert')).textContent).toContain(message);
    expect(button('Submit application').disabled).toBe(true);

    await user.click(button('Choose municipality & title'));
    expect(
      screen.getByRole('searchbox', {
        description: /The selected municipality is no longer available/,
      }),
    ).toBeTruthy();
    await user.click(screen.getByRole('radio', { name: 'Billund' }));
    expect(screen.queryByText(message)).toBeNull();
  });

  it.each([
    {
      code: 'MATERIAL_UNAVAILABLE',
      step: 'Materials',
      message:
        'The selected material is no longer available. Remove it from the list or select another.',
      remove: 'Remove Container, material 1',
    },
    {
      code: 'TRAFFIC_CHANGE_UNAVAILABLE',
      step: 'Road markings',
      message:
        'The traffic change «Stopping and parking» is no longer available. Remove it from the list or select another.',
      remove: 'Remove Stopping and parking',
    },
  ])(
    'marks a rejected choice in $step until it is removed',
    async ({ code, step, message, remove }) => {
      const user = userEvent.setup();
      submitApplication.mockRejectedValueOnce({
        isAxiosError: true,
        response: { status: 400, data: { code, index: 0 } },
      });
      await renderPermitFlow();
      await fillRequiredDetails(user);
      await user.click(screen.getByRole('checkbox', { name: /I declare/i }));
      await user.click(button('Submit application'));

      expect((await screen.findByRole('alert')).textContent).toContain(message);
      expect(button('Submit application').disabled).toBe(true);

      await user.click(button(step));
      expect(
        screen
          .getAllByText(message)
          .some((element) => !element.closest('[role="alert"]')),
      ).toBe(true);
      await user.click(button(remove));
      expect(screen.queryByText(message)).toBeNull();
    },
  );
});
