import type {
  ApplicationAreas,
  Area,
  AreaCreateInput,
  AreaInput,
} from '../types/area.types.js';
import { apiClient } from './client.api.js';

/**
 * Fetches an application and all of its areas.
 * @param applicationId - The case number of the application
 * @returns The application and its areas
 */
export function getApplicationAreas(
  applicationId: string,
): Promise<ApplicationAreas> {
  const query = new URLSearchParams({ applicationId });
  return apiClient.get(`/areas?${query}`);
}

/**
 * Creates several areas for an application in one request.
 * @param applicationId - The case number of the application
 * @param areas - The areas to create
 * @returns The created areas
 */
export function createAreas(
  applicationId: string,
  areas: AreaCreateInput[],
): Promise<Area[]> {
  return apiClient.post('/areas/bulk', { applicationId, areas });
}

/**
 * Creates one area for an application.
 * @param applicationId - The case number of the application
 * @param area - The area to create
 * @returns The created area
 */
export function createArea(
  applicationId: string,
  area: AreaCreateInput,
): Promise<Area> {
  return apiClient.post('/areas', { applicationId, ...area });
}

/**
 * Updates an area and its details.
 * @param id - The ID of the area
 * @param area - The area fields to save
 * @returns The updated area
 */
export function updateArea(id: string, area: AreaInput): Promise<Area> {
  return apiClient.patch(`/areas/${encodeURIComponent(id)}`, area);
}

/**
 * Deletes an area.
 * @param id - The ID of the area
 * @returns A promise that resolves when the area is deleted
 */
export function deleteArea(id: string): Promise<void> {
  return apiClient.delete(`/areas/${encodeURIComponent(id)}`);
}
