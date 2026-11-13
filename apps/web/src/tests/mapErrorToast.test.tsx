import { act, fireEvent, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { renderWithTranslations } from './renderWithTranslations';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

it('resumes the countdown with the time remaining before hover', async () => {
  vi.stubEnv('VITE_DATAFORSYNINGEN_TOKEN', '');
  vi.useFakeTimers();
  const { DataforsyningenMap } = await import(
    '../components/ui/map/DataforsyningenMap'
  );

  await renderWithTranslations(
    <DataforsyningenMap onRoadLocationConfirm={vi.fn()} />,
  );

  const toast = screen.getByRole('alert');
  expect(toast.closest('.MuiSnackbar-anchorOriginBottomLeft')).not.toBeNull();
  act(() => vi.advanceTimersByTime(2000));
  fireEvent.mouseEnter(toast);
  act(() => vi.advanceTimersByTime(10000));
  expect(screen.getByRole('alert')).toBe(toast);

  fireEvent.mouseLeave(toast);
  act(() => vi.advanceTimersByTime(2999));
  expect(screen.getByRole('alert')).toBe(toast);
  act(() => vi.advanceTimersByTime(1));
  expect(screen.queryByRole('alert')).toBeNull();
});

it('dismisses the map error toast after five seconds', async () => {
  vi.stubEnv('VITE_DATAFORSYNINGEN_TOKEN', '');
  vi.useFakeTimers();
  const { DataforsyningenMap } = await import(
    '../components/ui/map/DataforsyningenMap'
  );

  await renderWithTranslations(
    <DataforsyningenMap onRoadLocationConfirm={vi.fn()} />,
  );

  const message = screen.getByRole('alert');
  expect(message.textContent).toContain('The map could not load');
  act(() => vi.advanceTimersByTime(4999));
  expect(screen.getByRole('alert')).toBe(message);
  act(() => vi.advanceTimersByTime(1));
  expect(screen.queryByRole('alert')).toBeNull();
});
