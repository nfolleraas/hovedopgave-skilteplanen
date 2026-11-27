import { Alert, Box, Button, Paper, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type {
  ContactPersonFieldErrors,
  ContactPersonFieldSet,
} from '../../../../features/contact-persons/contact-person-validation.js';
import type {
  ContactPersonFormField,
  ContactPersonFormValues,
} from '../../../../types/contact-person.types.js';
import { ContactForm } from './contact-form.js';
import { contactPanelIds } from './contact-step-ids.js';

interface ContactPanelProps {
  /** True for a contact person that has not been saved yet. */
  isNew: boolean;
  /** Level of the form's heading inside its actor section. */
  headingLevel: number;
  values: ContactPersonFormValues;
  /** Every current error; the form decides which ones to show. */
  errors: ContactPersonFieldErrors;
  /** True after the user tried to save, so every error is shown. */
  showAllErrors: boolean;
  fieldSet: ContactPersonFieldSet;
  isSaving: boolean;
  saveError: string | null;
  onChange: (field: ContactPersonFormField, value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

/**
 * The form for a new (UC-031) or an existing (UC-033) contact person. It is
 * shown inside the actor the contact person belongs to.
 */
export function ContactPanel({
  isNew,
  headingLevel,
  values,
  errors,
  showAllErrors,
  fieldSet,
  isSaving,
  saveError,
  onChange,
  onSave,
  onCancel,
}: ContactPanelProps) {
  const { t } = useTranslation();
  const showSummary = showAllErrors && Object.keys(errors).length > 0;

  return (
    <Paper
      aria-labelledby={contactPanelIds.title}
      component="form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
      sx={{ border: '1px solid #1562AD', p: 2 }}
      variant="outlined"
    >
      <Typography
        component={`h${headingLevel}` as 'h4' | 'h5'}
        id={contactPanelIds.title}
        sx={{ fontWeight: 600, mb: 2 }}
        tabIndex={-1}
        variant="body1"
      >
        {isNew ? t('contacts.newContact') : t('contacts.editTitle')}
      </Typography>

      {showSummary && (
        <Alert
          id={contactPanelIds.errorSummary}
          severity="error"
          sx={{ mb: 2 }}
        >
          {t('contacts.cannotSaveYet')}
        </Alert>
      )}

      <Box sx={{ display: 'grid', gap: 2 }}>
        <ContactForm
          disabled={isSaving}
          errors={errors}
          fieldSet={fieldSet}
          onChange={onChange}
          showAllErrors={showAllErrors}
          values={values}
        />
      </Box>

      {saveError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {saveError}
        </Alert>
      )}

      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1,
          justifyContent: 'flex-end',
          mt: 2,
        }}
      >
        {/* Secondary button style from the stylesheet. */}
        <Button
          color="inherit"
          disabled={isSaving}
          onClick={onCancel}
          sx={{ backgroundColor: '#424242', color: 'common.white' }}
          variant="contained"
        >
          {t('contacts.cancel')}
        </Button>
        <Button disabled={isSaving} type="submit" variant="contained">
          {isNew ? t('contacts.save') : t('contacts.saveChanges')}
        </Button>
      </Box>
    </Paper>
  );
}
