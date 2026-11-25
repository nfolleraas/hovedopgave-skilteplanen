import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { expect, it, vi } from 'vitest';
import type { SavedActor } from '../../src/pages/actors-page/actor.types';
import type { ActorsPageContext } from '../../src/pages/actors-page/actors-page.context';
import { ActorsSection } from '../../src/pages/application-page/create-road-permit/pages/ActorsSection';
import { renderWithTranslations } from '../renderWithTranslations';

const actor: SavedActor = {
  uuid: '11111111-1111-4111-8111-111111111111',
  role: 'Supplier',
  name: 'Testfirma',
  phoneNumber: '12345678',
  email: 'firma@example.com',
  cvrNumber: '12345678',
  department: 'Anlæg',
  address: {
    uuid: '22222222-2222-4222-8222-222222222222',
    street: 'Vestergade',
    houseNumber: '10',
    postalCode: '5000',
    city: 'Odense C',
  },
  contactPersons: [],
};

async function submitPendingVerification() {
  let resolveVerification!: (response: Response) => void;
  const verification = new Promise<Response>((resolve) => {
    resolveVerification = resolve;
  });
  const lookup = vi.fn(() => verification);
  vi.stubGlobal('fetch', lookup);
  const context: ActorsPageContext = {
    actors: [actor],
    setActors: vi.fn(),
    isLoading: false,
    loadFailed: false,
    retry: vi.fn(),
    createActor: vi.fn(async () => {}),
    updateActor: vi.fn(async () => {}),
  };
  await renderWithTranslations(
    <StrictMode>
      <ActorsSection caseNumber="test-case" context={context} />
    </StrictMode>,
    'da',
  );
  fireEvent.click(
    screen.getByRole('button', { name: `Opdater ${actor.name}` }),
  );
  fireEvent.click(
    screen.getByRole('button', { name: 'Opdater aktør', exact: true }),
  );
  await waitFor(() => expect(lookup).toHaveBeenCalledOnce());
  expect(context.updateActor).not.toHaveBeenCalled();

  async function finishVerification(): Promise<void> {
    await act(async () => {
      resolveVerification(
        new Response(JSON.stringify({ vat: 12345678, name: actor.name })),
      );
      await verification;
    });
  }

  return { context, finishVerification };
}

it.each(['Escape', 'backdrop'])(
  'does not save after dismissal via %s during CVR verification',
  async (dismissal) => {
    const { context, finishVerification } = await submitPendingVerification();
    const dialog = screen.getByRole('dialog');
    if (dismissal === 'Escape') {
      fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });
    } else {
      const container = dialog.parentElement;
      if (!container) throw new Error('Actor dialog has no container.');
      fireEvent.mouseDown(container);
      fireEvent.click(container);
    }
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    // A new editor must not revive the dismissed form's submission.
    fireEvent.click(
      screen.getByRole('button', { name: `Opdater ${actor.name}` }),
    );
    await finishVerification();
    expect(context.updateActor).not.toHaveBeenCalled();
    expect(context.createActor).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeTruthy();
  },
);

it('saves after CVR verification while the editor remains open', async () => {
  const { context, finishVerification } = await submitPendingVerification();
  await finishVerification();
  expect(context.updateActor).toHaveBeenCalledExactlyOnceWith(
    actor.uuid,
    expect.objectContaining({ cvrNumber: actor.cvrNumber, name: actor.name }),
  );
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
});
