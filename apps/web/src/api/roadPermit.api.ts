import type { RoadPermitApplication } from '../pages/application-page/create-road-permit/RoadPermitApplication.types';
import { apiClient } from './client.api';

/** Posts a road-permit application and propagates request failures to the caller. */
export async function createRoadPermitApplication(
  roadUseApplication: RoadPermitApplication,
) {
  await apiClient.post('apitestststst/road-permit', roadUseApplication);
}
