import { Alert, Box, Button, Typography } from '@mui/material';
import type { TFunction } from 'i18next';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { getMunicipalities } from '../../../api/municipalities.api';
import {
  getRoadPermitDraft,
  getRoadPermitMaterialTypes,
  getRoadPermitTrafficChanges,
} from '../../../api/roadPermit.api';
import { routes } from '../../../app/router';
import {
  type DetailItem,
  MasterDetailGrid,
} from '../../../components/layout/masterDetail/masterDetail';
import { visuallyHidden } from '../../../components/ui/visuallyHidden';
import { DraftSaveBar, UnsavedDraftDialog } from './DraftControls';
import {
  getRejectionErrors,
  saveFailureMessage,
  submissionFailureMessage,
} from './formErrors';
import {
  emptyMaterialDraft,
  type MaterialDraft,
  type MaterialEntry,
  type RoadMarkingDetails,
  type SubmissionStatus,
  type UsageDetails,
} from './formTypes';
import { ChooseMunicipalityAndTitlePage } from './pages/ChooseMunicipalityAndTitlePage';
import { ContactPersonsPage } from './pages/ContactPersonsPage';
import { DocumentsAndDrawingsPage } from './pages/DocumentsAndDrawingsPage';
import { MaterialsPage } from './pages/MaterialsPage';
import { RoadMarkingPage } from './pages/RoadMarkingPage';
import { SummaryAndSubmissionPage } from './pages/SummaryAndSubmissionPage';
import { UsageDetailsPage } from './pages/UsageDetailsPage';
import type {
  RoadPermitDraft,
  RoadPermitDraftSnapshot,
} from './RoadPermitApplication.types';
import { useContactPersons } from './useContactPersons';
import {
  exampleApplicant,
  exampleDocument,
  useRoadPermitWrites,
} from './useRoadPermitWrites';
import { useUnsavedDraftNavigation } from './useUnsavedDraftNavigation';
import {
  hasMaterialDraft,
  validateMunicipalityAndTitle,
  validateUsageDetails,
} from './validation';

/** Collects the validation messages for the step summary. */
function getValidationErrors(errors: Record<string, string | undefined>) {
  return Object.values(errors).filter((error) => error !== undefined);
}

/** Opens the draft identified in the URL and loads its saved form values. */
export default function CreateRoadPermitPage() {
  const [params] = useSearchParams();
  const caseNumber = params.get('draft');
  if (!caseNumber) return <Navigate replace to={routes.application} />;

  return <RoadPermitDraftPage caseNumber={caseNumber} key={caseNumber} />;
}

/** Loads a draft before allowing edits so saved data survives a page reload. */
function RoadPermitDraftPage({ caseNumber }: { caseNumber: string }) {
  const { t } = useTranslation();
  const [result, setResult] = useState<
    Awaited<ReturnType<typeof getRoadPermitDraft>> | { status: 'unavailable' }
  >();

  useEffect(() => {
    if (result) return;
    let active = true;
    void getRoadPermitDraft(caseNumber).then(
      (data) => {
        if (active) setResult(data);
      },
      () => {
        if (active) setResult({ status: 'unavailable' });
      },
    );
    return () => {
      active = false;
    };
  }, [caseNumber, result]);

  if (result?.status !== 'loaded') {
    return (
      <Box component="main" id="main-content" sx={{ p: 3 }} tabIndex={-1}>
        {result ? (
          <>
            <Alert severity="error">
              {
                {
                  invalid: t('permit.draft.invalidSnapshot'),
                  notFound: t('permit.draft.notFound'),
                  serviceUnavailable: t('permit.errors.serviceUnavailable'),
                  unavailable: t('permit.draft.loadError'),
                }[result.status]
              }
            </Alert>
            {(result.status === 'unavailable' ||
              result.status === 'serviceUnavailable') && (
              <Button
                onClick={() => setResult(undefined)}
                sx={{ minHeight: 44 }}
              >
                {t('permit.draft.retryLoad')}
              </Button>
            )}
            <Button
              component={Link}
              sx={{ minHeight: 44 }}
              to={routes.application}
            >
              {t('permit.draft.backToApplications')}
            </Button>
          </>
        ) : (
          <Typography role="status">{t('permit.draft.loading')}</Typography>
        )}
      </Box>
    );
  }
  return <RoadPermitForm caseNumber={caseNumber} draft={result.draft} />;
}

function usePermitChoices<T>(load: () => Promise<T[]>) {
  const [choices, setChoices] = useState<T[] | null>();

  useEffect(() => {
    if (choices !== undefined) return;

    let active = true;
    void load().then(
      (list) => {
        if (active) setChoices(list);
      },
      () => {
        if (active) setChoices(null);
      },
    );
    return () => {
      active = false;
    };
  }, [choices, load]);

  return { choices, retry: () => setChoices(undefined) };
}

