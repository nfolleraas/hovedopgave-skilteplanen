import {
  Box,
  Button,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  DraftError,
  DraftErrors,
} from '../../../features/application-draft/draft-validation.js';
import { fieldId, labelAboveSlots } from './form-field-helpers.js';

export interface Option {
  value: string;
  label: string;
}

/**
 * Builds select options for a Prisma enum, labelled from
 * `wizard.enums.<name>.<value>`.
 * @param enumName - The name of the enum in the translation files
 * @param values - The enum values
 * @returns One option per enum value
 */
export function useEnumOptions(
  enumName: string,
  values: Record<string, string>,
): Option[] {
  const { t } = useTranslation();
  return Object.values(values).map((value) => ({
    value,
    label: t(`wizard.enums.${enumName}.${value}`),
  }));
}

interface FieldProps {
  path: string;
  label: string;
  errors: DraftErrors;
  required?: boolean;
  helperText?: string;
}

/**
 * Builds the shared props for a form field, including the id and the
 * translated error text.
 * @param props - The field path, label, errors, required flag and help text
 * @returns The props to pass to a MUI text field
 */
function useFieldProps({
  path,
  label,
  errors,
  required = false,
  helperText,
}: FieldProps) {
  const { t } = useTranslation();
  const error: DraftError | undefined = errors[path];
  return {
    id: fieldId(path),
    label,
    required,
    fullWidth: true,
    error: Boolean(error),
    helperText: error ? t(`wizard.errors.${error}`) : helperText,
  };
}

interface TextInputProps extends FieldProps {
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'date' | 'time' | 'email' | 'tel';
  multiline?: boolean;
  inputMode?: 'numeric' | 'decimal' | 'email' | 'tel';
  maxLength?: number;
}

/**
 * Text field for the wizard, with the label above the field.
 * @param props - The value, change handler, input options and field props
 * @returns The rendered text field
 */
export function TextInput({
  value,
  onChange,
  type = 'text',
  multiline = false,
  inputMode,
  maxLength,
  ...field
}: TextInputProps) {
  return (
    <TextField
      {...useFieldProps(field)}
      minRows={multiline ? 2 : undefined}
      multiline={multiline}
      onChange={(event) => onChange(event.target.value)}
      slotProps={{ ...labelAboveSlots, htmlInput: { inputMode, maxLength } }}
      type={type}
      value={value}
    />
  );
}

interface SelectInputProps extends FieldProps {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
}

/**
 * Select field for the wizard, with the label above the field.
 * @param props - The value, options, change handler and field props
 * @returns The rendered select field
 */
export function SelectInput({
  value,
  options,
  onChange,
  ...field
}: SelectInputProps) {
  return (
    <TextField
      {...useFieldProps(field)}
      onChange={(event) => onChange(event.target.value)}
      select
      slotProps={labelAboveSlots}
      value={value}
    >
      {options.map((option) => (
        <MenuItem key={option.value} value={option.value}>
          {option.label}
        </MenuItem>
      ))}
    </TextField>
  );
}

interface MultiSelectInputProps<T extends string> extends FieldProps {
  value: T[];
  options: Option[];
  onChange: (value: T[]) => void;
}

/**
 * Select where more than one value can be chosen (UC-028 step 3).
 * @param props - The chosen values, options, change handler and field props
 * @returns The rendered multi-select field
 */
export function MultiSelectInput<T extends string>({
  value,
  options,
  onChange,
  ...field
}: MultiSelectInputProps<T>) {
  const labels = new Map(options.map((option) => [option.value, option.label]));
  return (
    <TextField
      {...useFieldProps(field)}
      onChange={(event) => {
        const next = event.target.value as unknown as T[] | string;
        onChange((typeof next === 'string' ? next.split(',') : next) as T[]);
      }}
      select
      slotProps={{
        ...labelAboveSlots,
        select: {
          multiple: true,
          renderValue: (selected) =>
            (selected as string[])
              .map((item) => labels.get(item) ?? item)
              .join(', '),
        },
      }}
      value={value}
    >
      {options.map((option) => (
        <MenuItem key={option.value} value={option.value}>
          {option.label}
        </MenuItem>
      ))}
    </TextField>
  );
}

/**
 * Places fields side by side on wide screens and stacks them on small
 * screens.
 * @param props - The fields to place in the row
 * @returns The rendered row
 */
export function FieldRow({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        alignItems: 'start',
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

interface ItemCardProps {
  title: string;
  subtitle?: string;
  deleteLabel?: string;
  onDelete?: () => void;
  children: ReactNode;
}

/**
 * One item in a repeatable list, such as a task or a contact person.
 * @param props - The title, optional subtitle, optional delete button and
 * content
 * @returns The rendered card
 */
export function ItemCard({
  title,
  subtitle,
  deleteLabel,
  onDelete,
  children,
}: ItemCardProps) {
  const { t } = useTranslation();
  return (
    <Paper
      component="section"
      sx={{ border: '1px solid #BDBDBD', p: 2 }}
      variant="outlined"
    >
      <Box
        sx={{
          alignItems: 'center',
          display: 'flex',
          gap: 1,
          justifyContent: 'space-between',
          mb: 2,
        }}
      >
        <Box
          sx={{
            alignItems: 'baseline',
            columnGap: 1,
            display: 'flex',
            flexWrap: 'wrap',
          }}
        >
          <Typography component="h2" sx={{ fontWeight: 600 }} variant="body1">
            {title}
          </Typography>
          {subtitle && (
            <Typography color="text.secondary" variant="body2">
              {subtitle}
            </Typography>
          )}
        </Box>
        {onDelete && (
          <Button
            aria-label={deleteLabel}
            color="error"
            onClick={onDelete}
            size="small"
            variant="outlined"
          >
            {t('wizard.delete')}
          </Button>
        )}
      </Box>
      <Box sx={{ display: 'grid', gap: 2 }}>{children}</Box>
    </Paper>
  );
}

/**
 * Error for a whole list, e.g. "at least one contact person".
 * @param props - The list error, if any
 * @returns The rendered error, or null if there is no error
 */
export function ListError({ error }: { error?: DraftError }) {
  const { t } = useTranslation();
  if (!error) return null;
  return (
    <Typography color="error" role="alert" variant="body2">
      {t(`wizard.errors.${error}`)}
    </Typography>
  );
}
