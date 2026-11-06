import { Box, MenuItem, TextField, Typography } from '@mui/material';
import { DataforsyningenMap } from '../../../../components/ui/map/DataforsyningenMap';
import type { UsageDetails } from '../formTypes';

type UsageDetailsPageProps = {
  value: UsageDetails;
  onChange: (value: UsageDetails) => void;
};

// Example choices until the application requirements define the usage types.
const usageTypes = ['Byggearbejde', 'Arrangement', 'Andet'];

export function UsageDetailsPage({ value, onChange }: UsageDetailsPageProps) {
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
      <Typography component="h2" variant="h5">
        Detaljer om anvendelse
      </Typography>
      <TextField
        fullWidth
        id="usage-type"
        label="Anvendelse"
        name="usage"
        onChange={(event) => onChange({ ...value, usage: event.target.value })}
        select
        value={value.usage}
      >
        <MenuItem disabled value="">
          Vælg anvendelse...
        </MenuItem>
        {usageTypes.map((usage) => (
          <MenuItem key={usage} value={usage}>
            {usage}
          </MenuItem>
        ))}
      </TextField>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
          gap: 3,
        }}
      >
        <TextField
          fullWidth
          id="usage-start-date"
          label="Startdato"
          name="startDate"
          onChange={(event) =>
            onChange({ ...value, startDate: event.target.value })
          }
          slotProps={{ inputLabel: { shrink: true } }}
          type="date"
          value={value.startDate}
        />
        <TextField
          fullWidth
          id="usage-end-date"
          label="Slutdato"
          name="endDate"
          onChange={(event) =>
            onChange({ ...value, endDate: event.target.value })
          }
          slotProps={{
            inputLabel: { shrink: true },
            htmlInput: { min: value.startDate || undefined },
          }}
          type="date"
          value={value.endDate}
        />
      </Box>
      <DataforsyningenMap title="Kort over anvendelsesområdet" />
      <Typography component="h3" variant="h6">
        Steddetaljer
      </Typography>
      <TextField
        fullWidth
        id="usage-road"
        label="Vej"
        name="road"
        onChange={(event) => onChange({ ...value, road: event.target.value })}
        value={value.road}
      />
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 3,
        }}
      >
        <TextField
          fullWidth
          id="usage-house-number-from"
          label="Husnr. fra"
          name="houseNumberFrom"
          onChange={(event) =>
            onChange({ ...value, houseNumberFrom: event.target.value })
          }
          value={value.houseNumberFrom}
        />
        <TextField
          fullWidth
          id="usage-house-number-to"
          label="Husnr. til"
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
        label="Yderligere beskrivelse"
        minRows={2}
        multiline
        name="locationDescription"
        onChange={(event) =>
          onChange({ ...value, locationDescription: event.target.value })
        }
        value={value.locationDescription}
      />
    </Box>
  );
}
