import { Alert, Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { ContactNotice } from './use-contact-deletion.js';

interface ContactsStepHeaderProps {
  /** Inside another form, which renders the heading itself. */
  embedded: boolean;
  canEdit: boolean;
  notice: ContactNotice | null;
  onCloseNotice: () => void;
}

/** The heading, introduction, read-only notice and the latest message. */
export function ContactsStepHeader({
  embedded,
  canEdit,
  notice,
  onCloseNotice,
}: ContactsStepHeaderProps) {
  const { t } = useTranslation();
  return (
    <>
      {!embedded && (
        <Typography
          component="h1"
          id="step-title"
          sx={{ mb: 1 }}
          tabIndex={-1}
          variant="h5"
        >
          {t('applicationWizard.steps.contactInfo')}
        </Typography>
      )}
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        {t('contacts.intro')}
      </Typography>
      {!canEdit && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t('contacts.notEditable')}
        </Alert>
      )}

      <Box aria-live="polite" role="status">
        {notice && (
          <Alert
            onClose={onCloseNotice}
            severity={notice.severity}
            sx={{ mb: 2 }}
          >
            {notice.message}
          </Alert>
        )}
      </Box>
    </>
  );
}
