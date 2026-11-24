import { Alert, Button, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { ContactsStep } from '../../steps/contacts-step/contacts-step.js';
import type { useContactPersons } from '../useContactPersons.js';

type ContactPersonsPageProps = {
  contacts: ReturnType<typeof useContactPersons>;
};

/** Lets the applicant add, edit, and delete the draft's contact persons. */
export function ContactPersonsPage({ contacts }: ContactPersonsPageProps) {
  const { t } = useTranslation();
  const { load, state, dispatch, retry } = contacts;

  if (load.status === 'loading') {
    return <Typography role="status">{t('permit.contact.loading')}</Typography>;
  }
  if (load.status === 'error') {
    return (
      <Alert
        action={
          <Button color="inherit" onClick={retry} sx={{ minHeight: 44 }}>
            {t('permit.contact.retry')}
          </Button>
        }
        severity="error"
      >
        {t('permit.contact.loadError')}
      </Alert>
    );
  }
  return (
    <ContactsStep
      actors={load.actors}
      application={load.application}
      dispatch={dispatch}
      embedded
      state={state}
    />
  );
}
