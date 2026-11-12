import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Link,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  createDevApplication,
  type DevApplication,
  getDevApplications,
} from '../../../api/dev-applications.api.js';
import {
  type SupportedApplicationType,
  supportedApplicationTypes,
} from '../../../types/application.types.js';
import { ApplicationType } from '../../../types/prisma-enums.js';
import { labelAboveSlots } from './form-slots.js';

export function contactsUrl(caseNumber: string): string {
  return `/kontaktpersoner?${new URLSearchParams({ sag: caseNumber })}`;
}

/**
 * Test-only list shown at /kontaktpersoner without a case number, so a test
 * application can be opened or created without typing the URL.
 */
export function DevApplicationList() {
  const { t } = useTranslation();
  const [applications, setApplications] = useState<DevApplication[] | null>(
    null,
  );
  const [type, setType] = useState<SupportedApplicationType>(
    ApplicationType.ExcavationPermit,
  );
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDevApplications()
      .then(setApplications)
      .catch(() => {
        setApplications([]);
        setError(t('devApplications.loadError'));
      });
  }, [t]);

  async function create() {
    setIsCreating(true);
    setError(null);
    try {
      const application = await createDevApplication(type);
      window.location.assign(contactsUrl(application.caseNumber));
    } catch {
      setError(t('devApplications.createError'));
      setIsCreating(false);
    }
  }

  return (
    <section aria-labelledby="dev-applications-title">
      <Typography
        component="h1"
        id="dev-applications-title"
        sx={{ mb: 1 }}
        variant="h5"
      >
        {t('devApplications.title')}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }} variant="body2">
        {t('devApplications.intro')}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ alignItems: 'end', display: 'flex', gap: 2, mb: 3 }}>
        <TextField
          id="dev-application-type"
          label={t('devApplications.type')}
          onChange={(event) =>
            setType(event.target.value as SupportedApplicationType)
          }
          select
          slotProps={labelAboveSlots}
          sx={{ minWidth: 220 }}
          value={type}
        >
          {supportedApplicationTypes.map((value) => (
            <MenuItem key={value} value={value}>
              {t(`devApplications.types.${value}`)}
            </MenuItem>
          ))}
        </TextField>
        <Button
          disabled={isCreating}
          onClick={() => void create()}
          variant="contained"
        >
          {t('devApplications.create')}
        </Button>
      </Box>

      {applications === null ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress aria-label={t('devApplications.loading')} />
        </Box>
      ) : applications.length === 0 ? (
        <Typography variant="body2">{t('devApplications.none')}</Typography>
      ) : (
        <Paper variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('devApplications.caseNumber')}</TableCell>
                <TableCell>{t('devApplications.type')}</TableCell>
                <TableCell>{t('devApplications.status')}</TableCell>
                <TableCell>{t('devApplications.contactPersonCount')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {applications.map((application) => (
                <TableRow key={application.caseNumber}>
                  <TableCell>
                    <Link href={contactsUrl(application.caseNumber)}>
                      {application.caseNumber}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {t(`devApplications.types.${application.type}`, {
                      defaultValue: application.type,
                    })}
                  </TableCell>
                  <TableCell>
                    {t(`devApplications.statuses.${application.status}`)}
                  </TableCell>
                  <TableCell>{application.contactPersonCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
    </section>
  );
}