/** The form's starting values: the saved draft, completed with empty values. */
function formValuesFromDraft(draft: RoadPermitDraftSnapshot) {
  return {
    title: draft.title ?? '',
    municipalityName: draft.municipalityName ?? null,
    materials: draft.materials ?? ([] as MaterialEntry[]),
    materialDraft: {
      ...emptyMaterialDraft,
      ...draft.materialDraft,
    } satisfies MaterialDraft,
    usageDetails: {
      usage: '',
      startDate: '',
      endDate: '',
      locationDescription: '',
      houseNumberFrom: '',
      houseNumberTo: '',
      road: '',
      postalCode: '',
      city: '',
      ...draft.usageDetails,
    } satisfies UsageDetails,
    roadMarking: {
      trafficChanges: [],
      accessWays: '',
      trafficPrecautions: [],
      ...draft.roadMarking,
    } satisfies RoadMarkingDetails,
  };
}

/** The errors that keep the materials, road marking and summary steps open. */
function getStepErrors(
  t: TFunction,
  values: {
    materials: MaterialEntry[];
    materialDraft: MaterialDraft;
    unavailableMaterial?: { message: string };
    roadMarking: RoadMarkingDetails;
    confirmed: boolean;
  },
) {
  const { materials, materialDraft, unavailableMaterial } = values;
  return {
    materialErrors: getValidationErrors({
      materials: materials.length
        ? undefined
        : t('permit.errors.materialsRequired'),
      materialDraft: hasMaterialDraft(materialDraft)
        ? t('permit.errors.materialDraft')
        : undefined,
      unavailableMaterial: unavailableMaterial?.message,
    }),
    trafficMeasureError: values.roadMarking.trafficPrecautions.length
      ? undefined
      : t('permit.errors.trafficMeasureRequired'),
    confirmationError: values.confirmed
      ? undefined
      : t('permit.errors.confirmation'),
  };
}

/** Submitting needs every step complete and no save or submission running. */
function canSubmitForm(
  saveStatus: 'idle' | 'saving' | 'saved',
  submissionStatus: SubmissionStatus,
  steps: DetailItem[],
) {
  return (
    saveStatus !== 'saving' &&
    (submissionStatus === 'idle' || submissionStatus === 'error') &&
    steps.every((step) => !step.validationErrors?.length)
  );
}

