import { Alert, Box, Button, Paper, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import {
  availabilityLabelKeys,
  contactPersonFieldLabelKeys,
} from '../../../features/contact-persons/contact-person-labels.js';
import type {
  ContactPersonFieldErrors,
  ContactPersonFieldSet,
} from '../../../features/contact-persons/contact-person-validation.js';
import type {
  ContactPerson,
  ContactPersonFormField,
  ContactPersonFormValues,
} from '../../../types/contact-person.types.js';
import { ContactForm } from './contact-form.js';

/** Element ids, so the page can move focus to a card. */
export const contactCardIds = {
  title: (key: string) => `contact-${key}-title`,
  edit: (key: string) => `contact-${key}-edit`,
  delete: (key: string) => `contact-${key}-delete`,
};

const detailFields = ['phoneNumber', 'email'] as const;

interface ContactCardProps {
  contactKey: string;
  /** The actor the contact person belongs to, e.g. "Firma A/S (Entreprenør)". */
  actorLabel: string;
  number: number;
  saved: ContactPerson | null;
  isExpanded: boolean;
  canEditApplication: boolean;
  fieldSet: ContactPersonFieldSet;
  draft: ContactPersonFormValues | null;
  errors: ContactPersonFieldErrors;
  isSaving: boolean;
  saveError: string | null;
  onEdit: () => void;
  onDelete: () => void;
  onChange: (field: ContactPersonFormField, value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function ContactCard({
  contactKey,
  actorLabel,
  number,
  saved,
  isExpanded,
  canEditApplication,
  fieldSet,
  draft,
  errors,
  isSaving,
  saveError,
  onEdit,
  onDelete,
  onChange,
  onSave,
  onCancel,
}: ContactCardProps) {
  const { t } = useTranslation();
  const titleId = contactCardIds.title(contactKey);
  const name = (isExpanded ? draft?.name : undefined) || saved?.name;
  const title = t('contacts.cardTitle', {
    number,
    name: name || t('contacts.newContact'),
  });

  return (
    <Paper
      aria-labelledby={titleId}
      component="section"
      sx={{
        border: isExpanded ? '2px solid #1562AD' : '1px solid #BDBDBD',
        p: 2,
      }}
      variant="outlined"
    >
      <Box
        sx={{
          alignItems: 'center',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1,
          justifyContent: 'space-between',
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
          <Typography
            component="h2"
            id={titleId}
            sx={{ fontWeight: 600 }}
            tabIndex={-1}
            variant="body1"
          >
            {title}
          </Typography>
          {saved && (
            <Typography color="text.secondary" variant="body2">
              {t(availabilityLabelKeys[saved.availability])}
            </Typography>
          )}
        </Box>
        {canEditApplication && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            {!isExpanded && (
              <Button
                aria-label={t('contacts.editContactFor', { contact: title })}
                id={contactCardIds.edit(contactKey)}
                onClick={onEdit}
                size="small"
                variant="outlined"
              >
                {t('contacts.edit')}
              </Button>
            )}
            <Button
              aria-label={t('contacts.deleteContactFor', { contact: title })}
              color="error"
              id={contactCardIds.delete(contactKey)}
              onClick={onDelete}
              size="small"
              variant="outlined"
            >
              {t('contacts.delete')}
            </Button>
          </Box>
        )}
      </Box>

      {actorLabel && (
        <Typography color="text.secondary" sx={{ mt: 0.5 }} variant="body2">
          {t('contacts.forActor', { actor: actorLabel })}
        </Typography>
      )}

      {!isExpanded && saved && (
        <Box
          component="dl"
          sx={{
            columnGap: 3,
            display: 'flex',
            flexWrap: 'wrap',
            m: 0,
            mt: 1,
            rowGap: 0.5,
          }}
        >
          {detailFields.map((field) => (
            <Box key={field} sx={{ display: 'flex', gap: 0.5 }}>
              <Typography color="text.secondary" component="dt" variant="body2">
                {t(contactPersonFieldLabelKeys[field])}:
              </Typography>
              <Typography component="dd" sx={{ m: 0 }} variant="body2">
                {saved[field] || '–'}
              </Typography>
            </Box>
          ))}
        </Box>
      )}

      {isExpanded && draft && (
        <Box sx={{ mt: 2 }}>
          <ContactForm
            disabled={isSaving}
            errors={errors}
            fieldSet={fieldSet}
            idPrefix={`contact-${contactKey}`}
            onChange={onChange}
            values={draft}
          />
          {saveError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {saveError}
            </Alert>
          )}
          <Box
            sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 2 }}
          >
            <Button disabled={isSaving} onClick={onCancel} variant="outlined">
              {t('contacts.cancel')}
            </Button>
            <Button disabled={isSaving} onClick={onSave} variant="contained">
              {t('contacts.save')}
            </Button>
          </Box>
        </Box>
      )}
    </Paper>
  );
}
