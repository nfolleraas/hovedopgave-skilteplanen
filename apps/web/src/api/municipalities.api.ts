import type {
  CreateMunicipality,
  Municipality,
  UpdateMunicipality,
} from '../types/municipality.types.js';

const API_URL = '/api/municipalities';

// Get a municipality by ID
export async function getMunicipality(
  id: number,
  signal?: AbortSignal,
): Promise<Municipality> {
  const response = await fetch(`${API_URL}/${id}`, { signal });

  if (!response.ok) {
    throw new Error('Kunne ikke hente kommunen');
  }

  return response.json();
}

// Create a new municipality
export async function createMunicipality(
  data: CreateMunicipality,
): Promise<Municipality> {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Kunne ikke oprette kommunen');
  }

  return response.json();
}

// Update an existing municipality
export async function updateMunicipality(
  id: number,
  data: UpdateMunicipality,
): Promise<Municipality> {
  const response = await fetch(`${API_URL}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Kunne ikke opdatere kommunen');
  }

  return response.json();
}