/** Owns the editable form values and connects them to the permit steps. */
function RoadPermitForm({
  caseNumber,
  draft,
}: {
  caseNumber: string;
  draft: RoadPermitDraftSnapshot;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  // The saved values, completed with empty ones, are read once.
  const [initial] = useState(() => formValuesFromDraft(draft));
  const [title, setTitle] = useState(initial.title);
  const [municipalityName, setMunicipalityName] = useState(
    initial.municipalityName,
  );
  const { choices: municipalities, retry: retryMunicipalities } =
    usePermitChoices(getMunicipalities);
  const { choices: materialTypes, retry: retryMaterialTypes } =
    usePermitChoices(getRoadPermitMaterialTypes);
  const { choices: trafficChangeChoices, retry: retryTrafficChanges } =
    usePermitChoices(getRoadPermitTrafficChanges);
  const [materials, setMaterials] = useState(initial.materials);
  const [materialDraft, setMaterialDraft] = useState(initial.materialDraft);
  const [usageDetails, setUsageDetails] = useState(initial.usageDetails);
  // Contact persons are saved one by one through their own API.
  const contacts = useContactPersons(caseNumber);
  const [roadMarking, setRoadMarking] = useState(initial.roadMarking);

  const [confirmed, setConfirmed] = useState(false);
  const currentDraft: RoadPermitDraft = {
    title,
    municipalityName,
    materials,
    materialDraft,
    usageDetails,
    roadMarking,
  };
  const {
    handleSave,
    handleSubmit,
    hasUnsavedChanges,
    isWriting,
    rejectedSelection,
    saveFailure,
    saveStatus,
    submissionFailure,
    submissionStatus,
  } = useRoadPermitWrites(caseNumber, currentDraft);
  const { blocker, saveAndLeave } = useUnsavedDraftNavigation(
    hasUnsavedChanges,
    handleSave,
  );

  /** Returns to the application overview after the success animation. */
  const finishSubmission = useCallback(() => {
    void navigate(routes.application, { replace: true });
  }, [navigate]);

  const municipalityErrors = validateMunicipalityAndTitle(
    title,
    municipalityName,
    municipalities ?? [],
    t,
  );
  // Choices the API rejected on submission stay marked until changed.
  const rejected = getRejectionErrors(t, rejectedSelection);
  const municipalityRejected = rejected.municipality !== undefined;
  if (rejected.municipality) {
    municipalityErrors.municipality = rejected.municipality;
  }
  const { unavailableMaterial, trafficChange: trafficChangeError } = rejected;
  const saveError = saveFailureMessage(t, saveFailure);
  const submissionError =
    submissionFailureMessage(t, submissionFailure) ??
    rejected.municipality ??
    unavailableMaterial?.message ??
    trafficChangeError;
  const usageErrors = validateUsageDetails(usageDetails, t);
  const contactPersons = contacts.rows;
  const contactErrors = contacts.errors;
  const { materialErrors, trafficMeasureError, confirmationError } =
    getStepErrors(t, {
      materials,
      materialDraft,
      unavailableMaterial,
      roadMarking,
      confirmed,
    });

  const categories: DetailItem[] = [
    {
      id: 'municipality-and-title',
      label: t('permit.steps.municipality'),
      heading: t('permit.steps.municipalityHeading'),
      headingWidth: 640,
      validationErrors: getValidationErrors(municipalityErrors),
      content: (showErrors) => (
        <ChooseMunicipalityAndTitlePage
          errors={
            showErrors || municipalityRejected ? municipalityErrors : undefined
          }
          municipalities={municipalities}
          municipalityName={municipalityName}
          onMunicipalityChange={setMunicipalityName}
          onRetryMunicipalities={retryMunicipalities}
          onTitleChange={setTitle}
          title={title}
        />
      ),
    },

    {
      id: 'usage-details',
      label: t('permit.steps.usage'),
      validationErrors: getValidationErrors(usageErrors),
      content: (showErrors) => (
        <UsageDetailsPage
          errors={showErrors ? usageErrors : undefined}
          onChange={setUsageDetails}
          value={usageDetails}
        />
      ),
    },
    {
      id: 'materials',
      label: t('permit.steps.materials'),
      validationErrors: materialErrors,
      content: (showErrors) => (
        <MaterialsPage
          draft={materialDraft}
          materials={materials}
          materialTypes={materialTypes}
          onDraftChange={setMaterialDraft}
          onMaterialsChange={setMaterials}
          onRetryMaterialTypes={retryMaterialTypes}
          showErrors={showErrors}
          unavailableMaterial={unavailableMaterial}
        />
      ),
    },
    {
      id: 'contact-information',
      label: t('permit.steps.contact'),
      validationErrors: contactErrors,
      content: <ContactPersonsPage contacts={contacts} />,
    },

    {
      id: 'road-marking',
      label: t('permit.steps.roadMarking'),
      validationErrors: getValidationErrors({
        trafficChange: trafficChangeError,
        trafficMeasure: trafficMeasureError,
      }),
      content: (
        <RoadMarkingPage
          onChange={setRoadMarking}
          onRetryTrafficChanges={retryTrafficChanges}
          trafficChangeChoices={trafficChangeChoices}
          trafficChangeError={trafficChangeError}
          value={roadMarking}
        />
      ),
    },
    {
      id: 'documents-and-drawings',
      label: t('permit.steps.documents'),
      content: <DocumentsAndDrawingsPage />,
    },
    {
      id: 'summary-and-submission',
      label: t('permit.steps.summary'),
      validationErrors: getValidationErrors({ confirmed: confirmationError }),
      content: (showErrors) => (
        <SummaryAndSubmissionPage
          applicant={{
            ...exampleApplicant,
            department: t('permit.summary.exampleDepartment'),
          }}
          confirmationError={showErrors ? confirmationError : undefined}
          confirmed={confirmed}
          contactPersons={contactPersons}
          documentToUpload={exampleDocument}
          materials={materials}
          municipalityName={municipalityName}
          onConfirmedChange={setConfirmed}
          onSubmissionComplete={finishSubmission}
          roadMarking={roadMarking}
          submissionError={submissionError}
          submissionStatus={submissionStatus}
          title={title}
          usageDetails={usageDetails}
          validationErrors={
            confirmed
              ? {
                  municipality: municipalityErrors,
                  usage: usageErrors,
                  contact: contactErrors,
                  materials: materialErrors,
                  trafficChange: trafficChangeError,
                  trafficMeasure: trafficMeasureError,
                }
              : undefined
          }
        />
      ),
    },
  ];
  const canSubmit = canSubmitForm(saveStatus, submissionStatus, categories);

  return (
    <Box
      aria-labelledby="permit-page-title"
      className="application-page"
      component="main"
      id="main-content"
      sx={{
        minHeight: '80svh',
        boxSizing: 'border-box',
        py: 4,
        px: { xs: 2, md: 4 },
        width: '100%',
      }}
      tabIndex={-1}
    >
      <title>{`${t('permit.title')} | ${t('common.brandName')}`}</title>
      <Typography
        component="h1"
        id="permit-page-title"
        sx={visuallyHidden}
        variant="h4"
      >
        {t('permit.title')}
      </Typography>
      <DraftSaveBar
        disabled={isWriting || submissionStatus === 'success'}
        onSave={handleSave}
        saveError={saveError}
        saveStatus={saveStatus}
      />
      <MasterDetailGrid
        items={categories}
        onSubmit={canSubmit ? () => handleSubmit(confirmed) : undefined}
        showStepValidation
      />
      <UnsavedDraftDialog
        isWriting={isWriting}
        onKeepEditing={() => blocker.reset?.()}
        onLeave={() => blocker.proceed?.()}
        onSaveAndLeave={saveAndLeave}
        open={blocker.state === 'blocked' && submissionStatus !== 'success'}
        saveError={saveError}
        saving={saveStatus === 'saving'}
      />
    </Box>
  );
}
