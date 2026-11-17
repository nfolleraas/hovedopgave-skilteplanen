import {
  Alert,
  Box,
  Button,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { actorRoleLabelKeys } from '../../../../features/contact-persons/contact-person-labels.js';
import type {
  ContactPersonFieldErrors,
  ContactPersonFieldSet,
} from '../../../../features/contact-persons/contact-person-validation.js';
import type {
  ContactPersonActor,
  ContactPersonFormField,
  ContactPersonFormValues,
} from '../../../../types/contact-person.types.js';
import { labelAboveSlots } from '../../components/form-fields.js';
import { ContactForm } from './contact-form.js';

/** Element ids, so the step can move focus into the panel. */
export const contactPanelIds = {
  title: 'contact-panel-title',
  actor: 'contact-form-actor',
  errorSummary: 'contact-panel-errors',
};

interface ContactPanelProps {
  /** True for a contact person that has not been saved yet. */
  isNew: boolean;
  actors: ContactPersonActor[];
  actorId: string;
  values: ContactPersonFormValues;
  /** Every current error; the form decides which ones to show. */
  errors: ContactPersonFieldErrors;
  /** True after the user tried to save, so every error is shown. */
  showAllErrors: boolean;
  fieldSet: ContactPersonFieldSet;
  isSaving: boolean;
  saveError: string | null;
  onActorChange: (actorId: string) => void;
  onChange: (field: ContactPersonFormField, value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

/** The form for a new (UC-031) or an existing (UC-033) contact person. */
export function ContactPanel({
  isNew,
  actors,
  actorId,
  values,
  errors,
  showAllErrors,
  fieldSet,
  isSaving,
  saveError,
  onActorChange,
  onChange,
  onSave,
  onCancel,
}: ContactPanelProps) {
  const { t } = useTranslation();
  const showSummary = showAllErrors && Object.keys(errors).length > 0;

  function actorLabel(actor: ContactPersonActor): string {
    return t('contacts.actorLabel', {
      name: actor.name,
      role: t(actorRoleLabelKeys[actor.role]),
    });
  }
  const actor = actors.find((candidate) => candidate.uuid === actorId);

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
        component="h2"
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
        {isNew ? (
          // A contact person belongs to an actor on the application.
          <TextField
            disabled={isSaving}
            fullWidth
            id={contactPanelIds.actor}
            label={t('contacts.actor')}
            onChange={(event) => onActorChange(event.target.value)}
            required
            select
            slotProps={labelAboveSlots}
            value={actorId}
          >
            {actors.map((candidate) => (
              <MenuItem key={candidate.uuid} value={candidate.uuid}>
                {actorLabel(candidate)}
              </MenuItem>
            ))}
          </TextField>
        ) : (
          // The API does not move a saved contact person to another actor.
          <TextField
            fullWidth
            id={contactPanelIds.actor}
            label={t('contacts.actorReadOnly')}
            slotProps={{ ...labelAboveSlots, htmlInput: { readOnly: true } }}
            value={actor ? actorLabel(actor) : ''}
          />
        )}
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
