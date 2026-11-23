import type {
  CaseWorker,
  CaseWorkerInput,
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
): Promise<{ caseWorker: CaseWorker } | { duplicate: true }> {
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (response.status === 409) return { duplicate: true };
  if (!response.ok) throw new Error('Could not create caseworker');
  return { caseWorker: await response.json() };
}
