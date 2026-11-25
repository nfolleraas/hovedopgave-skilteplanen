import { apiClient } from './client.api';

export type Municipality = {
  id: number;
  name: string;
};

/** Loads the municipality choices from the API. */
export async function getMunicipalities() {
  return await apiClient.get<Municipality[]>('/municipalities');
}
