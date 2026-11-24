import type {
  CaseWorker,
  CaseWorkerInput,
  CaseWorkerUpdateInput,
} from '../types/case-worker.types.js';

const apiUrl = '/api/case-workers';

/** Loads the sagsbehandlere available to the current superuser. */
export async function getCaseWorkers(
  signal: AbortSignal,
): Promise<CaseWorker[]> {
  const response = await fetch(apiUrl, { signal });
  if (!response.ok) throw new Error('Could not load caseworkers');
  return response.json();
}

/** Creates a caseworker and reports a duplicate separately from other errors. */
export async function createCaseWorker(
  input: CaseWorkerInput,
): Promise<
  { caseWorker: CaseWorker } | { duplicate: 'employeeNumber' | 'email' }
> {
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (response.status === 409) {
    const body = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    return {
      duplicate: body?.message?.toLowerCase().includes('email')
        ? 'email'
        : 'employeeNumber',
    };
  }
  if (!response.ok) throw new Error('Could not create caseworker');
  return { caseWorker: await response.json() };
}

/** Updates a caseworker and returns the saved details. */
export async function updateCaseWorker(
  employeeNumber: string,
  input: CaseWorkerUpdateInput,
): Promise<CaseWorker> {
  const response = await fetch(`${apiUrl}/${employeeNumber}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!response.ok) throw new Error('Could not update caseworker');
  return response.json();
}

/** Deletes a caseworker and releases their assigned applications. */
export async function deleteCaseWorker(employeeNumber: string): Promise<void> {
  const response = await fetch(`${apiUrl}/${employeeNumber}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = new Error('Could not delete caseworker');
    error.name = `HttpError${response.status}`;
    throw error;
  }
}
