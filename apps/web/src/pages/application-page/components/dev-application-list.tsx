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
import { labelAboveSlots } from './form-fields.js';

export function applicationUrl(caseNumber: string): string {
  return `/ansoegning?${new URLSearchParams({ sag: caseNumber })}`;
}

/**
 * Test-only list shown at /ansoegning without a case number, so a test
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
      window.location.assign(applicationUrl(application.caseNumber));
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
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        {t('devApplications.intro')}
      </Typography>

      <Box
        sx={{
          alignItems: 'end',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
          mb: 3,
        }}
      >
        <TextField
          id="dev-application-type"
          label={t('devApplications.type')}
          onChange={(event) =>
            setType(event.target.value as SupportedApplicationType)
          }
          select
          slotProps={labelAboveSlots}
          sx={{ minWidth: 260 }}
          value={type}
        >
          {supportedApplicationTypes.map((value) => (
            <MenuItem key={value} value={value}>
              {t(`areas.labels.applicationType.${value}`)}
            </MenuItem>
          ))}
        </TextField>
        <Button
          disabled={isCreating}
          onClick={() => void create()}
          sx={{ height: 56 }}
          variant="contained"
        >
          {t('devApplications.create')}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {applications === null ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress aria-label={t('devApplications.loading')} />
        </Box>
      ) : applications.length === 0 ? (
        <Typography color="text.secondary">
          {t('devApplications.none')}
        </Typography>
      ) : (
        <Paper sx={{ border: '1px solid #BDBDBD' }} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('devApplications.caseNumber')}</TableCell>
                <TableCell>{t('devApplications.type')}</TableCell>
                <TableCell>{t('devApplications.status')}</TableCell>
                <TableCell align="right">
                  {t('devApplications.areaCount')}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {applications.map((application) => (
                <TableRow hover key={application.caseNumber}>
                  <TableCell>
                    <Link
                      href={applicationUrl(application.caseNumber)}
                      sx={{ fontWeight: 600 }}
                    >
                      {application.caseNumber}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {t(`areas.labels.applicationType.${application.type}`)}
                  </TableCell>
                  <TableCell>
                    {t(`devApplications.statuses.${application.status}`)}
                  </TableCell>
                  <TableCell align="right">{application.areaCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
    </section>
  );
}
