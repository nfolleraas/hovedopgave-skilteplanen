import { isAxiosError } from 'axios';
import type {
  RoadPermitApplication,
  RoadPermitDraft,
  RoadPermitDraftSnapshot,
} from '../pages/application-page/create-road-permit/RoadPermitApplication.types';
import { apiClient } from './client.api';

export type ApplicationDraftSummary = {
  caseNumber: string;
  title: string;
  canResume: boolean;
};

/** Loads the application drafts shown on the development overview. */
export function listApplicationDrafts() {
  return apiClient.get<ApplicationDraftSummary[]>('/road-permit/drafts');
}

/** Creates an empty application with Draft status. */
export function createRoadPermitDraft() {
  return apiClient.post<{ caseNumber: string }>('/road-permit', {});
}

/** Restores the saved values for this case number. */
export async function getRoadPermitDraft(caseNumber: string) {
  try {
    const response = await apiClient.get<{
      roadPermitDraft: RoadPermitDraftSnapshot;
    }>(`/road-permit/${encodeURIComponent(caseNumber)}`);
    return { status: 'loaded', draft: response.roadPermitDraft } as const;
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 422) {
      return { status: 'invalid' } as const;
    }
    throw error;
  }
}

/** Saves the current form, including unfinished material edits. */
export async function saveRoadPermitDraft(
  caseNumber: string,
  draft: RoadPermitDraft,
) {
  await apiClient.patch(
    `/road-permit/${encodeURIComponent(caseNumber)}`,
    draft,
  );
}

/** Submits the completed application against its existing case number. */
export async function submitRoadPermitApplication(
  caseNumber: string,
  application: RoadPermitApplication,
) {
  await apiClient.post(
    `/road-permit/${encodeURIComponent(caseNumber)}/submit`,
    application,
  );
}
