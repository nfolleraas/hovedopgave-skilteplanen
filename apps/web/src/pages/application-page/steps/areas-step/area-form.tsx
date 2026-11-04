import { Box, MenuItem, TextField, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  areaFieldLabelKeys,
  directionLabelKeys,
  roadOwnershipLabelKeys,
  roadSectionLabelKeys,
  roadSideLabelKeys,
} from '../../../../features/areas/area-labels.js';
import {
  type AreaFieldErrors,
  type AreaFieldSet,
  calculateAreaInSquareMeters,
  formatSquareMeters,
} from '../../../../features/areas/area-validation.js';
import type {
  AreaFormField,
  AreaFormValues,
} from '../../../../types/area.types.js';
import {
  Direction,
  RoadOwnership,
  RoadSection,
  RoadSide,
} from '../../../../types/prisma-enums.js';
import { labelAboveSlots } from '../../components/form-fields.js';

interface AreaFormProps {
  idPrefix: string;
  values: AreaFormValues;
  errors: AreaFieldErrors;
  fieldSet: AreaFieldSet;
  roadEditable: boolean;
  disabled: boolean;
  onChange: (field: AreaFormField, value: string) => void;
}

export function AreaForm({
  idPrefix,
  values,
  errors,
  fieldSet,
  roadEditable,
  disabled,
  onChange,
}: AreaFormProps) {
  const { t } = useTranslation();
  const area = calculateAreaInSquareMeters(
    values.lengthInMeters,
    values.widthInMeters,
  );

  // MUI links the label and helperText to the input, so the label stays
  // accessible even though it is shown above the field.
  function fieldProps(
    field: AreaFormField,
    required = false,
    htmlInput?: Record<string, unknown>,
  ) {
    const error = errors[field];
    return {
      id: `${idPrefix}-${field}`,
      label: t(areaFieldLabelKeys[field]),
      value: values[field],
      onChange: (event: { target: { value: string } }) =>
        onChange(field, event.target.value),
      error: Boolean(error),
      helperText: error ? t(`areas.errors.${error}`) : undefined,
      required,
      disabled,
      fullWidth: true,
      slotProps: { ...labelAboveSlots, htmlInput },
    };
  }

  function options<T extends string>(
    enumValues: Record<string, T>,
    labelKeys: Record<T, string>,
  ): ReactNode[] {
    return Object.values(enumValues).map((value) => (
      <MenuItem key={value} value={value}>
        {t(labelKeys[value])}
      </MenuItem>
    ));
  }

  const decimalInput = { inputMode: 'decimal' };

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      {roadEditable && (
        <Row>
          <TextField {...fieldProps('roadName', true)} />
          <TextField
            {...fieldProps('postalCode', true, {
              inputMode: 'numeric',
              maxLength: 4,
            })}
          />
          <TextField {...fieldProps('roadOwnership', true)} select>
            {options(RoadOwnership, roadOwnershipLabelKeys)}
          </TextField>
        </Row>
      )}

      {fieldSet.details && (
        <>
          <Box>
            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr auto 1fr' },
              }}
            >
              <TextField {...fieldProps('houseNumberFrom')} />
              <TextField {...fieldProps('houseNumberTo')} />
              <Typography
                color="text.secondary"
                sx={{ alignSelf: 'end', pb: 2 }}
                variant="body2"
              >
                {t('areas.or')}
              </Typography>
              <TextField {...fieldProps('alternativeDescription')} />
            </Box>
            <Typography color="text.secondary" sx={{ mt: 0.5 }} variant="body2">
              {t('areas.houseNumberOrDescriptionHint')}
            </Typography>
          </Box>

          <Row>
            <TextField {...fieldProps('roadSection', true)} select>
              {options(RoadSection, roadSectionLabelKeys)}
            </TextField>
            <TextField {...fieldProps('roadSide', true)} select>
              {options(RoadSide, roadSideLabelKeys)}
            </TextField>
            {fieldSet.direction && (
              <TextField {...fieldProps('direction', true)} select>
                {options(Direction, directionLabelKeys)}
              </TextField>
            )}
          </Row>

          {values.roadSection === RoadSection.Other && (
            <TextField {...fieldProps('roadSectionDescription', true)} />
          )}

          <Row>
            <TextField {...fieldProps('lengthInMeters', true, decimalInput)} />
            <TextField {...fieldProps('widthInMeters', true, decimalInput)} />
            {fieldSet.depth && (
              <TextField {...fieldProps('depthInMeters', true, decimalInput)} />
            )}
            <TextField
              fullWidth
              helperText={t('areas.areaCalculated')}
              id={`${idPrefix}-area`}
              label={t('areas.fields.areaInSquareMeters')}
              slotProps={{
                ...labelAboveSlots,
                htmlInput: { readOnly: true },
              }}
              sx={{
                '& .MuiOutlinedInput-root': { backgroundColor: '#F5F5F5' },
              }}
              value={area === undefined ? '' : formatSquareMeters(area)}
            />
          </Row>
        </>
      )}
    </Box>
  );
}

function Row({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(auto-fit, minmax(0, 1fr))',
        },
      }}
    >
      {children}
    </Box>
  );
}
