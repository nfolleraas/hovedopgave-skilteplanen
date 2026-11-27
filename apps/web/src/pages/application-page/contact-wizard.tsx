import { Alert, Box, CircularProgress, Container, Link } from '@mui/material';
import { isAxiosError } from 'axios';
import { useEffect, useReducer, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getApplicationContactPersons } from '../../api/contact-persons.api.js';
import {
  type ApplicationDraft,
  loadApplicationDraft,
  saveApplicationDraft,
} from '../../features/application-draft/application-draft.js';
import {
  contactPersonEditReducer,
  initialContactPersonEditState,
} from '../../features/contact-persons/contact-person-edit-state.js';
import type { WizardApplication } from '../../types/application.types.js';
import type {
  ContactPerson,
  ContactPersonActor,
} from '../../types/contact-person.types.js';
import {
  type ApplicationStepId,
  applicationSteps,
} from './application-steps.js';
import { DevApplicationList } from './components/dev-application-list.js';
import { StepSidebar } from './components/step-sidebar.js';
import { ActorsStep } from './steps/actors-step/actors-step.js';
import { ContactsStep } from './steps/contacts-step/contacts-step.js';
import { DocumentsStep } from './steps/documents-step/documents-step.js';
import { PeriodStep } from './steps/period-step/period-step.js';
import { PlaceholderStep } from './steps/placeholder-step/placeholder-step.js';
import { SignPlanStep } from './steps/sign-plan-step/sign-plan-step.js';
import type { DraftUpdater, LeaveGuard } from './steps/step-props.js';
import { SummaryStep } from './steps/summary-step/summary-step.js';
import { TasksStep } from './steps/tasks-step/tasks-step.js';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; messageKey: string }
  | {
      status: 'ready';
      application: WizardApplication;
      actors: ContactPersonActor[];
    };

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
  // Kept on the page, so the contact persons survive a change of step.
  const [contactState, dispatch] = useReducer(
    contactPersonEditReducer,
    initialContactPersonEditState,
  );
  // Parts of the application without an API yet live in this tab's storage.
  const [initialDraft] = useState(() =>
    caseNumber ? loadApplicationDraft(caseNumber) : null,
  );
  const [draft, setDraft] = useState<ApplicationDraft | null>(
    initialDraft?.draft ?? null,
  );
  // Tells the user when their saved draft could not be restored.
  const [draftProblem, setDraftProblem] = useState(
    initialDraft?.status === 'corrupt' || initialDraft?.status === 'unavailable'
      ? initialDraft.status
      : null,
  );
  // Set by the contacts step so leaving it saves the open form first.
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
      if (target !== 'contactInfo') dispatch({ type: 'cancel' });
      focusStepTitle.current = true;
      setStep(target);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (!caseNumber) return;

    let isCurrent = true;
    getApplicationContactPersons(caseNumber)
      .then(({ application, actors, contactPersons }) => {
        if (!isCurrent) return;
        dispatch({ type: 'loaded', contactPersons });
        setLoad({ status: 'ready', application, actors });
      })
      .catch((error: unknown) => {
        if (!isCurrent) return;
        setLoad({
          status: 'error',
          messageKey:
            isAxiosError(error) && error.response?.status === 404
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
    // Close the contact person form, dropping an unsaved new one.
    if (target !== 'contactInfo') dispatch({ type: 'cancel' });
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

  const savedContactPersons = contactState.entries
    .map((entry) => entry.saved)
    .filter((contact): contact is ContactPerson => contact !== null);

  function renderStep(
    application: WizardApplication,
    actors: ContactPersonActor[],
  ) {
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
        return <ActorsStep actors={actors} onBack={goBack} onNext={goNext} />;
      case 'contactInfo':
        return (
          <ContactsStep
            actors={actors}
            application={application}
            dispatch={dispatch}
            leaveGuard={leaveGuard}
            onBack={goBack}
            onNext={goNext}
            state={contactState}
          />
        );
      // Kort and Områder are built on Feature-CreateArea (UC-034–036).
      case 'map':
      case 'areas':
        return (
          <PlaceholderStep
            message={t('wizard.areasPlaceholder')}
            onBack={goBack}
            onNext={goNext}
            title={t(`applicationWizard.steps.${step}`)}
          />
        );
      case 'signPlanAndTraffic':
        return <SignPlanStep {...draftProps} />;
      case 'documents':
        return <DocumentsStep {...draftProps} />;
      case 'summary':
        return (
          <SummaryStep
            actors={actors}
            application={application}
            contactPersons={savedContactPersons}
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
        {load.status === 'ready' && draftProblem && (
          <Alert
            onClose={() => setDraftProblem(null)}
            severity="warning"
            sx={{ mb: 3 }}
          >
            {draftProblem === 'corrupt'
              ? t('applicationWizard.draftCorrupt')
              : t('applicationWizard.draftUnavailable')}
          </Alert>
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
            <Box sx={{ minWidth: 0 }}>
              {renderStep(load.application, load.actors)}
            </Box>
          </Box>
        )}
      </Container>
    </main>
  );
}
