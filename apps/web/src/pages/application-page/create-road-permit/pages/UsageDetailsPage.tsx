import {
  Autocomplete,
  Box,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DataforsyningenMap } from '../../../../components/ui/map/DataforsyningenMap';
import { visuallyHidden } from '../../../../components/ui/visuallyHidden';
import {
  findRoadSuggestions,
  type RoadSuggestion,
} from '../../../../utils/adressevaelger';
import type { UsageDetails } from '../formTypes';
import { getUsageTypes } from '../permitOptions';
import type { validateUsageDetails } from '../validation';

type UsageDetailsPageProps = {
  errors?: ReturnType<typeof validateUsageDetails>;
  value: UsageDetails;
  onChange: (value: UsageDetails) => void;
};

/** Collects the permit dates and location, including address details confirmed from the map. */
export function UsageDetailsPage({
  errors,
  value,
  onChange,
}: UsageDetailsPageProps) {
  const { t } = useTranslation();
  const usageTypes = getUsageTypes(t);
  const [roadQuery, setRoadQuery] = useState('');
  const [roadResults, setRoadResults] = useState<{
    suggestions: RoadSuggestion[];
    failed?: true;
  } | null>(null);
  const searchingRoad = roadQuery.trim().length >= 2;
  const loadingRoads = searchingRoad && !roadResults;

  useEffect(() => {
    if (!searchingRoad) return;

    const request = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const suggestions = await findRoadSuggestions(
          roadQuery.trim(),
          request.signal,
        );
        if (!request.signal.aborted) setRoadResults({ suggestions });
      } catch {
        if (!request.signal.aborted)
          setRoadResults({ suggestions: [], failed: true });
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      request.abort();
    };
  }, [roadQuery, searchingRoad]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        width: '100%',
        maxWidth: 816,
        mx: 'auto',
      }}
    >
      <TextField
        error={Boolean(errors?.usage)}
        fullWidth
        helperText={errors?.usage}
        id="usage-type"
        label={t('permit.usage.label')}
        name="usage"
        onChange={(event) => onChange({ ...value, usage: event.target.value })}
        required
        select
        value={value.usage}
      >
        <MenuItem disabled value="">
          {t('permit.usage.choose')}
        </MenuItem>
        {Object.entries(usageTypes).map(([usage, label]) => (
          <MenuItem key={usage} value={usage}>
            {label}
          </MenuItem>
        ))}
      </TextField>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'minmax(0, 1fr)',
            sm: 'repeat(2, minmax(0, 1fr))',
          },
          gap: 3,
        }}
      >
        <TextField
          error={Boolean(errors?.startDate)}
          fullWidth
          helperText={errors?.startDate}
          id="usage-start-date"
          label={t('permit.usage.startDate')}
          name="startDate"
          onChange={(event) =>
            onChange({ ...value, startDate: event.target.value })
          }
          required
          slotProps={{ inputLabel: { shrink: true } }}
          type="date"
          value={value.startDate}
        />
        <TextField
          error={Boolean(errors?.endDate)}
          fullWidth
          helperText={errors?.endDate}
          id="usage-end-date"
          label={t('permit.usage.endDate')}
          name="endDate"
          onChange={(event) =>
            onChange({ ...value, endDate: event.target.value })
          }
          required
          slotProps={{
            inputLabel: { shrink: true },
            htmlInput: { min: value.startDate || undefined },
          }}
          type="date"
          value={value.endDate}
        />
      </Box>
      <Typography component="h3" variant="h6">
        {t('permit.usage.location')}
      </Typography>
      <Autocomplete<RoadSuggestion, false, false, true>
        filterOptions={(options) => options}
        freeSolo
        getOptionKey={(option) =>
          typeof option === 'string'
            ? option
            : `${option.road}|${option.postalCode}`
        }
        getOptionLabel={(option) =>
          typeof option === 'string' ? option : option.road
        }
        id="usage-road"
        inputValue={value.road}
        loading={loadingRoads}
        loadingText={t('permit.usage.roadSearching')}
        onChange={(_, suggestion) => {
          if (suggestion && typeof suggestion !== 'string') {
            onChange({ ...value, ...suggestion });
          }
        }}
        onClose={() => setRoadQuery('')}
        onInputChange={(_, road, reason) => {
          if (reason !== 'input' && reason !== 'clear') return;

          setRoadResults(null);
          setRoadQuery(road);
          onChange({ ...value, road });
        }}
        onOpen={() => {
          setRoadResults(null);
          setRoadQuery((query) => query || value.road);
        }}
        open={searchingRoad}
        options={roadResults?.suggestions ?? []}
        renderInput={(params) => (
          <TextField
            {...params}
            error={Boolean(errors?.road)}
            helperText={
              errors?.road ||
              (searchingRoad && roadResults?.failed
                ? t('permit.usage.roadSearchError')
                : undefined)
            }
            label={t('permit.usage.road')}
            name="road"
            required
          />
        )}
        renderOption={(props, suggestion) => {
          const { key, ...optionProps } = props;
          return (
            <li key={key} {...optionProps}>
              {suggestion.road}, {suggestion.postalCode} {suggestion.city}
            </li>
          );
        }}
        value={null}
      />
      <Box role="status" sx={visuallyHidden}>
        {loadingRoads && t('permit.usage.roadSearching')}
        {searchingRoad &&
          roadResults?.failed &&
          t('permit.usage.roadSearchError')}
        {searchingRoad &&
          roadResults &&
          !roadResults.failed &&
          (roadResults.suggestions.length
            ? t('permit.usage.roadChooseResult')
            : t('permit.usage.roadNoResults'))}
      </Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'minmax(0, 1fr)',
            sm: 'repeat(2, minmax(0, 1fr))',
          },
          gap: 3,
        }}
      >
        <TextField
          error={Boolean(errors?.postalCode)}
          fullWidth
          helperText={errors?.postalCode}
          id="usage-postal-code"
          label={t('permit.usage.postalCode')}
          name="postalCode"
          onChange={(event) =>
            onChange({ ...value, postalCode: event.target.value })
          }
          required
          slotProps={{ htmlInput: { inputMode: 'numeric' } }}
          value={value.postalCode}
        />
        <TextField
          error={Boolean(errors?.city)}
          fullWidth
          helperText={errors?.city}
          id="usage-city"
          label={t('permit.usage.city')}
          name="city"
          onChange={(event) => onChange({ ...value, city: event.target.value })}
          required
          value={value.city}
        />
        <TextField
          error={Boolean(errors?.houseNumberFrom)}
          fullWidth
          helperText={errors?.houseNumberFrom}
          id="usage-house-number-from"
          label={t('permit.usage.houseNumberFrom')}
          name="houseNumberFrom"
          onChange={(event) =>
            onChange({ ...value, houseNumberFrom: event.target.value })
          }
          required={Boolean(value.houseNumberTo.trim())}
          value={value.houseNumberFrom}
        />
        <TextField
          error={Boolean(errors?.houseNumberTo)}
          fullWidth
          helperText={errors?.houseNumberTo}
          id="usage-house-number-to"
          label={t('permit.usage.houseNumberTo')}
          name="houseNumberTo"
          onChange={(event) =>
            onChange({ ...value, houseNumberTo: event.target.value })
          }
          value={value.houseNumberTo}
        />
      </Box>
      <TextField
        fullWidth
        id="usage-location-description"
        label={t('permit.usage.locationDescription')}
        minRows={2}
        multiline
        name="locationDescription"
        onChange={(event) =>
          onChange({ ...value, locationDescription: event.target.value })
        }
        value={value.locationDescription}
      />
        <DataforsyningenMap
        onRoadLocationConfirm={(location) => {
          setRoadQuery('');
          onChange({ ...value, ...location });
        }}
      />
    </Box>
  );
}
