import { Box } from '@mui/material';
import { useState } from 'react';
import {
  type DetailItem,
  MasterDetailGrid,
} from '../../../components/layout/masterDetail/masterDetail';
import {
  type ContactInformation,
  emptyMaterialDraft,
  type MaterialDraft,
  type MaterialEntry,
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
      content: <RoadMarkingPage />,
    },
    {
      id: 'documents-and-drawings',
      label: 'Dokumenter og tegninger',
      content: <DocumentsAndDrawingsPage />,
    },
    {
      id: 'summary-and-submission',
      label: 'Opsummering & indsendelse',
      content: <SummaryAndSubmissionPage />,
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
        maxWidth: 1280,
        mx: 'auto',
      }}
    >
      <MasterDetailGrid items={categories} />
    </Box>
  );
}
