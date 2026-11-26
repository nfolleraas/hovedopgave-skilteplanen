import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Typography,
} from '@mui/material';
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
import DocumentsPage from '../../documents-page';
import { useDocuments } from '../../documents-page/hooks/use-documents';
import {
  type ContactInformation,
  emptyMaterialDraft,
  type MaterialDraft,
  type MaterialEntry,
  type RoadMarkingDetails,
  type UsageDetails,
} from './formTypes';
import { ChooseMunicipalityAndTitlePage } from './pages/ChooseMunicipalityAndTitlePage';
import { ContactInformationPage } from './pages/ContactInformationPage';
import { MaterialsPage } from './pages/MaterialsPage';
import { RoadMarkingPage } from './pages/RoadMarkingPage';
import { SummaryAndSubmissionPage } from './pages/SummaryAndSubmissionPage';
import { UsageDetailsPage } from './pages/UsageDetailsPage';
import { getTrafficChangeLabels } from './permitOptions';
import type {
  RoadPermitDraft,
  RoadPermitDraftSnapshot,
} from './RoadPermitApplication.types';
import { exampleApplicant, useRoadPermitWrites } from './useRoadPermitWrites';
import { useUnsavedDraftNavigation } from './useUnsavedDraftNavigation';
import {
  hasMaterialDraft,
  validateContactInformation,
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
  const [title, setTitle] = useState(draft.title ?? '');
  const [municipalityName, setMunicipalityName] = useState<string | null>(
    draft.municipalityName ?? null,
  );
  const { choices: municipalities, retry: retryMunicipalities } =
    usePermitChoices(getMunicipalities);
  const { choices: materialTypes, retry: retryMaterialTypes } =
    usePermitChoices(getRoadPermitMaterialTypes);
  const { choices: trafficChangeChoices, retry: retryTrafficChanges } =
    usePermitChoices(getRoadPermitTrafficChanges);
  const [materials, setMaterials] = useState<MaterialEntry[]>(
    draft.materials ?? [],
  );
  const [materialDraft, setMaterialDraft] = useState<MaterialDraft>({
    ...emptyMaterialDraft,
    ...draft.materialDraft,
  });
  const [usageDetails, setUsageDetails] = useState<UsageDetails>({
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
  });
  const [contactInformation, setContactInformation] =
    useState<ContactInformation>({
      name: '',
      phone: '',
      email: '',
      ...draft.contactInformation,
    });
  const [roadMarking, setRoadMarking] = useState<RoadMarkingDetails>({
    trafficChanges: [],
    accessWays: '',
    trafficPrecautions: [],
    ...draft.roadMarking,
  });
  const documentsState = useDocuments(caseNumber);

  const [confirmed, setConfirmed] = useState(false);
  const currentDraft: RoadPermitDraft = {
    title,
    municipalityName,
    materials,
    materialDraft,
    usageDetails,
    contactInformation,
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
  const municipalityRejected = rejectedSelection?.field === 'municipality';
  if (municipalityRejected) {
    municipalityErrors.municipality = t(
      'permit.errors.municipalityUnavailable',
    );
  }
  const unavailableMaterial =
    rejectedSelection?.field === 'material'
      ? {
          type: rejectedSelection.value,
          message: t('permit.errors.materialUnavailable'),
        }
      : undefined;
  let trafficChangeError: string | undefined;
  if (rejectedSelection?.field === 'trafficChange') {
    const labels = getTrafficChangeLabels(t);
    const change = rejectedSelection.value;
    trafficChangeError = t('permit.errors.trafficChangeUnavailable', {
      change: Object.hasOwn(labels, change) ? labels[change] : change,
    });
  }
  const conflictError = t('permit.draft.conflictError');
  const serviceUnavailable = t('permit.errors.serviceUnavailable');
  const saveError = saveFailure
    ? {
        conflict: conflictError,
        network: t('permit.draft.saveNetworkError'),
        serviceUnavailable,
        unexpected: t('permit.draft.saveError'),
      }[saveFailure]
    : undefined;
  const submissionError = submissionFailure
    ? {
        conflict: conflictError,
        network: t('permit.summary.submissionNetworkError'),
        serviceUnavailable,
        unexpected: t('permit.summary.submissionError'),
      }[submissionFailure]
    : municipalityRejected
      ? municipalityErrors.municipality
      : (unavailableMaterial?.message ?? trafficChangeError);
  const usageErrors = validateUsageDetails(usageDetails, t);
  const contactErrors = validateContactInformation(contactInformation, t);
  const materialErrors = getValidationErrors({
    materials: materials.length
      ? undefined
      : t('permit.errors.materialsRequired'),
    materialDraft: hasMaterialDraft(materialDraft)
      ? t('permit.errors.materialDraft')
      : undefined,
    unavailableMaterial: unavailableMaterial?.message,
  });
  const trafficMeasureError = roadMarking.trafficPrecautions.length
    ? undefined
    : t('permit.errors.trafficMeasureRequired');
  const confirmationError = confirmed
    ? undefined
    : t('permit.errors.confirmation');

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
      validationErrors: getValidationErrors(contactErrors),
      content: (showErrors) => (
        <ContactInformationPage
          errors={showErrors ? contactErrors : undefined}
          onChange={setContactInformation}
          value={contactInformation}
        />
      ),
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
      id: 'documents',
      label: t('documents.title'),
      content: (
        <DocumentsPage
          applicationId={caseNumber}
          documentsState={documentsState}
          listHeadingLevel="h3"
        />
      ),
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
          contactInformation={contactInformation}
          documentsState={documentsState}
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
  const canSubmit =
    saveStatus !== 'saving' &&
    (submissionStatus === 'idle' || submissionStatus === 'error') &&
    categories.every((step) => !step.validationErrors?.length);

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
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 1,
          mb: 2,
        }}
      >
        <Typography role="status" sx={{ textAlign: 'end' }}>
          {saveError ??
            {
              idle: '',
              saving: t('permit.draft.saving'),
              saved: t('permit.draft.saved'),
            }[saveStatus]}
        </Typography>
        <Button
          disabled={isWriting || submissionStatus === 'success'}
          onClick={handleSave}
          sx={{ minHeight: 44 }}
          variant="outlined"
        >
          {t('permit.actions.saveDraft')}
        </Button>
      </Box>
      <MasterDetailGrid
        items={categories}
        onSubmit={canSubmit ? () => handleSubmit(confirmed) : undefined}
        showStepValidation
      />
      <Dialog
        aria-describedby="permit-unsaved-description"
        aria-labelledby="permit-unsaved-title"
        onClose={() => {
          if (!isWriting) blocker.reset?.();
        }}
        open={blocker.state === 'blocked' && submissionStatus !== 'success'}
      >
        <DialogTitle id="permit-unsaved-title">
          {t('permit.draft.unsavedTitle')}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="permit-unsaved-description">
            {t('permit.draft.unsavedDescription')}
          </DialogContentText>
          {saveStatus === 'saving' && (
            <Typography role="status" sx={{ mt: 2 }}>
              {t('permit.draft.saving')}
            </Typography>
          )}
          {saveError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {saveError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions
          sx={{
            flexWrap: 'wrap',
            gap: 1,
            '& .MuiButton-root': { minHeight: 44 },
          }}
        >
          <Button autoFocus disabled={isWriting} onClick={blocker.reset}>
            {t('permit.draft.keepEditing')}
          </Button>
          <Button disabled={isWriting} onClick={blocker.proceed}>
            {t('permit.draft.leaveWithoutSaving')}
          </Button>
          <Button
            disabled={isWriting}
            onClick={saveAndLeave}
            variant="contained"
          >
            {t('permit.draft.saveAndLeave')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
