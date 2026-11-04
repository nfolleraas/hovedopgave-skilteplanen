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

/** Shows the label above the field, as in the wireframe, instead of inside. */
export const labelAboveSlots = {
  inputLabel: {
    shrink: true,
    sx: {
      color: 'text.primary',
      fontSize: 14,
      fontWeight: 600,
      mb: 0.75,
      position: 'static',
      transform: 'none',
    },
  },
  input: { notched: false },
};

export interface Option {
  value: string;
  label: string;
}

/** Options for a Prisma enum, labelled from `wizard.enums.<name>.<value>`. */
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

/** Turns a field path such as `actors.<id>.email` into a valid element id. */
export function fieldId(path: string): string {
  return `field-${path.replace(/[^a-zA-Z0-9-]/g, '-')}`;
}

interface FieldProps {
  path: string;
  label: string;
  errors: DraftErrors;
  required?: boolean;
  helperText?: string;
}

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

/** Select where more than one value can be chosen (UC-028 step 3). */
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

/** Fields side by side on wide screens, stacked on small screens. */
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

/** One item in a repeatable list, such as a task or a contact person. */
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

/** Error for a whole list, e.g. "at least one contact person". */
export function ListError({ error }: { error?: DraftError }) {
  const { t } = useTranslation();
  if (!error) return null;
  return (
    <Typography color="error" role="alert" variant="body2">
      {t(`wizard.errors.${error}`)}
    </Typography>
  );
}
