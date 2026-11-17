import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import {
  Alert,
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
  const [actorToDelete, setActorToDelete] = useState<SavedActor | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteFailed, setDeleteFailed] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [deleteDialogExited, setDeleteDialogExited] = useState(true);
  const createButton = useRef<HTMLButtonElement>(null);
  const retryButton = useRef<HTMLButtonElement>(null);
  const restoreFocusAfterDelete = useRef(false);
  const isDeleteOpen = actorToDelete !== null;

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
                <Typography
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    overflowWrap: 'anywhere',
                    fontWeight: 600,
                  }}
                >
                  {actor.name}
                </Typography>
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
