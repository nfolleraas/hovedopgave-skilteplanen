import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RoadLocationDialog } from '../components/ui/map/RoadLocationDialog';
import type { RoadLocation } from '../utils/validateRoadLocation';
import { renderWithTranslations } from './renderWithTranslations';

const suggestion: RoadLocation = {
  road: 'Adamsgade',
  houseNumberFrom: '5',
  houseNumberTo: '31',
  postalCode: '5000',
  city: 'Odense C',
};

/** Opens the address dialog with a suggestion and exposes its controls and mock handlers. */
async function openDialog(suggestedLocation = suggestion) {
  const user = userEvent.setup();
  const onClose = vi.fn();
  const onConfirm = vi.fn();
  await renderWithTranslations(
    <RoadLocationDialog
      container={() => document.body}
      onClose={onClose}
      onConfirm={onConfirm}
      suggestedLocation={suggestedLocation}
    />,
  );
  const dialog = within(
    screen.getByRole('dialog', { name: 'Confirm road and house numbers' }),
  );
  return {
    user,
    onClose,
    onConfirm,
    /** Finds an address field by its accessible name within the dialog. */
    field: (name: RegExp) =>
      dialog.getByRole<HTMLInputElement>('textbox', { name }),
    confirm: dialog.getByRole('button', { name: 'Confirm' }),
  };
}

describe('Road location confirmation', () => {
  it('prefills the suggested address and allows corrections before confirming', async () => {
    const { user, field, confirm, onConfirm } = await openDialog();
    expect(field(/^road\b/i).value).toBe('Adamsgade');
    expect(field(/house number from/i).value).toBe('5');
    expect(field(/postal code/i).value).toBe('5000');
    expect(field(/^city\b/i).value).toBe('Odense C');

    await user.clear(field(/house number to/i));
    await user.type(field(/house number to/i), '32A');
    expect(onConfirm).not.toHaveBeenCalled();
    await user.click(confirm);
    expect(onConfirm).toHaveBeenCalledExactlyOnceWith({
      ...suggestion,
      houseNumberTo: '32A',
    });
  });

  it('blocks an invalid postal code and focuses the field that needs attention', async () => {
    const { user, field, confirm, onConfirm } = await openDialog({
      ...suggestion,
      postalCode: '500',
    });

    await user.click(confirm);

    expect(screen.getByText('Enter a four-digit postal code.')).toBeTruthy();
    expect(document.activeElement).toBe(field(/postal code/i));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('dismisses on Escape without confirming the suggested address', async () => {
    const { user, onClose, onConfirm } = await openDialog();

    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
