import { Alert, Box, CircularProgress, Container, Link } from '@mui/material';
import { useEffect, useReducer, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getApplicationAreas } from '../../api/areas.api.js';
import { ApiError } from '../../api/client.js';
import {
  type ApplicationDraft,
  loadApplicationDraft,
  saveApplicationDraft,
} from '../../features/application-draft/application-draft.js';
import {
  areaEditReducer,
  initialAreaEditState,
} from '../../features/areas/area-edit-state.js';
import type { Area, AreaApplication } from '../../types/area.types.js';
import {
  type ApplicationStepId,
  applicationSteps,
} from './application-steps.js';
import { DevApplicationList } from './components/dev-application-list.js';
import { StepSidebar } from './components/step-sidebar.js';
import { ActorsStep } from './steps/actors-step/actors-step.js';
import { AreasStep, type LeaveGuard } from './steps/areas-step/areas-step.js';
import { ContactsStep } from './steps/contacts-step/contacts-step.js';
import { DocumentsStep } from './steps/documents-step/documents-step.js';
import { MapStep } from './steps/map-step/map-step.js';
import { PeriodStep } from './steps/period-step/period-step.js';
import { SignPlanStep } from './steps/sign-plan-step/sign-plan-step.js';
import type { DraftUpdater } from './steps/step-props.js';
import { SummaryStep } from './steps/summary-step/summary-step.js';
import { TasksStep } from './steps/tasks-step/tasks-step.js';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; messageKey: string }
  | { status: 'ready'; application: AreaApplication };

/** Reads the case number from `/ansoegning?sag=<caseNumber>`. */
function getCaseNumber(): string | null {
  return new URLSearchParams(window.location.search).get('sag');
}

/** Reads the current step from `&trin=<step>`, so a reload keeps it. */
function getStepFromUrl(): ApplicationStepId {
  const step = new URLSearchParams(window.location.search).get('trin');
  return (
    applicationSteps.find((item) => item.id === step)?.id ??
    applicationSteps[0].id
  );
}

function writeStepToUrl(step: ApplicationStepId): void {
  const url = new URL(window.location.href);
  if (url.searchParams.get('trin') === step) return;
  url.searchParams.set('trin', step);
  window.history.pushState(null, '', url);
}

export default function ApplicationPage() {
  const { t } = useTranslation();
  const [caseNumber] = useState(getCaseNumber);
  const [load, setLoad] = useState<LoadState>({ status: 'loading' });
  const [step, setStep] = useState<ApplicationStepId>(getStepFromUrl);
  const [areaState, dispatch] = useReducer(
    areaEditReducer,
    initialAreaEditState,
  );
  // Parts of the application without an API yet live in this tab's storage.
  const [draft, setDraft] = useState<ApplicationDraft | null>(() =>
    caseNumber ? loadApplicationDraft(caseNumber) : null,
  );
  // Set by the areas step so leaving it saves the open area first.
  const leaveGuard = useRef<LeaveGuard | null>(null);
  // True after the user changes step, so the first load keeps focus as is.
  const focusStepTitle = useRef(false);

  const stepLabelKey = applicationSteps.find(
    (item) => item.id === step,
  )?.labelKey;
  useEffect(() => {
    if (!stepLabelKey) return;
    const previousTitle = document.title;
    document.title = t('applicationWizard.documentTitle', {
      step: t(stepLabelKey),
    });
    return () => {
      document.title = previousTitle;
    };
  }, [stepLabelKey, t]);

  // Move focus to the new step's heading, so screen readers announce it.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs per step.
  useEffect(() => {
    if (!focusStepTitle.current) return;
    focusStepTitle.current = false;
    document.getElementById('step-title')?.focus();
  }, [step]);

  useEffect(() => {
    if (caseNumber && draft) saveApplicationDraft(caseNumber, draft);
  }, [caseNumber, draft]);

  // The browser's back and forward buttons move between steps.
  useEffect(() => {
    const onPopState = () => {
      const target = getStepFromUrl();
      if (target !== 'areas') dispatch({ type: 'close' });
      focusStepTitle.current = true;
      setStep(target);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (!caseNumber) return;

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
  const previousStep = applicationSteps[Math.max(stepIndex - 1, 0)].id;
  const nextStep =
    applicationSteps[Math.min(stepIndex + 1, applicationSteps.length - 1)].id;

  function showStep(target: ApplicationStepId) {
    // Collapse the areas and drop an untouched manual area when leaving.
    if (target !== 'areas') dispatch({ type: 'close' });
    focusStepTitle.current = true;
    setStep(target);
    writeStepToUrl(target);
    window.scrollTo({ top: 0 });
  }

  /** Used by the step list, which can jump from any step. */
  async function goTo(target: ApplicationStepId) {
    if (target === step) return;
    if (leaveGuard.current && !(await leaveGuard.current())) return;
    showStep(target);
  }

  const goBack = () => showStep(previousStep);
  const goNext = () => showStep(nextStep);

  const updateDraft: DraftUpdater = (update) =>
    setDraft((current) => (current ? update(current) : current));

  const savedAreas = areaState.entries
    .map((entry) => entry.saved)
    .filter((area): area is Area => area !== null);

  function renderStep(application: AreaApplication) {
    if (!draft) return null;
    const draftProps = {
      application,
      draft,
      update: updateDraft,
      onBack: goBack,
      onNext: goNext,
    };

    switch (step) {
      case 'municipalityAndPeriod':
        return <PeriodStep {...draftProps} />;
      case 'tasks':
        return <TasksStep {...draftProps} />;
      case 'otherActors':
        return <ActorsStep {...draftProps} />;
      case 'contactInfo':
        return <ContactsStep {...draftProps} />;
      case 'map':
        return (
          <MapStep
            application={application}
            existingAreaCount={areaState.entries.length}
            onAddManually={() => {
              dispatch({ type: 'addManual' });
              showStep('areas');
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
            leaveGuard={leaveGuard}
            onBack={goBack}
            onNext={goNext}
            state={areaState}
          />
        );
      case 'signPlanAndTraffic':
        return <SignPlanStep {...draftProps} />;
      case 'documents':
        return <DocumentsStep {...draftProps} />;
      case 'summary':
        return (
          <SummaryStep
            application={application}
            areas={savedAreas}
            draft={draft}
            onBack={goBack}
            onGoTo={(target) => void goTo(target)}
          />
        );
    }
  }

  // Test-only: without a case number, list applications to choose from.
  if (!caseNumber) {
    return (
      <main>
        <Container sx={{ py: 4 }}>
          <DevApplicationList />
        </Container>
      </main>
    );
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
              gridTemplateColumns: { xs: '1fr', md: '220px minmax(0, 1fr)' },
            }}
          >
            <Box>
              <StepSidebar
                currentStep={step}
                onSelect={(target) => void goTo(target)}
              />
              {/* Test-only shortcut back to the list of applications. */}
              <Link
                href="/ansoegning"
                sx={{ display: 'block', mt: 2, px: 1.5 }}
              >
                {t('devApplications.backToList')}
              </Link>
            </Box>
            <Box sx={{ minWidth: 0 }}>{renderStep(load.application)}</Box>
          </Box>
        )}
      </Container>
    </main>
  );
}
