import i18n from '../config/i18n';
import type { RoadPermitApplication } from '../pages/application-page/create-road-permit/RoadPermitApplication.types';
import { apiClient } from './client.api';

export async function createRoadPermitApplication(
  roadUseApplication: RoadPermitApplication,
) {
  await apiClient.post('/api/road-permit', roadUseApplication);
  return i18n.t('permit.summary.submissionSuccess');
}
