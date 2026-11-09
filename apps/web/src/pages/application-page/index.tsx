import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import {
  createActor,
  getApplicationActors,
  type SavedActor,
} from '../../api/actors.api.js';
import { ActorForm } from './actor-form.js';
import type { ActorDraft, ApplicationType } from './actor-form.validation.js';

export default function ApplicationPage() {
  const { t } = useTranslation();
  const { caseNumber } = useParams<{ caseNumber: string }>();
  const [actors, setActors] = useState<SavedActor[]>([]);
  const [applicationType, setApplicationType] =
    useState<ApplicationType | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(caseNumber));
  const [isSaving, setIsSaving] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const selectedActor = actors.find((actor) => actor.uuid === selectedId);

  useEffect(() => {
    if (!caseNumber) return;
    let active = true;
    setIsLoading(true);
    setLoadFailed(false);
    setIsCreating(false);
    setSelectedId(null);
    getApplicationActors(caseNumber)
      .then((application) => {
        if (!active) return;
        setActors(application.actors);
        setApplicationType(application.type);
      })
      .catch(() => {
        if (active) setLoadFailed(true);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [caseNumber]);

  async function addActor(draft: ActorDraft) {
    if (!caseNumber) return;
    setIsSaving(true);
    setSaveFailed(false);
    try {
      const saved = await createActor(caseNumber, draft);
      setActors((current) => [...current, saved]);
      setSelectedId(saved.uuid);
      setIsCreating(false);
    } catch {
      setSaveFailed(true);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main>
      <Container sx={{ py: { xs: 3, md: 5 } }}>
        <Typography component="h1" sx={{ mb: 1 }} variant="h4">
          {t('actors.pageTitle')}
        </Typography>
        {!caseNumber ? (
          <Alert severity="info">{t('actors.noApplicationSelected')}</Alert>
        ) : isLoading ? (
          <CircularProgress aria-label={t('actors.loading')} />
        ) : loadFailed ? (
          <Alert severity="error">{t('actors.loadFailed')}</Alert>
        ) : (
          <>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              {caseNumber}
            </Typography>
            {saveFailed && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {t('actors.saveFailed')}
              </Alert>
            )}
            <Box
              sx={{
                display: 'grid',
                gap: 3,
                gridTemplateColumns: {
                  xs: '1fr',
                  md: 'minmax(220px, 1fr) 3fr',
                },
              }}
            >
              <Paper component="section" sx={{ p: 2 }}>
                <Typography component="h2" sx={{ mb: 2 }} variant="h6">
                  {t('actors.listTitle')}
                </Typography>
                {actors.length === 0 ? (
                  <Typography color="text.secondary">
                    {t('actors.emptyList')}
                  </Typography>
                ) : (
                  <Stack spacing={1}>
                    {actors.map((actor) => (
                      <Button
                        key={actor.uuid}
                        onClick={() => {
                          setSelectedId(actor.uuid);
                          setIsCreating(false);
                        }}
                        sx={{ justifyContent: 'space-between' }}
                        variant={
                          selectedId === actor.uuid && !isCreating
                            ? 'contained'
                            : 'outlined'
                        }
                      >
                        {actor.name}
                      </Button>
                    ))}
                  </Stack>
                )}
                <Button
                  fullWidth
                  onClick={() => setIsCreating(true)}
                  sx={{ mt: 3 }}
                  variant="contained"
                >
                  {t('actors.create')}
                </Button>
              </Paper>
              <Paper component="section" sx={{ p: { xs: 2, md: 4 } }}>
                {isCreating ? (
                  <ActorForm
                    applicationType={applicationType ?? undefined}
                    isSubmitting={isSaving}
                    onCancel={() => setIsCreating(false)}
                    onSubmit={addActor}
                  />
                ) : selectedActor ? (
                  <Stack spacing={1}>
                    <Typography component="h2" variant="h5">
                      {selectedActor.name}
                    </Typography>
                    <Typography>
                      {t(`actors.roles.${selectedActor.role}`)}
                    </Typography>
                    <Typography>{selectedActor.phoneNumber}</Typography>
                    <Typography>{selectedActor.email}</Typography>
                    {selectedActor.contactPersons.map((contactPerson) => (
                      <Typography key={contactPerson.uuid}>
                        {t('actors.contactPerson')}: {contactPerson.name} ·{' '}
                        {contactPerson.phoneNumber} · {contactPerson.email}
                      </Typography>
                    ))}
                    <Typography>
                      {selectedActor.address.street}{' '}
                      {selectedActor.address.houseNumber},{' '}
                      {selectedActor.address.postalCode}{' '}
                      {selectedActor.address.city}
                    </Typography>
                  </Stack>
                ) : (
                  <Typography color="text.secondary">
                    {t('actors.selectOrCreate')}
                  </Typography>
                )}
              </Paper>
            </Box>
          </>
        )}
      </Container>
    </main>
  );
}
