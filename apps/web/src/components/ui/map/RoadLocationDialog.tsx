import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  dialogTitleClasses,
  TextField,
} from '@mui/material';
import { type SubmitEvent, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  type RoadLocation,
  validateRoadLocation,
} from '../../../utils/validateRoadLocation';

type RoadLocationDialogProps = {
  container: () => HTMLElement | null;
  onClose: () => void;
  onConfirm: (location: RoadLocation) => void;
  suggestedLocation: RoadLocation;
};

/** Removes spaces around every field of the address. */
function trimLocation(location: RoadLocation): RoadLocation {
  return {
    road: location.road.trim(),
    houseNumberFrom: location.houseNumberFrom.trim(),
    houseNumberTo: location.houseNumberTo.trim(),
    postalCode: location.postalCode.trim(),
    city: location.city.trim(),
  };
}

/** True when neither the map nor the user has given any house number. */
function hasNoHouseNumbers(suggested: RoadLocation, location: RoadLocation) {
  return [suggested, location].every(
    ({ houseNumberFrom, houseNumberTo }) => !houseNumberFrom && !houseNumberTo,
  );
}

/** Lets the user review and correct the map's suggested address before confirming it. */
export function RoadLocationDialog({
  container,
  onClose,
  onConfirm,
  suggestedLocation,
}: RoadLocationDialogProps) {
  const { t } = useTranslation();
  const titleId = useId();
  const [location, setLocation] = useState(suggestedLocation);
  const [submitted, setSubmitted] = useState(false);

  const errors = validateRoadLocation(location, t);
  // Errors are shown once the user has tried to confirm.
  const shown: Partial<typeof errors> = submitted ? errors : {};
  const roadHint =
    !suggestedLocation.road && !location.road
      ? t('permit.map.roadSelection.enterName')
      : undefined;
  const numbersMissing = hasNoHouseNumbers(suggestedLocation, location);

  /** Validates the address, focuses the first invalid field, or confirms the trimmed values. */
  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    const invalidField = Object.keys(errors).find(
      (field) => errors[field as keyof RoadLocation],
    );
    if (invalidField) {
      const input = event.currentTarget.elements.namedItem(invalidField);
      if (input instanceof HTMLInputElement) input.focus();
      return;
    }

    onConfirm(trimLocation(location));
  }

  return (
    <Dialog
      aria-labelledby={titleId}
      container={container}
      fullWidth
      maxWidth="xs"
      onClose={onClose}
      open
    >
      <Box component="form" noValidate onSubmit={submit}>
        <DialogTitle id={titleId}>
          {t('permit.map.roadSelection.confirmRange')}
        </DialogTitle>
        <DialogContent
          sx={{
            display: 'grid',
            gap: 2,
            px: '26px',
            [`.${dialogTitleClasses.root} + &`]: { pt: '11px' },
          }}
        >
          <TextField
            autoFocus
            error={Boolean(shown.road)}
            helperText={
              shown.road || (roadHint && <span role="status">{roadHint}</span>)
            }
            label={t('permit.usage.road')}
            name="road"
            onChange={(event) =>
              setLocation({ ...location, road: event.target.value })
            }
            required
            value={location.road}
          />
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, minmax(0, 1fr))',
              },
            }}
          >
            <TextField
              error={Boolean(shown.houseNumberFrom)}
              helperText={
                shown.houseNumberFrom ||
                (numbersMissing && t('permit.map.roadSelection.numbersMissing'))
              }
              label={t('permit.usage.houseNumberFrom')}
              name="houseNumberFrom"
              onChange={(event) =>
                setLocation({
                  ...location,
                  houseNumberFrom: event.target.value,
                })
              }
              required={Boolean(location.houseNumberTo.trim())}
              value={location.houseNumberFrom}
            />
            <TextField
              error={Boolean(shown.houseNumberTo)}
              helperText={shown.houseNumberTo}
              label={t('permit.usage.houseNumberTo')}
              name="houseNumberTo"
              onChange={(event) =>
                setLocation({ ...location, houseNumberTo: event.target.value })
              }
              value={location.houseNumberTo}
            />
            <TextField
              error={Boolean(shown.postalCode)}
              helperText={shown.postalCode}
              label={t('permit.usage.postalCode')}
              name="postalCode"
              onChange={(event) =>
                setLocation({ ...location, postalCode: event.target.value })
              }
              required
              slotProps={{ htmlInput: { inputMode: 'numeric' } }}
              value={location.postalCode}
            />
            <TextField
              error={Boolean(shown.city)}
              helperText={shown.city}
              label={t('permit.usage.city')}
              name="city"
              onChange={(event) =>
                setLocation({ ...location, city: event.target.value })
              }
              required
              value={location.city}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>{t('permit.actions.cancel')}</Button>
          <Button type="submit" variant="contained">
            {t('permit.map.roadSelection.confirm')}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
