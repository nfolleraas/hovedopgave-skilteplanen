import {
  Box,
  FormHelperText,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import { type ReactNode, useState } from 'react';
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
  areaTextMaxLengths,
  calculateAreaInSquareMeters,
  formatErrors,
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

/** Fields that show how many characters are left while typing. */
const countedFields: ReadonlySet<AreaFormField> = new Set([
  'alternativeDescription',
  'roadSectionDescription',
]);

/** Postal codes are digits only, so other characters are not typed in. */
function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

interface AreaFormProps {
  idPrefix: string;
  values: AreaFormValues;
  /** All current errors in the form. */
  errors: AreaFieldErrors;
  /**
   * True after the user tried to save: every error is shown. Before that,
   * only format errors in fields the user has left are shown.
   */
  showAllErrors: boolean;
  fieldSet: AreaFieldSet;
  /** Road name and postal code can only be changed for manual roads. */
  roadEditable: boolean;
  disabled: boolean;
  onChange: (field: AreaFormField, value: string) => void;
}

export function AreaForm({
  idPrefix,
  values,
  errors,
  showAllErrors,
  fieldSet,
  roadEditable,
  disabled,
  onChange,
}: AreaFormProps) {
  const { t } = useTranslation();
  // Fields the user has left. Their format errors are shown while typing on.
  const [touched, setTouched] = useState<ReadonlySet<AreaFormField>>(
    () => new Set(),
  );
  const area = calculateAreaInSquareMeters(
    values.lengthInMeters,
    values.widthInMeters,
  );

  function visibleError(field: AreaFormField) {
    const error = errors[field];
    if (!error) return undefined;
    if (showAllErrors) return error;
    return touched.has(field) && formatErrors.includes(error)
      ? error
      : undefined;
  }

  function helperText(field: AreaFormField): ReactNode {
    const error = visibleError(field);
    const errorText = error ? t(`areas.errors.${error}`) : undefined;
    if (!countedFields.has(field)) return errorText;

    const max = areaTextMaxLengths[field as keyof typeof areaTextMaxLengths];
    return (
      <Box
        component="span"
        sx={{ display: 'flex', gap: 1, justifyContent: 'space-between' }}
      >
        <span>{errorText}</span>
        <Box component="span" sx={{ flexShrink: 0 }}>
          {t('areas.characterCount', { length: values[field].length, max })}
        </Box>
      </Box>
    );
  }

  // MUI links the label and helperText to the input, so the label stays
  // accessible even though it is shown above the field.
  function fieldProps(
    field: AreaFormField,
    required = false,
    htmlInput?: Record<string, unknown>,
  ) {
    const id = `${idPrefix}-${field}`;
    const maxLength =
      areaTextMaxLengths[field as keyof typeof areaTextMaxLengths];
    return {
      id,
      label: t(areaFieldLabelKeys[field]),
      value: values[field],
      onChange: (event: { target: { value: string } }) =>
        onChange(
          field,
          field === 'postalCode'
            ? digitsOnly(event.target.value)
            : event.target.value,
        ),
      onBlur: () =>
        setTouched((current) =>
          current.has(field) ? current : new Set(current).add(field),
        ),
      error: Boolean(visibleError(field)),
      helperText: helperText(field),
      required,
      disabled,
      fullWidth: true,
      slotProps: { ...labelAboveSlots, htmlInput: { maxLength, ...htmlInput } },
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
  // replaces MUI's own aria-describedby, so the helper text (error or
  // character count) is added too.
  const hintId = `${idPrefix}-house-number-hint`;
  function withHint(field: AreaFormField) {
    const hasHelperText = visibleError(field) || countedFields.has(field);
    const describedBy = hasHelperText
      ? `${idPrefix}-${field}-helper-text ${hintId}`
      : hintId;
    return fieldProps(field, false, { 'aria-describedby': describedBy });
  }

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      {/* The road status can be corrected on every area, because the
          applicant chose it and the database does not remember whether a
          road was entered manually. */}
      <Row columns={3}>
        {roadEditable && <TextField {...fieldProps('roadName', true)} />}
        {roadEditable && (
          // Not type="number": it drops leading zeros and allows `e`.
          <TextField
            {...fieldProps('postalCode', true, {
              inputMode: 'numeric',
              maxLength: 4,
              pattern: '[0-9]*',
            })}
          />
        )}
        <TextField {...fieldProps('roadOwnership', true)} select>
          {options(RoadOwnership, roadOwnershipLabelKeys)}
        </TextField>
      </Row>

      {/* Top-aligned, so a taller description box does not move the other
          fields or the "eller" text. The description gets the same width as
          both house number fields together. */}
      <Box
        sx={{
          alignItems: 'start',
          display: 'grid',
          gap: 2,
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'minmax(0, 2fr) auto minmax(0, 2fr)',
          },
        }}
      >
        <Box>
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            }}
          >
            <TextField {...withHint('houseNumberFrom')} />
            <TextField {...withHint('houseNumberTo')} />
          </Box>
          {/* Styled as helper text, so it lines up with the character count
              below the description and sits right under the fields it
              explains. */}
          <FormHelperText id={hintId}>
            {t('areas.houseNumberOrDescriptionHint')}
          </FormHelperText>
        </Box>
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

/**
 * Fields side by side from the `sm` breakpoint. With `columns`, the width of
 * a column stays the same when some of the fields are hidden.
 */
function Row({ children, columns }: { children: ReactNode; columns?: number }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: {
          xs: '1fr',
          sm: columns
            ? `repeat(${columns}, minmax(0, 1fr))`
            : 'repeat(auto-fit, minmax(0, 1fr))',
        },
      }}
    >
      {children}
    </Box>
  );
}
