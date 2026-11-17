import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import type { ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { deleteActor as deleteActorRequest } from '../../api/actors.api.js';
import { DeleteConfirmationDialog } from '../../components/ui/dialogs/delete-confirmation-dialog.js';
import { reportError } from '../../lib/report-error.js';
import type { SavedActor } from './actor.types.js';
import { useActorsPage } from './actors-page.context.js';

export default function ActorsPage(): ReactElement {
  const { t } = useTranslation();
  const { actors, setActors, isLoading, loadFailed, retry } = useActorsPage();
  const navigate = useNavigate();
  const [expandedActors, setExpandedActors] = useState<Set<string>>(new Set());
  const [actorToDelete, setActorToDelete] = useState<SavedActor | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteFailed, setDeleteFailed] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [deleteDialogExited, setDeleteDialogExited] = useState(true);
  const createButton = useRef<HTMLButtonElement>(null);
  const retryButton = useRef<HTMLButtonElement>(null);
  const restoreFocusAfterDelete = useRef(false);
  const isDeleteOpen = actorToDelete !== null;

  function toggleActor(uuid: string): void {
    setExpandedActors((current) => {
      const next = new Set(current);
      if (next.has(uuid)) next.delete(uuid);
      else next.add(uuid);
      return next;
    });
  }

  useEffect(() => {
    if (
      restoreFocusAfterDelete.current &&
      deleteDialogExited &&
      !isDeleteOpen &&
      !isLoading
    ) {
      (loadFailed ? retryButton.current : createButton.current)?.focus();
      restoreFocusAfterDelete.current = false;
    }
  }, [deleteDialogExited, isDeleteOpen, isLoading, loadFailed]);

  function openDeleteDialog(actor: SavedActor): void {
    setDeleteDialogExited(false);
    setDeleteFailed(false);
    setActorToDelete(actor);
  }

  function closeDeleteDialog(): void {
    if (isDeleting) return;
    setActorToDelete(null);
    setDeleteFailed(false);
  }

  async function deleteActor(): Promise<void> {
    if (!actorToDelete || isDeleting) return;
    setIsDeleting(true);
    setDeleteFailed(false);
    try {
      await deleteActorRequest(actorToDelete.uuid);
      setStatusMessage(`${actorToDelete.name} er slettet.`);
      restoreFocusAfterDelete.current = true;
      setActors((current) =>
        current.filter((actor) => actor.uuid !== actorToDelete.uuid),
      );
      setActorToDelete(null);
      retry();
    } catch (error: unknown) {
      reportError('Deleting actor failed', error);
      setDeleteFailed(true);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <Typography className="visually-hidden" role="status">
        {statusMessage}
      </Typography>
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
          <Stack role="status" spacing={1} sx={{ alignItems: 'center', p: 4 }}>
            <CircularProgress size={28} />
            <Typography color="text.secondary">Henter aktører…</Typography>
          </Stack>
        ) : loadFailed ? (
          <Alert
            action={
              <Button color="inherit" onClick={retry} ref={retryButton}>
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
              <Box key={actor.uuid}>
                <Stack
                  direction="row"
                  spacing={2}
                  sx={{
                    alignItems: 'center',
                    minHeight: 64,
                    px: 2.5,
                    py: 1,
                  }}
                >
                  <Button
                    aria-controls={`actor-details-${actor.uuid}`}
                    aria-expanded={expandedActors.has(actor.uuid)}
                    endIcon={
                      <ExpandMoreIcon
                        sx={{
                          transform: expandedActors.has(actor.uuid)
                            ? 'rotate(180deg)'
                            : 'none',
                        }}
                      />
                    }
                    onClick={() => toggleActor(actor.uuid)}
                    sx={{
                      flex: 1,
                      minWidth: 0,
                      minHeight: 44,
                      justifyContent: 'space-between',
                      textAlign: 'left',
                      textTransform: 'none',
                      overflowWrap: 'anywhere',
                      fontWeight: 600,
                    }}
                  >
                    {actor.name}
                  </Button>
                  <IconButton
                    aria-label={`Rediger ${actor.name}`}
                    onClick={() =>
                      navigate(`actors/${encodeURIComponent(actor.uuid)}/edit`)
                    }
                    sx={{
                      color: '#1562AD',
                      flexShrink: 0,
                      minWidth: 44,
                      minHeight: 44,
                    }}
                  >
                    <EditOutlinedIcon />
                  </IconButton>
                  <IconButton
                    aria-label={`Slet ${actor.name}`}
                    onClick={() => openDeleteDialog(actor)}
                    sx={{
                      color: '#424242',
                      flexShrink: 0,
                      minWidth: 44,
                      minHeight: 44,
                    }}
                  >
                    <DeleteOutlineIcon />
                  </IconButton>
                </Stack>
                <Box
                  hidden={!expandedActors.has(actor.uuid)}
                  id={`actor-details-${actor.uuid}`}
                  sx={{ bgcolor: '#F7F9FC', px: 3.5, py: 2 }}
                >
                  <Box
                    component="dl"
                    sx={{
                      m: 0,
                      display: 'grid',
                      gridTemplateColumns: {
                        xs: 'minmax(0, 1fr)',
                        sm: 'repeat(2, minmax(0, 1fr))',
                      },
                      gap: 2,
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {[
                      [t('actors.role'), t(`actors.roles.${actor.role}`)],
                      ['Telefonnummer', actor.phoneNumber],
                      ['E-mail', actor.email],
                      [
                        t('actors.address'),
                        `${actor.address.street} ${actor.address.houseNumber}, ${actor.address.postalCode} ${actor.address.city}`,
                      ],
                      ['CVR-nummer', actor.cvrNumber],
                      ['Afdeling', actor.department],
                    ].map(([label, value]) =>
                      value ? (
                        <Box key={label}>
                          <Typography
                            color="text.secondary"
                            component="dt"
                            variant="body2"
                          >
                            {label}
                          </Typography>
                          <Typography component="dd" sx={{ m: 0 }}>
                            {value}
                          </Typography>
                        </Box>
                      ) : null,
                    )}
                  </Box>
                </Box>
              </Box>
            ))}
          </Stack>
        )}

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{
            alignItems: { xs: 'stretch', sm: 'center' },
            bgcolor: '#F5F5F5',
            justifyContent: 'flex-end',
            px: 2.5,
            py: 2,
          }}
        >
          <Button
            disabled={isLoading || loadFailed}
            onClick={() => navigate('actors/create')}
            ref={createButton}
            startIcon={<AddIcon />}
            sx={{ borderRadius: 1, px: 2.5 }}
            variant="contained"
          >
            Opret aktør
          </Button>
        </Stack>
      </Paper>
      <DeleteConfirmationDialog
        description={t('actors.deleteDescription', {
          name: actorToDelete?.name ?? '',
        })}
        error={deleteFailed ? t('actors.errors.delete') : undefined}
        isDeleting={isDeleting}
        name={actorToDelete?.name ?? ''}
        onClose={closeDeleteDialog}
        onConfirm={deleteActor}
        onExited={() => setDeleteDialogExited(true)}
        open={isDeleteOpen}
      />
    </>
  );
}
