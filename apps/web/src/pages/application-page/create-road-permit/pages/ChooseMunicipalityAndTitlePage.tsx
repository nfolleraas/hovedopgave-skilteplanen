import { Autocomplete, Box, TextField, Typography } from '@mui/material';

import { municipalities } from '../../../../data/municipalities';

type ChooseMunicipalityAndTitlePageProps = {
  title: string;
  municipalityId: string | null;
  onTitleChange: (title: string) => void;
  onMunicipalityChange: (municipalityId: string | null) => void;
};

export function ChooseMunicipalityAndTitlePage({
  title,
  municipalityId,
  onTitleChange,
  onMunicipalityChange,
}: ChooseMunicipalityAndTitlePageProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        width: '100%',
        maxWidth: 640,
        mx: 'auto',
      }}
    >
      <Typography component="h2" variant="h5">
        Kommune & titel
      </Typography>
      <TextField
        fullWidth
        id="application-title"
        label="Titel"
        name="title"
        onChange={(event) => onTitleChange(event.target.value)}
        placeholder="Indtast en titel på ansøgningen"
        value={title}
      />
      <Autocomplete
        clearText="Ryd"
        closeText="Luk"
        disablePortal
        fullWidth
        getOptionKey={(option) => option.id}
        getOptionLabel={(option) => option.name}
        id="municipality"
        isOptionEqualToValue={(option, value) => option.id === value.id}
        noOptionsText="Ingen kommuner fundet"
        onChange={(_, municipality) =>
          onMunicipalityChange(municipality?.id ?? null)
        }
        openText="Åbn"
        options={municipalities}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Kommune"
            name="municipality"
            placeholder="Søg efter kommune"
          />
        )}
        value={
          municipalities.find(
            (municipality) => municipality.id === municipalityId,
          ) ?? null
        }
      />
    </Box>
  );
}
