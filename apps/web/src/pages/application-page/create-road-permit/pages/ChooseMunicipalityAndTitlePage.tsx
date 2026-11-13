import CheckIcon from '@mui/icons-material/Check';
import {
  Box,
  FormHelperText,
  InputBase,
  TextField,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { visuallyHidden } from '../../../../components/ui/visuallyHidden';
import { municipalities } from '../../../../data/municipalities';
import type { validateMunicipalityAndTitle } from '../validation';

type ChooseMunicipalityAndTitlePageProps = {
  errors?: ReturnType<typeof validateMunicipalityAndTitle>;
  title: string;
  municipalityName: string | null;
  onTitleChange: (title: string) => void;
  onMunicipalityChange: (municipalityName: string | null) => void;
};

/** Collects the title and lets the user filter and select a municipality. */
export function ChooseMunicipalityAndTitlePage({
  errors,
  title,
  municipalityName,
  onTitleChange,
  onMunicipalityChange,
}: ChooseMunicipalityAndTitlePageProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const query = search.trim().toLocaleLowerCase('da');
  const matches = municipalities.filter((name) =>
    name.toLocaleLowerCase('da').includes(query),
  );
  const description = errors?.municipality
    ? 'municipality-help municipality-error'
    : 'municipality-help';

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
      <TextField
        error={Boolean(errors?.title)}
        fullWidth
        helperText={errors?.title}
        id="application-title"
        label={t('permit.municipality.title')}
        name="title"
        onChange={(event) => onTitleChange(event.target.value)}
        placeholder={t('permit.municipality.titlePlaceholder')}
        required
        value={title}
      />
      <Box>
        <Box
          sx={{
            border: 1,
            borderColor: errors?.municipality ? 'error.dark' : 'text.secondary',
            borderRadius: 1,
            overflow: 'hidden',
          }}
        >
          <Typography id="municipality-help" sx={visuallyHidden}>
            {t('permit.municipality.help')}
          </Typography>
          <InputBase
            fullWidth
            id="municipality-search"
            inputProps={{
              'aria-controls': 'municipality-list',
              'aria-describedby': description,
              'aria-label': t('permit.municipality.search'),
            }}
            onChange={(event) => {
              setSearch(event.target.value);
              if (municipalityName !== null) onMunicipalityChange(null);
            }}
            placeholder={t('permit.municipality.searchPlaceholder')}
            sx={{
              minHeight: 56,
              px: 2,
              py: 1,
              borderBottom: 1,
              borderColor: 'divider',
              '& input::placeholder': { opacity: 1, color: 'text.secondary' },
              '&:focus-within': {
                outline: '2px solid',
                outlineColor: 'primary.main',
                outlineOffset: -3,
              },
            }}
            type="search"
            value={municipalityName ?? search}
          />
          <Box
            aria-describedby={
              errors?.municipality ? 'municipality-error' : undefined
            }
            component="fieldset"
            id="municipality-list"
            sx={{ border: 0, m: 0, minWidth: 0, p: 0 }}
          >
            <Box component="legend" sx={visuallyHidden}>
              {t('permit.municipality.required')}
            </Box>
            <Box
              sx={{
                height: { xs: 320, md: 'max(360px, calc(80svh - 400px))' },
                overflowY: 'auto',
                position: 'relative',
              }}
            >
              {matches.map((name) => {
                const selected = name === municipalityName;

                return (
                  <Box
                    component="label"
                    key={name}
                    sx={(theme) => ({
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 1,
                      position: 'relative',
                      cursor: 'pointer',
                      px: 2,
                      py: 0.5,
                      minHeight: 32,
                      boxSizing: 'border-box',
                      bgcolor: selected
                        ? alpha(theme.palette.primary.main, 0.14)
                        : undefined,
                      color: selected ? 'primary.dark' : undefined,
                      fontWeight: selected ? 700 : 400,
                      '&:hover': {
                        bgcolor: selected
                          ? alpha(theme.palette.primary.main, 0.2)
                          : 'action.hover',
                      },
                      '&:has(input:focus-visible)': {
                        outline: '2px solid',
                        outlineColor: 'primary.main',
                        outlineOffset: -3,
                      },
                    })}
                  >
                    <Box
                      checked={selected}
                      component="input"
                      name="municipality"
                      onChange={() => onMunicipalityChange(name)}
                      onFocus={(event) =>
                        event.currentTarget.parentElement?.scrollIntoView({
                          block: 'nearest',
                        })
                      }
                      required
                      sx={visuallyHidden}
                      type="radio"
                      value={name}
                    />
                    {name}
                    {selected && <CheckIcon aria-hidden fontSize="small" />}
                  </Box>
                );
              })}
              <Typography
                role="status"
                sx={matches.length ? visuallyHidden : { px: 2, py: 1 }}
              >
                {query &&
                  (matches.length
                    ? t('permit.municipality.matches', {
                        count: matches.length,
                      })
                    : t('permit.municipality.noMatches'))}
              </Typography>
            </Box>
          </Box>
        </Box>
        {errors?.municipality && (
          <FormHelperText error id="municipality-error">
            {errors.municipality}
          </FormHelperText>
        )}
      </Box>
    </Box>
  );
}
