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

  // MUI links helperText to the input with aria-describedby.
  function fieldProps(field: AreaFormField, required = false) {
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

  const decimalInput = { htmlInput: { inputMode: 'decimal' as const } };

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      {roadEditable && (
        <Row>
          <TextField {...fieldProps('roadName', true)} />
          <TextField
            {...fieldProps('postalCode', true)}
            slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 4 } }}
          />
          <TextField {...fieldProps('roadOwnership', true)} select>
            {options(RoadOwnership, roadOwnershipLabelKeys)}
          </TextField>
        </Row>
      )}

      {fieldSet.details && (
        <>
          <Box>
            <Row>
              <TextField {...fieldProps('houseNumberFrom')} />
              <TextField {...fieldProps('houseNumberTo')} />
              <TextField {...fieldProps('alternativeDescription')} />
            </Row>
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
            <TextField
              {...fieldProps('lengthInMeters', true)}
              slotProps={decimalInput}
            />
            <TextField
              {...fieldProps('widthInMeters', true)}
              slotProps={decimalInput}
            />
            {fieldSet.depth && (
              <TextField
                {...fieldProps('depthInMeters', true)}
                slotProps={decimalInput}
              />
            )}
            <TextField
              fullWidth
              helperText={t('areas.areaCalculated')}
              id={`${idPrefix}-area`}
              label={t('areas.fields.areaInSquareMeters')}
              slotProps={{ htmlInput: { readOnly: true } }}
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
