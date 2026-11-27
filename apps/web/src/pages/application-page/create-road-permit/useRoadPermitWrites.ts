import { AxiosError, isAxiosError } from 'axios';
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

type WriteFailure =
  | 'conflict'
  | 'network'
  | 'serviceUnavailable'
  | 'unexpected';
type RejectedSelection =
  | { field: 'municipality'; value: string | null }
  | { field: 'material' | 'trafficChange'; value: string };

function getWriteFailure(error: unknown): WriteFailure {
  if (!isAxiosError(error)) return 'unexpected';
  if (error.response?.status === 409) return 'conflict';
  if (error.response?.status === 503) return 'serviceUnavailable';
  if (
    !error.response &&
    (error.code === AxiosError.ERR_NETWORK ||
      error.code === AxiosError.ECONNABORTED ||
      error.code === AxiosError.ETIMEDOUT)
  ) {
    return 'network';
  }
  return 'unexpected';
}

/** Resolves the API's index against the submitted snapshot, even after edits. */
function getRejectedSelection(
  error: unknown,
  application: RoadPermitApplication,
): RejectedSelection | undefined {
  if (
    !isAxiosError<{ code?: string; index?: number }>(error) ||
    error.response?.status !== 400
  )
    return;

  const { code, index } = error.response.data ?? {};
  if (code === 'MUNICIPALITY_UNAVAILABLE') {
    return { field: 'municipality', value: application.municipalityName };
  }
  if (typeof index !== 'number') return;
  if (code === 'MATERIAL_UNAVAILABLE') {
    const material = application.materials[index];
    if (material) return { field: 'material', value: material.type };
  }
  if (code === 'TRAFFIC_CHANGE_UNAVAILABLE') {
    const change = application.roadMarking.trafficChanges[index];
    if (change !== undefined) return { field: 'trafficChange', value: change };
  }
}

export function useRoadPermitWrites(
  caseNumber: string,
  currentDraft: RoadPermitDraft,
) {
  const [submissionStatus, setSubmissionStatus] =
    useState<SubmissionStatus>('idle');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>(
    'idle',
  );
  const [saveFailure, setSaveFailure] = useState<WriteFailure>();
  const [submissionFailure, setSubmissionFailure] = useState<
    WriteFailure | RejectedSelection
  >();
  const writePending = useRef(false);
  const currentSnapshot = JSON.stringify(currentDraft);
  const [savedSnapshot, setSavedSnapshot] = useState(currentSnapshot);
  const hasUnsavedChanges =
    currentSnapshot !== savedSnapshot && submissionStatus !== 'success';

  /** Saves the current snapshot without requiring a complete application. */
  async function handleSave() {
    if (writePending.current || submissionStatus === 'success') return false;

    writePending.current = true;
    setSaveFailure(undefined);
    setSaveStatus('saving');
    try {
      await saveRoadPermitDraft(caseNumber, currentDraft);
      setSavedSnapshot(currentSnapshot);
      setSaveStatus('saved');
      return true;
    } catch (error) {
      setSaveFailure(getWriteFailure(error));
      setSaveStatus('idle');
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
      roadMarking,
      applicant: exampleApplicant,
      confirmed,
    };

    writePending.current = true;
    setSaveFailure(undefined);
    setSaveStatus('idle');
    setSubmissionFailure(undefined);
    setSubmissionStatus('sending');
    try {
      await submitRoadPermitApplication(caseNumber, application);
      setSubmissionStatus('success');
    } catch (error) {
      setSubmissionFailure(
        getRejectedSelection(error, application) ?? getWriteFailure(error),
      );
      setSubmissionStatus('error');
    } finally {
      writePending.current = false;
    }
  }

  const rejectedSelection =
    typeof submissionFailure === 'object' ? submissionFailure : undefined;
  const rejectionStillSelected =
    rejectedSelection &&
    {
      municipality: currentDraft.municipalityName === rejectedSelection.value,
      material: currentDraft.materials.some(
        ({ type }) => type === rejectedSelection.value,
      ),
      trafficChange: currentDraft.roadMarking.trafficChanges.includes(
        rejectedSelection.value ?? '',
      ),
    }[rejectedSelection.field];

  return {
    handleSave,
    handleSubmit,
    hasUnsavedChanges,
    isWriting: saveStatus === 'saving' || submissionStatus === 'sending',
    rejectedSelection: rejectionStillSelected ? rejectedSelection : undefined,
    saveFailure,
    saveStatus,
    submissionFailure:
      typeof submissionFailure === 'string' ? submissionFailure : undefined,
    submissionStatus,
  };
}
