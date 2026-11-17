import { useRef, useState } from 'react';
import {
  saveRoadPermitDraft,
  submitRoadPermitApplication,
} from '../../../api/roadPermit.api';
import type { CompanyInformation, SubmissionStatus } from './formTypes';
import type {
  RoadPermitApplication,
  RoadPermitDraft,
} from './RoadPermitApplication.types';

export const exampleApplicant: CompanyInformation = {
  name: 'Eksempel Entreprise ApS',
  department: 'Vej og anlæg',
  address1: '',
  address2: '',
  postalCode: '',
  city: '',
  contactPerson: 'Anna Jensen',
  directPhone: '12345678',
  mobile: '23456789',
  email: 'kontakt@example.com',
  companyPhone: '34567890',
  cvr: '00000000',
};

export const exampleDocument = {
  name: 'Test Dokument',
  DocumentType: 'Skilteplan',
  Doc_URL: '/testDokument',
  DateForUpload: '21-10-2001',
};

export function useRoadPermitWrites(
  caseNumber: string,
  currentDraft: RoadPermitDraft,
) {
  const [submissionStatus, setSubmissionStatus] =
    useState<SubmissionStatus>('idle');
  const [saveStatus, setSaveStatus] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle');
  const writePending = useRef(false);
  const currentSnapshot = JSON.stringify(currentDraft);
  const [savedSnapshot, setSavedSnapshot] = useState(currentSnapshot);
  const hasUnsavedChanges =
    currentSnapshot !== savedSnapshot && submissionStatus !== 'success';

  /** Saves the current snapshot without requiring a complete application. */
  async function handleSave() {
    if (writePending.current || submissionStatus === 'success') return false;

    writePending.current = true;
    setSaveStatus('saving');
    try {
      await saveRoadPermitDraft(caseNumber, currentDraft);
      setSavedSnapshot(currentSnapshot);
      setSaveStatus('saved');
      return true;
    } catch {
      setSaveStatus('error');
      return false;
    } finally {
      writePending.current = false;
    }
  }

  async function handleSubmit(confirmed: boolean) {
    if (!confirmed || writePending.current || submissionStatus === 'success')
      return;

    const {
      title,
      municipalityName,
      materials,
      usageDetails,
      contactInformation,
      roadMarking,
    } = currentDraft;
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
      documentPlaceholder: exampleDocument,
      roadMarking,
      applicant: exampleApplicant,
      confirmed,
    };

    writePending.current = true;
    setSaveStatus('idle');
    setSubmissionStatus('sending');
    try {
      await submitRoadPermitApplication(caseNumber, application);
      setSubmissionStatus('success');
    } catch {
      setSubmissionStatus('error');
    } finally {
      writePending.current = false;
    }
  }

  return {
    handleSave,
    handleSubmit,
    hasUnsavedChanges,
    isWriting: saveStatus === 'saving' || submissionStatus === 'sending',
    saveStatus,
    submissionStatus,
  };
}
