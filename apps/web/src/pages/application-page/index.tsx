import { Alert, Box, CircularProgress, Container } from '@mui/material';
import { useEffect, useReducer, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getApplicationAreas } from '../../api/areas.api.js';
import { ApiError } from '../../api/client.js';
import {
  areaEditReducer,
  initialAreaEditState,
} from '../../features/areas/area-edit-state.js';
import type { AreaApplication } from '../../types/area.types.js';
import {
  type ApplicationStepId,
  applicationSteps,
} from './application-steps.js';
import { PlaceholderStep } from './components/placeholder-step.js';
import { StepSidebar } from './components/step-sidebar.js';
import { AreasStep } from './steps/areas-step/areas-step.js';
import { MapStep } from './steps/map-step/map-step.js';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; messageKey: string }
  | { status: 'ready'; application: AreaApplication };

/** Reads the case number from `/ansoegning?sag=<caseNumber>`. */
function getCaseNumber(): string | null {
  return new URLSearchParams(window.location.search).get('sag');
}

export default function ApplicationPage() {
  const { t } = useTranslation();
  const [caseNumber] = useState(getCaseNumber);
  const [load, setLoad] = useState<LoadState>({ status: 'loading' });
  const [step, setStep] = useState<ApplicationStepId>('map');
  const [areaState, dispatch] = useReducer(
    areaEditReducer,
    initialAreaEditState,
  );

  useEffect(() => {
    if (!caseNumber) {
      setLoad({ status: 'error', messageKey: 'applicationWizard.noCase' });
      return;
    }

    let isCurrent = true;
    getApplicationAreas(caseNumber)
      .then(({ application, areas }) => {
        if (!isCurrent) return;
        dispatch({ type: 'loaded', areas });
        setLoad({ status: 'ready', application });
      })
      .catch((error: unknown) => {
        if (!isCurrent) return;
        setLoad({
          status: 'error',
          messageKey:
            error instanceof ApiError && error.status === 404
              ? 'applicationWizard.caseNotFound'
              : 'applicationWizard.loadError',
        });
      });

    return () => {
      isCurrent = false;
    };
  }, [caseNumber]);

  const stepIndex = applicationSteps.findIndex((item) => item.id === step);
  const goBack = () => setStep(applicationSteps[Math.max(stepIndex - 1, 0)].id);
  const goNext = () =>
    setStep(
      applicationSteps[Math.min(stepIndex + 1, applicationSteps.length - 1)].id,
    );

  function renderStep(application: AreaApplication) {
    switch (step) {
      case 'map':
        return (
          <MapStep
            application={application}
            existingAreaCount={areaState.entries.length}
            onAddManually={() => {
              dispatch({ type: 'addManual' });
              setStep('areas');
            }}
            onAreasCreated={(areas) =>
              dispatch({ type: 'added', areas, source: 'search' })
            }
            onBack={goBack}
            onNext={goNext}
          />
        );
      case 'areas':
        return (
          <AreasStep
            application={application}
            dispatch={dispatch}
            onBack={goBack}
            onNext={goNext}
            state={areaState}
          />
        );
      default:
        return (
          <PlaceholderStep
            isLast={stepIndex === applicationSteps.length - 1}
            onBack={goBack}
            onNext={goNext}
            title={t(applicationSteps[stepIndex].labelKey)}
          />
        );
    }
  }

  return (
    <main>
      <Container sx={{ py: 4 }}>
        {load.status === 'loading' && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress aria-label={t('applicationWizard.loading')} />
          </Box>
        )}
        {load.status === 'error' && (
          <Alert severity="error">{t(load.messageKey)}</Alert>
        )}
        {load.status === 'ready' && (
          <Box
            sx={{
              display: 'grid',
              gap: 4,
              gridTemplateColumns: { xs: '1fr', md: '220px 1fr' },
            }}
          >
            <StepSidebar currentStep={step} />
            <Box>{renderStep(load.application)}</Box>
          </Box>
        )}
      </Container>
    </main>
  );
}
