import { Alert, Box, Paper, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { actorRoleLabelKeys } from '../../../../features/contact-persons/contact-person-labels.js';
import type { ContactPersonActor } from '../../../../types/contact-person.types.js';
import { StepShell } from '../../components/step-shell.js';

interface ActorsStepProps {
  actors: ContactPersonActor[];
  onBack: () => void;
  onNext: () => void;
}

/**
 * Placeholder for "Øvrige aktører" (UC-040–042). It lists the actors that
 * are on the application in the database, because contact persons belong to
 * one of them. Creating and editing actors is built on the AktørUseCase
 * branch, which replaces this step.
 */
export function ActorsStep({ actors, onBack, onNext }: ActorsStepProps) {
  const { t } = useTranslation();

  return (
    <StepShell
      intro={t('wizard.actors.intro')}
      onBack={onBack}
      onNext={onNext}
      title={t('applicationWizard.steps.otherActors')}
    >
      {() => (
        <>
          <Alert severity="info">{t('wizard.actors.placeholder')}</Alert>
          {actors.length === 0 ? (
            <Typography color="text.secondary" variant="body2">
              {t('wizard.actors.none')}
            </Typography>
          ) : (
            <Box
              component="ul"
              sx={{ display: 'grid', gap: 1, listStyle: 'none', m: 0, p: 0 }}
            >
              {actors.map((actor) => (
                <Paper
                  component="li"
                  key={actor.uuid}
                  sx={{ border: '1px solid #BDBDBD', p: 2 }}
                  variant="outlined"
                >
                  <Typography sx={{ fontWeight: 600 }}>{actor.name}</Typography>
                  <Typography color="text.secondary" variant="body2">
                    {t(actorRoleLabelKeys[actor.role])}
                  </Typography>
                </Paper>
              ))}
            </Box>
          )}
        </>
      )}
    </StepShell>
  );
}
