import {
  Box,
  InputBase,
  MenuItem,
  MenuList,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';

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
  const [search, setSearch] = useState('');
  const filteredMunicipalities = municipalities.filter((municipality) =>
    municipality.name
      .toLocaleLowerCase('da')
      .includes(search.trim().toLocaleLowerCase('da')),
  );

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
      <Box
        sx={{
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          overflow: 'hidden',
          '&:focus-within': { borderColor: 'primary.main' },
        }}
      >
        <InputBase
          fullWidth
          id="municipality-search"
          inputProps={{
            'aria-label': 'Søg efter kommune',
            'aria-controls': 'municipality-list',
          }}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Søg efter kommune"
          sx={{
            minHeight: 56,
            px: 2,
            py: 1,
            borderBottom: 1,
            borderColor: 'divider',
          }}
          type="search"
          value={search}
        />
        <MenuList
          aria-label="Kommune"
          disablePadding
          id="municipality-list"
          role="listbox"
          sx={{
            height: { xs: 320, md: 'max(360px, calc(80svh - 400px))' },
            overflowY: 'auto',
          }}
        >
          {filteredMunicipalities.map((municipality) => (
            <MenuItem
              aria-selected={municipality.id === municipalityId}
              key={municipality.id}
              onClick={() => {
                onMunicipalityChange(municipality.id)
                setSearch(municipality.name)
              }}
              role="option"
              selected={municipality.id === municipalityId}
            >
              {municipality.name}
            </MenuItem>
          ))}
          {filteredMunicipalities.length === 0 && (
            <Typography color="text.secondary" sx={{ p: 2 }}>
              Ingen kommuner fundet
            </Typography>
          )}
        </MenuList>
      </Box>
    </Box>
  );
}
