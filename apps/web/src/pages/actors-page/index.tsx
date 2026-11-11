import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import {
  Alert,
  Button,
  CircularProgress,
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
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { deleteActor as deleteActorRequest } from '../../api/actors.api.js';
import type { SavedActor } from './actor.types.js';
import { useActorsPage } from './actors-page.context.js';

export default function ActorsPage() {
  const { actors, setActors, isLoading, loadFailed, retry } = useActorsPage();
  const navigate = useNavigate();
  const [actorToDelete, setActorToDelete] = useState<SavedActor | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteFailed, setDeleteFailed] = useState(false);
  const isDeleteOpen = actorToDelete !== null;

  function openDeleteDialog(actor: SavedActor) {
    setDeleteFailed(false);
    setActorToDelete(actor);
  }

  function closeDeleteDialog() {
    if (isDeleting) return;
    setActorToDelete(null);
    setDeleteFailed(false);
  }

  async function deleteActor() {
    if (!actorToDelete || isDeleting) return;
    setIsDeleting(true);
    setDeleteFailed(false);
    try {
      await deleteActorRequest(actorToDelete.uuid);
      setActors((current) =>
        current.filter((actor) => actor.uuid !== actorToDelete.uuid),
      );
      setActorToDelete(null);
      retry();
    } catch {
      setDeleteFailed(true);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
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
              <Button color="inherit" onClick={retry}>
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
                <Typography sx={{ flex: 1, fontWeight: 600 }}>
                  {actor.name}
                </Typography>
                <IconButton
                  aria-label={`Rediger ${actor.name}`}
                  onClick={() =>
                    navigate(`actors/${encodeURIComponent(actor.uuid)}/edit`)
                  }
                  sx={{ color: '#1562AD' }}
                >
                  <EditOutlinedIcon />
                </IconButton>
                <IconButton
                  aria-label={`Slet ${actor.name}`}
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
            justifyContent: 'flex-end',
            px: 2.5,
            py: 2,
          }}
        >
          <Button
            disabled={isLoading || loadFailed}
            onClick={() => navigate('actors/create')}
            startIcon={<AddIcon />}
            sx={{ borderRadius: 1, px: 2.5 }}
            variant="contained"
          >
            Opret aktør
          </Button>
        </Stack>
      </Paper>
      <Dialog
        aria-describedby="delete-actor-description"
        aria-labelledby="delete-actor-title"
        onClose={closeDeleteDialog}
        open={isDeleteOpen}
      >
        <DialogTitle id="delete-actor-title">Slet aktør?</DialogTitle>
        <DialogContent aria-busy={isDeleting}>
          {deleteFailed && (
            <Alert severity="error" sx={{ mb: 2 }}>
              Aktøren kunne ikke slettes. Prøv igen.
            </Alert>
          )}
          <Typography color="text.secondary" id="delete-actor-description">
            Er du sikker på, at du vil slette {actorToDelete?.name}? Aktørens
            kontaktpersoner bliver også slettet.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button autoFocus disabled={isDeleting} onClick={closeDeleteDialog}>
            Annuller
          </Button>
          <Button
            color="error"
            disabled={isDeleting}
            onClick={deleteActor}
            variant="contained"
          >
            {isDeleting ? 'Sletter…' : 'Slet'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
