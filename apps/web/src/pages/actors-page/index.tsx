import AddIcon from '@mui/icons-material/Add';
import ApartmentOutlinedIcon from '@mui/icons-material/ApartmentOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { getActors } from '../../api/actors.api.js';
import type { Actor, ActorSubmission } from './actor.types.js';
import { CreateActorForm } from './create-actor-form.js';

const applicationSteps = [
  'Vælg kommune & titel',
  'Materiale',
  'Detaljer om anvendelse',
  'Kontaktoplysninger',
  'Afmærkning',
  'Øvrige aktører',
  'Dokumenter og tegninger',
  'Opsummering & indsendelse',
];

export default function ActorsPage() {
  const [actors, setActors] = useState<Actor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [actorToDelete, setActorToDelete] = useState<Actor | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: Retry explicitly reloads the actor list.
  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setLoadFailed(false);

    getActors(controller.signal)
      .then((savedActors) => {
        if (!controller.signal.aborted) setActors(savedActors);
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoadFailed(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [loadAttempt]);

  function openCreateDialog() {
    setIsCreateOpen(true);
  }

  function closeCreateDialog() {
    setIsCreateOpen(false);
  }

  function createActor(actor: ActorSubmission) {
    const saved = { ...actor, uuid: crypto.randomUUID() };
    setActors((current) => [...current, saved]);
    closeCreateDialog();
  }

  function openDeleteDialog(actor: Actor) {
    setActorToDelete(actor);
    setIsDeleteOpen(true);
  }

  function closeDeleteDialog() {
    setActorToDelete(null);
    setIsDeleteOpen(false);
  }

  function deleteActor() {
    if (!actorToDelete) return;
    setActors((current) =>
      current.filter((actor) => actor.uuid !== actorToDelete.uuid),
    );
    closeDeleteDialog();
  }

  return (
    <Box component="main" sx={{ bgcolor: '#F7F9FC', minHeight: '100%' }}>
      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
        <Box
          sx={{
            alignItems: 'start',
            display: 'grid',
            gap: { xs: 3, md: 4 },
            gridTemplateColumns: { xs: '1fr', md: '310px minmax(0, 1fr)' },
          }}
        >
          <ApplicationSteps />

          <Box component="section">
            <Stack direction="row" spacing={2} sx={{ mb: 1.5 }}>
              <Box
                sx={{
                  alignItems: 'center',
                  bgcolor: '#E5F0FB',
                  borderRadius: 2,
                  color: '#1562AD',
                  display: 'flex',
                  height: 52,
                  justifyContent: 'center',
                  width: 52,
                }}
              >
                <GroupsOutlinedIcon fontSize="medium" />
              </Box>
              <Typography
                component="h1"
                sx={{
                  alignSelf: 'center',
                  fontWeight: 700,
                  fontSize: { xs: 29, md: 36 },
                }}
                variant="h4"
              >
                {isCreateOpen ? 'Opret aktør' : 'Øvrige aktører'}
              </Typography>
            </Stack>
            <Typography color="#757575" sx={{ mb: 3 }} variant="body1">
              {isCreateOpen
                ? 'Angiv oplysninger om den aktør, du vil tilføje til ansøgningen.'
                : 'Tilføj de virksomheder eller organisationer, der er involveret i ansøgningen.'}
            </Typography>

            {isCreateOpen ? (
              <CreateActorForm
                onCancel={closeCreateDialog}
                onSave={createActor}
              />
            ) : (
              <Paper
                component="section"
                elevation={0}
                sx={{
                  border: '1px solid #D7E0E9',
                  borderRadius: 3,
                  boxShadow: '0 4px 14px rgba(33, 54, 76, 0.06)',
                  overflow: 'hidden',
                }}
              >
                {isLoading ? (
                  <Stack
                    role="status"
                    spacing={1}
                    sx={{ alignItems: 'center', p: 4 }}
                  >
                    <CircularProgress size={28} />
                    <Typography color="text.secondary">
                      Henter aktører…
                    </Typography>
                  </Stack>
                ) : loadFailed ? (
                  <Alert
                    action={
                      <Button
                        color="inherit"
                        onClick={() => setLoadAttempt((current) => current + 1)}
                      >
                        Prøv igen
                      </Button>
                    }
                    severity="error"
                    sx={{ m: 2 }}
                  >
                    Aktørerne kunne ikke hentes. Prøv igen.
                  </Alert>
                ) : actors.length === 0 ? (
                  <Typography
                    color="#757575"
                    sx={{ px: 3, py: 4, textAlign: 'center' }}
                  >
                    Der er endnu ingen aktører på ansøgningen.
                  </Typography>
                ) : (
                  <Stack divider={<Divider flexItem />}>
                    {actors.map((actor) => (
                      <Stack
                        direction="row"
                        key={actor.uuid}
                        spacing={2}
                        sx={{
                          alignItems: 'center',
                          minHeight: 64,
                          px: 2.5,
                          py: 1,
                        }}
                      >
                        <Box
                          sx={{
                            alignItems: 'center',
                            bgcolor: '#F0F6FC',
                            borderRadius: 1.5,
                            color: '#1562AD',
                            display: 'flex',
                            flexShrink: 0,
                            height: 36,
                            justifyContent: 'center',
                            width: 36,
                          }}
                        >
                          <ApartmentOutlinedIcon fontSize="small" />
                        </Box>
                        <Typography sx={{ flex: 1, fontWeight: 600 }}>
                          {actor.name}
                        </Typography>
                        <IconButton
                          aria-label={`Fjern ${actor.name}`}
                          onClick={() => openDeleteDialog(actor)}
                          sx={{ color: '#424242' }}
                        >
                          <DeleteOutlineIcon />
                        </IconButton>
                      </Stack>
                    ))}
                  </Stack>
                )}

                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={2}
                  sx={{
                    alignItems: { xs: 'stretch', sm: 'center' },
                    bgcolor: '#F5F5F5',
                    justifyContent: 'space-between',
                    px: 2.5,
                    py: 2,
                  }}
                >
                  <Chip
                    aria-live="polite"
                    label={
                      isLoading || loadFailed
                        ? '— aktører'
                        : `${actors.length} ${actors.length === 1 ? 'aktør' : 'aktører'}`
                    }
                    sx={{
                      alignSelf: { xs: 'flex-start', sm: 'auto' },
                      bgcolor: '#E5F0FB',
                      color: '#1562AD',
                      fontWeight: 600,
                    }}
                  />
                  <Button
                    disabled={isLoading || loadFailed}
                    onClick={openCreateDialog}
                    startIcon={<AddIcon />}
                    sx={{ borderRadius: 1, px: 2.5 }}
                    variant="contained"
                  >
                    Opret aktør
                  </Button>
                </Stack>
              </Paper>
            )}
          </Box>
        </Box>
      </Container>

      <Dialog onClose={closeDeleteDialog} open={isDeleteOpen}>
        <DialogTitle>Fjern aktør?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            Er du sikker på, at du vil fjerne {actorToDelete?.name}?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeDeleteDialog}>Annuller</Button>
          <Button color="error" onClick={deleteActor} variant="contained">
            Fjern aktør
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function ApplicationSteps() {
  return (
    <Paper
      component="aside"
      elevation={0}
      sx={{
        border: '1px solid #D7E0E9',
        borderRadius: 3,
        boxShadow: '0 4px 14px rgba(33, 54, 76, 0.06)',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ bgcolor: '#F5F5F5', px: 2.5, py: 2 }}>
        <Typography sx={{ fontWeight: 600 }}>Din ansøgning</Typography>
      </Box>
      <Stack spacing={0.75} sx={{ p: 1.5 }}>
        {applicationSteps.map((step, index) => {
          const isActive = index === 5;
          return (
            <Stack
              direction="row"
              key={step}
              spacing={1.5}
              sx={{
                alignItems: 'center',
                bgcolor: isActive ? '#1562AD' : 'transparent',
                borderRadius: 1,
                color: isActive ? '#FFFFFF' : '#212121',
                minHeight: 48,
                px: 1.25,
              }}
            >
              <Box
                sx={{
                  alignItems: 'center',
                  bgcolor: isActive ? 'rgba(255, 255, 255, 0.2)' : '#F0F0F0',
                  borderRadius: '50%',
                  color: isActive ? '#FFFFFF' : '#212121',
                  display: 'flex',
                  flexShrink: 0,
                  fontSize: 14,
                  fontWeight: 600,
                  height: 28,
                  justifyContent: 'center',
                  width: 28,
                }}
              >
                {index + 1}
              </Box>
              <Typography sx={{ fontWeight: 600 }} variant="body2">
                {step}
              </Typography>
            </Stack>
          );
        })}
      </Stack>
    </Paper>
  );
}
