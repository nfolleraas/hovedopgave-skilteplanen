import { Box, Container, Stack, Typography } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate, useParams } from 'react-router';
import {
  createActor as createActorRequest,
  getActors,
  updateActor as updateActorRequest,
} from '../../api/actors.api.js';
import type { ActorSubmission, SavedActor } from './actor.types.js';
import type { ActorsPageContext } from './actors-page.context.js';

export default function ActorsLayout() {
  const navigate = useNavigate();
  const { caseNumber } = useParams();
  const { pathname } = useLocation();
  const basePath = caseNumber
    ? `/ansoegning/${encodeURIComponent(caseNumber)}`
    : '/ansoegning';
  const isCreating = pathname.endsWith('/actors/create');
  const isEditing = pathname.endsWith('/edit');
  const title = isEditing
    ? 'Opdater aktør'
    : isCreating
      ? 'Opret aktør'
      : 'Øvrige aktører';
  const heading = useRef<HTMLHeadingElement>(null);
  const [actors, setActors] = useState<SavedActor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${title} | Ansøgningsplatformen`;
    heading.current?.focus();
    return () => {
      document.title = previousTitle;
    };
  }, [title]);

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

  async function createActor(
    applicationCaseNumber: string,
    actor: ActorSubmission,
  ) {
    const saved = await createActorRequest(applicationCaseNumber, actor);
    setActors((current) => [...current, saved]);
    setLoadAttempt((current) => current + 1);
    navigate(basePath);
  }

  async function updateActor(uuid: string, actor: ActorSubmission) {
    const saved = await updateActorRequest(uuid, actor);
    setActors((current) =>
      current.map((existing) => (existing.uuid === uuid ? saved : existing)),
    );
    setLoadAttempt((current) => current + 1);
    navigate(basePath);
  }

  const context: ActorsPageContext = {
    actors,
    setActors,
    isLoading,
    loadFailed,
    createActor,
    updateActor,
    retry: () => setLoadAttempt((current) => current + 1),
    cancel: () => navigate(basePath),
  };

  return (
    <Box component="main" sx={{ bgcolor: '#F7F9FC', minHeight: '100%' }}>
      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
        <Box component="section">
          <Stack direction="row" spacing={2} sx={{ mb: 1.5 }}>
            <Typography
              component="h1"
              ref={heading}
              sx={{
                alignSelf: 'center',
                fontWeight: 700,
                fontSize: { xs: 29, md: 36 },
              }}
              tabIndex={-1}
              variant="h4"
            >
              {title}
            </Typography>
          </Stack>
          <Typography color="#757575" sx={{ mb: 3 }} variant="body1">
            {isEditing
              ? 'Rediger oplysningerne om den valgte aktør.'
              : isCreating
                ? 'Angiv oplysninger om den aktør, du vil tilføje til ansøgningen.'
                : 'Tilføj de virksomheder eller organisationer, der er involveret i ansøgningen.'}
          </Typography>

          <Outlet context={context} />
        </Box>
      </Container>
    </Box>
  );
}
