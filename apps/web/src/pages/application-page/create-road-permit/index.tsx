import { Box, Typography } from '@mui/material';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createRoadPermitApplication } from '../../../api/roadPermit.api';
import {
  type DetailItem,
  MasterDetailGrid,
} from '../../../components/layout/masterDetail/masterDetail';
import { visuallyHidden } from '../../../components/ui/visuallyHidden';
import {
  type CompanyInformation,
  type ContactInformation,
  emptyMaterialDraft,
  type MaterialDraft,
  type MaterialEntry,
  type RoadMarkingDetails,
  type UsageDetails,
} from './formTypes';
import { ChooseMunicipalityAndTitlePage } from './pages/ChooseMunicipalityAndTitlePage';
import { ContactInformationPage } from './pages/ContactInformationPage';
import { DocumentsAndDrawingsPage } from './pages/DocumentsAndDrawingsPage';
import { MaterialsPage } from './pages/MaterialsPage';
import { RoadMarkingPage } from './pages/RoadMarkingPage';
import { SummaryAndSubmissionPage } from './pages/SummaryAndSubmissionPage';
import { UsageDetailsPage } from './pages/UsageDetailsPage';
import type { RoadPermitApplication } from './RoadPermitApplication.types';
import {
  hasMaterialDraft,
  validateContactInformation,
  validateMunicipalityAndTitle,
  validateUsageDetails,
} from './validation';

function getValidationErrors(errors: Record<string, string | undefined>) {
  return Object.values(errors).filter((error) => error !== undefined);
}

export default function CreateRoadPermitPage() {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [municipalityName, setMunicipalityName] = useState<string | null>(null);
  const [materials, setMaterials] = useState<MaterialEntry[]>([]);
  const [materialDraft, setMaterialDraft] =
    useState<MaterialDraft>(emptyMaterialDraft);
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
  });
  const [contactInformation, setContactInformation] =
    useState<ContactInformation>({
      name: '',
      phone: '',
      email: '',
    });
  const [roadMarking, setRoadMarking] = useState<RoadMarkingDetails>({
    trafficChanges: [],
    accessWays: '',
    trafficPrecautions: [],
  });

  const [confirmed, setConfirmed] = useState(false);
  const [submissionAttempted, setSubmissionAttempted] = useState(false);

  const applicant: CompanyInformation = {
    name: 'Eksempel Entreprise ApS',
    department: 'Vej og anlæg',
    address1: 'Eksempelvej 12',
    address2: '',
    postalCode: '5000',
    city: 'Odense C',
    contactPerson: 'Anna Jensen',
    directPhone: '12345678',
    mobile: '23456789',
    email: 'kontakt@example.com',
    companyPhone: '34567890',
    cvr: '00000000',
  };

  const documentPlaceholder = {
    name: 'Test Dokument',
    DocumentType: 'Skilteplan',
    Doc_URL: '/testDokument',
    DateForUpload: '21-10-2001',
  };

  function handleSubmit() {
    const application: RoadPermitApplication = {
      title,
      municipalityName,
      materials,
      usageDetails: {
        ...usageDetails,
        postalCode: usageDetails.postalCode.trim(),
        city: usageDetails.city.trim(),
      },
      contactInformation,
      documentPlaceholder,
      roadMarking,
      applicant,
      confirmed,
    };
    createRoadPermitApplication(application);
    setSubmissionAttempted(true);
  }

  const municipalityErrors = validateMunicipalityAndTitle(
    title,
    municipalityName,
    t,
  );
  const usageErrors = validateUsageDetails(usageDetails, t);
  const contactErrors = validateContactInformation(contactInformation, t);
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
          errors={showErrors ? municipalityErrors : undefined}
          municipalityName={municipalityName}
          onMunicipalityChange={setMunicipalityName}
          onTitleChange={setTitle}
          title={title}
        />
      ),
    },
    {
      id: 'materials',
      label: t('permit.steps.materials'),
      validationErrors: hasMaterialDraft(materialDraft)
        ? [t('permit.errors.materialDraft')]
        : undefined,
      content: (showErrors) => (
        <MaterialsPage
          draft={materialDraft}
          materials={materials}
          onDraftChange={setMaterialDraft}
          onMaterialsChange={setMaterials}
          showErrors={showErrors}
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
      content: (
        <RoadMarkingPage onChange={setRoadMarking} value={roadMarking} />
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
            ...applicant,
            department: t('permit.summary.exampleDepartment'),
          }}
          confirmationError={showErrors ? confirmationError : undefined}
          confirmed={confirmed}
          contactInformation={contactInformation}
          documentToUpload={documentPlaceholder}
          materials={materials}
          municipalityName={municipalityName}
          onConfirmedChange={setConfirmed}
          roadMarking={roadMarking}
          submissionAttempted={submissionAttempted}
          title={title}
          usageDetails={usageDetails}
        />
      ),
    },
  ];
  const canSubmit = categories.every((step) => !step.validationErrors?.length);

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
      <MasterDetailGrid
        items={categories}
        onSubmit={canSubmit ? handleSubmit : undefined}
      />
    </Box>
  );
}
