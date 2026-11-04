import type { ApplicationAreas, Area, AreaInput } from '../types/area.types.js';
import { apiClient } from './client.js';

export function getApplicationAreas(
  applicationId: string,
): Promise<ApplicationAreas> {
  const query = new URLSearchParams({ applicationId });
  return apiClient.get(`/areas?${query}`);
}

export function createAreas(
  applicationId: string,
  areas: AreaInput[],
): Promise<Area[]> {
  return apiClient.post('/areas/bulk', { applicationId, areas });
}

export function createArea(
  applicationId: string,
  area: AreaInput,
): Promise<Area> {
  return apiClient.post('/areas', { applicationId, ...area });
}

export function updateArea(id: string, area: AreaInput): Promise<Area> {
  return apiClient.patch(`/areas/${encodeURIComponent(id)}`, area);
}

export function deleteArea(id: string): Promise<void> {
  return apiClient.delete(`/areas/${encodeURIComponent(id)}`);
}
