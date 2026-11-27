import type { SupportedApplicationType } from '../types/application.types.js';
import type { ApplicationType, Status } from '../types/prisma-enums.js';
import { apiClient } from './client.api.js';

/** Test-only: application as listed by the dev endpoints. */
export interface DevApplication {
  caseNumber: string;
  title: string;
  type: ApplicationType;
  status: Status;
  areaCount: number;
}

/**
 * Test-only: fetches all applications with their number of areas.
 * @returns The listed applications
 */
export function getDevApplications(): Promise<DevApplication[]> {
  return apiClient.get('/dev/applications');
}

/**
 * Test-only: creates a draft application.
 * @param type - The type of application to create
 * @returns The created application
 */
export function createDevApplication(
  type: SupportedApplicationType,
): Promise<DevApplication> {
  return apiClient.post('/dev/applications', { type });
}
