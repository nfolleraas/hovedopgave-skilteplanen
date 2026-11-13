import type {
  RoadPermitApplication,
  RoadPermitDraft,
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
  const response = await apiClient.get<{
    roadPermitDraft: Partial<RoadPermitDraft>;
  }>(`/road-permit/${encodeURIComponent(caseNumber)}`);
  return response.roadPermitDraft;
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
