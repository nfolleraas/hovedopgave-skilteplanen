import type { ApplicationType, Status } from '../types/prisma-enums.js';
import { apiClient } from './client.js';

/** Test-only: application as listed by the dev endpoints. */
export interface DevApplication {
  caseNumber: string;
  title: string;
  type: ApplicationType;
  status: Status;
  areaCount: number;
}

export function getDevApplications(): Promise<DevApplication[]> {
  return apiClient.get('/dev/applications');
}

export function createDevApplication(
  type: ApplicationType,
): Promise<DevApplication> {
  return apiClient.post('/dev/applications', { type });
}
