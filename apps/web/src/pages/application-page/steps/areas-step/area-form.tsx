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

/** The description box grows with its text up to this height. */
const descriptionMaxHeight = '100px';
/** MUI's vertical padding inside an outlined input. */
const outlinedInputPadding = '16.5px';
/** Height of a single-line outlined input: one 16px line + padding. */
const singleLineInputHeight = `calc(16px * 1.4375 + 2 * ${outlinedInputPadding})`;
/** Label above a field: 14px text, 1.4375em line height, 6px margin. */
const labelAboveHeight = 'calc(14px * 1.4375 + 6px)';

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
    const id = `${idPrefix}-${field}`;
    return {
      id,
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

  // The hint below the house number fields is read with each of them. This
  // replaces MUI's own aria-describedby, so the error text is added too.
  const hintId = `${idPrefix}-house-number-hint`;
  function withHint(field: AreaFormField) {
    const describedBy = errors[field]
      ? `${idPrefix}-${field}-helper-text ${hintId}`
      : hintId;
    return fieldProps(field, false, { 'aria-describedby': describedBy });
  }

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

      <Box>
        {/* Top-aligned, so a taller description box does not move the
            other fields or the "eller" text. */}
        <Box
          sx={{
            alignItems: 'start',
            display: 'grid',
            gap: 2,
            // The description gets twice the width of a house number field.
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr auto 2fr' },
          }}
        >
          <TextField {...withHint('houseNumberFrom')} />
          <TextField {...withHint('houseNumberTo')} />
          <Typography
            color="text.secondary"
            sx={{
              alignItems: 'center',
              display: 'flex',
              // Next to the fields, centred on a single-line input box.
              height: { sm: singleLineInputHeight },
              mt: { sm: labelAboveHeight },
            }}
            variant="body2"
          >
            {t('areas.or')}
          </Typography>
          <TextField
            {...withHint('alternativeDescription')}
            minRows={1}
            multiline
            sx={{
              '& textarea': {
                maxHeight: `calc(${descriptionMaxHeight} - 2 * ${outlinedInputPadding})`,
                // MUI sets overflow inline while it resizes the box.
                overflowY: 'auto !important',
              },
            }}
          />
        </Box>
        <Typography
          color="text.secondary"
          id={hintId}
          sx={{ mt: 0.5 }}
          variant="body2"
        >
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
