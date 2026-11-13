import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { createMemoryRouter, Link, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getMunicipalities } from '../api/municipalities.api';
import {
  createRoadPermitDraft,
  getRoadPermitDraft,
  listApplicationDrafts,
  saveRoadPermitDraft,
  submitRoadPermitApplication,
} from '../api/roadPermit.api';
import { routes } from '../app/router';
import ApplicationPage from '../pages/application-page';
import CreateRoadPermitPage from '../pages/application-page/create-road-permit';
import { renderWithTranslations } from './renderWithTranslations';

vi.mock('../api/roadPermit.api', () => ({
  createRoadPermitDraft: vi.fn(),
  getRoadPermitDraft: vi.fn(),
  listApplicationDrafts: vi.fn(),
  saveRoadPermitDraft: vi.fn(),
  submitRoadPermitApplication: vi.fn(),
}));

vi.mock('../api/municipalities.api', () => ({
  getMunicipalities: vi.fn(),
}));

vi.mock('../components/ui/map/DataforsyningenMap', () => ({
  /** Replaces the map so the workflow tests can enter the address manually. */
  DataforsyningenMap: () => null,
}));

const createDraft = vi.mocked(createRoadPermitDraft);
const loadMunicipalities = vi.mocked(getMunicipalities);
const loadDraft = vi.mocked(getRoadPermitDraft);
const listDrafts = vi.mocked(listApplicationDrafts);
const saveDraft = vi.mocked(saveRoadPermitDraft);
const submitApplication = vi.mocked(submitRoadPermitApplication);
const draftId = 'draft-123';

/** Renders the permit form and its redirect destination in a memory router. */
async function renderPermitFlow(
  initialEntry = `${routes.createRoadPermit}?draft=${draftId}`,
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
  const view = await renderWithTranslations(<RouterProvider router={router} />);
  if (initialEntry.startsWith(routes.createRoadPermit)) {
    await screen.findByRole('heading', { name: 'Municipality & title' });
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

/** Completes the required steps and leaves the form on the submission summary. */
async function fillRequiredDetails(user: UserEvent) {
  await chooseMunicipality(user);
  await next(user);
  await next(user);

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

  await user.type(screen.getByLabelText(/^name\b/i), 'Test Contact');
  await user.type(screen.getByLabelText(/phone number/i), '12345678');
  await user.type(screen.getByLabelText(/^email\b/i), 'test@example.com');
  await next(user);
  await next(user);
  await next(user);
}

describe('Road permit application', () => {
  beforeEach(() => {
    loadMunicipalities.mockReset().mockResolvedValue([
      { id: 1, name: 'Albertslund' },
      { id: 2, name: 'Billund' },
      { id: 3, name: 'Odense' },
    ]);
    createDraft.mockReset().mockResolvedValue({ caseNumber: draftId });
    loadDraft.mockReset().mockResolvedValue({});
    listDrafts.mockReset().mockResolvedValue([]);
    saveDraft.mockReset().mockResolvedValue(undefined);
    submitApplication.mockReset();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ status: 'ok', fund: [] })),
    );
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
    loadDraft.mockResolvedValueOnce({ title: 'Road work' });
    await renderPermitFlow(routes.application);

    const draftList = within(screen.getByRole('region', { name: 'Drafts' }));
    const draftLink = await draftList.findByRole('link', { name: 'Road work' });
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
      title: 'Saved title',
      municipalityName: 'Odense',
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
    saveDraft.mockRejectedValueOnce(new Error('Save failed'));
    await renderPermitFlow();

    const title = screen.getByRole<HTMLInputElement>('textbox', {
      name: /title/i,
    });
    await user.type(title, 'Keep these edits');
    await user.click(button('Save draft'));
    await screen.findByText('The draft could not be saved. Try again.');
    expect(title.value).toBe('Keep these edits');
    await user.click(button('Save draft'));

    await screen.findByText('Draft saved.');
    expect(saveDraft).toHaveBeenCalledTimes(2);
    expect(saveDraft.mock.calls[1]).toEqual(saveDraft.mock.calls[0]);
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

  it('filters municipalities and keeps the selection when going back', async () => {
    const user = userEvent.setup();
    await renderPermitFlow();

    await chooseMunicipality(user);
    expect(screen.getAllByRole('radio')).toHaveLength(1);
    await next(user);
    await user.click(button('Back'));

    expect(screen.getByRole<HTMLInputElement>('searchbox').value).toBe(
      'Odense',
    );
    expect(
      screen.getByRole<HTMLInputElement>('radio', { name: 'Odense' }).checked,
    ).toBe(true);
    expect(
      screen.getByRole<HTMLInputElement>('textbox', { name: /title/i }).value,
    ).toBe('Road work');
  });

  it('blocks an unfinished material draft until it is added', async () => {
    const user = userEvent.setup();
    await renderPermitFlow();
    await chooseMunicipality(user);
    await next(user);

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
    await next(user);
    expect(screen.getByRole('heading', { name: 'Usage details' })).toBeTruthy();
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
    await chooseMunicipality(user);
    await next(user);
    await next(user);

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
    await chooseMunicipality(user);
    await next(user);
    await next(user);

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

  it('requires confirmation and redirects after showing submission success', async () => {
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
    submitApplication.mockRejectedValueOnce(new Error('Network failed'));
    submitApplication.mockResolvedValueOnce(undefined);
    await renderPermitFlow();
    await fillRequiredDetails(user);

    await user.click(screen.getByRole('checkbox', { name: /I declare/i }));
    const submit = button('Submit application');
    await user.click(submit);
    await screen.findByText('Your application could not be sent. Try again.');
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
});
