import { Box } from '@mui/material';
import { useState } from 'react';
import {
  type DetailItem,
  MasterDetailGrid,
} from '../../../components/layout/masterDetail/masterDetail';
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

export default function CreateRoadPermitPage() {
  const [title, setTitle] = useState('');
  const [municipalityId, setMunicipalityId] = useState<string | null>(null);
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
  });
  const [contactInformation, setContactInformation] =
    useState<ContactInformation>({
      name: '',
      phone: '',
      email: '',
      availableFrom: '',
      availableTo: '',
      availabilityNotes: '',
    });
  const [roadMarking, setRoadMarking] = useState<RoadMarkingDetails>({
    trafficChanges: [],
    accessWays: '',
    trafficPrecautions: [],
  });

  const [confirmed, setConfirmed] = useState(false);

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

  function handleSubmit() {
    const application = {
      title,
      municipalityId,
      materials,
      usageDetails,
      contactInformation,
      roadMarking,
      applicant,
      confirmed,
    };

    console.log(application);
  }

  const categories: DetailItem[] = [
    {
      id: 'municipality-and-title',
      label: 'Vælg kommune & titel',
      content: (
        <ChooseMunicipalityAndTitlePage
          municipalityId={municipalityId}
          onMunicipalityChange={setMunicipalityId}
          onTitleChange={setTitle}
          title={title}
        />
      ),
    },
    {
      id: 'materials',
      label: 'Materiale',
      content: (
        <MaterialsPage
          draft={materialDraft}
          materials={materials}
          onDraftChange={setMaterialDraft}
          onMaterialsChange={setMaterials}
        />
      ),
    },
    {
      id: 'usage-details',
      label: 'Detaljer om anvendelse',
      content: (
        <UsageDetailsPage onChange={setUsageDetails} value={usageDetails} />
      ),
    },
    {
      id: 'contact-information',
      label: 'Kontaktoplysninger',
      content: (
        <ContactInformationPage
          onChange={setContactInformation}
          value={contactInformation}
        />
      ),
    },
    {
      id: 'road-marking',
      label: 'Afmærkning',
      content: (
        <RoadMarkingPage onChange={setRoadMarking} value={roadMarking} />
      ),
    },
    {
      id: 'documents-and-drawings',
      label: 'Dokumenter og tegninger',
      content: <DocumentsAndDrawingsPage />,
    },
    {
      id: 'summary-and-submission',
      label: 'Opsummering & indsendelse',
      content: (
        <SummaryAndSubmissionPage
          applicant={applicant}
          confirmed={confirmed}
          contactInformation={contactInformation}
          materials={materials}
          municipalityId={municipalityId}
          onConfirmedChange={setConfirmed}
          roadMarking={roadMarking}
          title={title}
          usageDetails={usageDetails}
        />
      ),
    },
  ];

  return (
    <Box
      component="main"
      sx={{
        minHeight: '80svh',
        boxSizing: 'border-box',
        py: 4,
        px: { xs: 2, md: 4 },
        width: '100%',
      }}
    >
      <MasterDetailGrid items={categories} onSubmit={handleSubmit} />
    </Box>
  );
}
