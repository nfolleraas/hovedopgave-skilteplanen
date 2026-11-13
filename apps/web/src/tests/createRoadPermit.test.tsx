import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoadPermitApplication } from '../api/roadPermit.api';
import { routes } from '../app/router';
import ApplicationPage from '../pages/application-page';
import CreateRoadPermitPage from '../pages/application-page/create-road-permit';
import { renderWithTranslations } from './renderWithTranslations';

vi.mock('../api/roadPermit.api', () => ({
  createRoadPermitApplication: vi.fn(),
}));

vi.mock('../components/ui/map/DataforsyningenMap', () => ({
  /** Replaces the map so the workflow tests can enter the address manually. */
  DataforsyningenMap: () => null,
}));

const submitApplication = vi.mocked(createRoadPermitApplication);

/** Renders the permit form and its redirect destination in a memory router. */
function renderPermitFlow() {
  return renderWithTranslations(
    <MemoryRouter initialEntries={[routes.createRoadPermit]}>
      <Routes>
        <Route
          element={<CreateRoadPermitPage />}
          path={routes.createRoadPermit}
        />
        <Route element={<ApplicationPage />} path={routes.application} />
      </Routes>
    </MemoryRouter>,
  );
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
    screen.getByRole('textbox', { name: /^road\b/i }),
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
  beforeEach(() => submitApplication.mockReset());

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
    expect(submitApplication.mock.calls[0][0]).toEqual(
      submitApplication.mock.calls[1][0],
    );
  });
});
