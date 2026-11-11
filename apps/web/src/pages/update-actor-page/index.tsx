import {
  Alert,
  Button,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import { useParams } from 'react-router';
import { ActorForm } from '../actors-page/actor-form.js';
import { useActorsPage } from '../actors-page/actors-page.context.js';

export default function UpdateActorPage() {
  const { uuid } = useParams();
  const { actors, isLoading, loadFailed, retry, cancel, updateActor } =
    useActorsPage();
  const actor = actors.find((candidate) => candidate.uuid === uuid);

  if (isLoading) {
    return (
      <Stack role="status" spacing={1} sx={{ alignItems: 'center', p: 4 }}>
        <CircularProgress size={28} />
        <Typography>Henter aktør…</Typography>
      </Stack>
    );
  }

  if (loadFailed) {
    return (
      <Alert
        action={
          <Button color="inherit" onClick={retry}>
            Prøv igen
          </Button>
        }
        severity="error"
      >
        Aktøren kunne ikke hentes. Prøv igen.
      </Alert>
    );
  }

  if (!actor) {
    return (
      <Alert
        action={
          <Button color="inherit" onClick={cancel}>
            Tilbage til aktører
          </Button>
        }
        severity="warning"
      >
        Aktøren blev ikke fundet.
      </Alert>
    );
  }

  return (
    <ActorForm
      initialActor={actor}
      key={actor.uuid}
      onCancel={cancel}
      onSave={(values) => updateActor(actor.uuid, values)}
    />
  );
}
