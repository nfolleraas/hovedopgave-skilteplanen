import {
  Alert,
  Button,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { type ReactElement, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getCaseWorkers } from '../../../api/case-workers.api.js';
import type { CaseWorker } from '../../../types/case-worker.types.js';
import CreateCaseWorkerForm from './create-case-worker-form.js';

/** Shows the municipality’s caseworkers and opens the creation form. */
export default function CaseWorkerList({
  municipalityId,
}: {
  municipalityId: number;
}): ReactElement {
  const { t, i18n } = useTranslation();
  const [workers, setWorkers] = useState<CaseWorker[]>();
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [creating, setCreating] = useState(false);
  const [createdName, setCreatedName] = useState<string>();

  // biome-ignore lint/correctness/useExhaustiveDependencies: Retry requests a fresh list without changing the municipality.
  useEffect(
    /** Fetches the list for this view and cancels it when the view closes. */
    function loadWorkers() {
      const controller = new AbortController();

      /** Rejects a list belonging to a different municipality than the URL. */
      async function load(): Promise<void> {
        try {
          const list = await getCaseWorkers(controller.signal);
          if (controller.signal.aborted) return;
          if (list.some((worker) => worker.municipalityId !== municipalityId)) {
            setLoadError(true);
            return;
          }
          setWorkers(list);
        } catch {
          if (!controller.signal.aborted) setLoadError(true);
        }
      }

      void load();
      /** Cancels the request when the effect is replaced or the page closes. */
      return function cancelRequest(): void {
        controller.abort();
      };
    },
    [municipalityId, loadAttempt],
  );

  /** Clears the error and requests the list again. */
  function retry(): void {
    setLoadError(false);
    setLoadAttempt((attempt) => attempt + 1);
  }

  /** Opens a fresh creation form. */
  function openForm(): void {
    setCreating(true);
    setCreatedName(undefined);
  }

  /** Closes the creation form. */
  function closeForm(): void {
    setCreating(false);
  }

  /** Displays the newly saved caseworker in the list. */
  function showCreated(worker: CaseWorker): void {
    setWorkers([...(workers ?? []), worker]);
    setCreatedName(worker.name);
    closeForm();
  }

  if (loadError) {
    return (
      <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
        <Alert severity="error">{t('caseworker.management.loadError')}</Alert>
        <Button onClick={retry} variant="outlined">
          {t('caseworker.management.retry')}
        </Button>
      </Stack>
    );
  }

  if (!workers)
    return (
      <Typography role="status">
        {t('caseworker.management.loading')}
      </Typography>
    );

  const sortedWorkers = workers.toSorted(
    /** Orders names in the current language and breaks ties by employee number. */
    (left, right) =>
      left.name.localeCompare(right.name, i18n.language) ||
      left.employeeNumber.localeCompare(right.employeeNumber),
  );

  return (
    <Stack spacing={3}>
      <Button
        onClick={openForm}
        sx={{ alignSelf: 'flex-start' }}
        variant="contained"
      >
        {t('caseworker.management.create')}
      </Button>
      {createdName && (
        <Alert role="status" severity="success">
          {t('caseworker.management.created', { name: createdName })}
        </Alert>
      )}
      {sortedWorkers.length === 0 ? (
        <Typography>{t('caseworker.management.empty')}</Typography>
      ) : (
        <TableContainer
          component={Paper}
          sx={{
            '& td': { overflowWrap: 'anywhere' },
            '& th, & td': { px: { xs: 1, sm: 2 } },
          }}
          variant="outlined"
        >
          <Table
            aria-label={t('caseworker.management.title')}
            sx={{ tableLayout: 'fixed' }}
          >
            <TableHead sx={{ bgcolor: '#F7F9FC' }}>
              <TableRow>
                <TableCell scope="col" sx={{ overflowWrap: 'anywhere' }}>
                  {t('caseworker.management.employeeNumber')}
                </TableCell>
                <TableCell scope="col">
                  {t('caseworker.management.name')}
                </TableCell>
                <TableCell scope="col" sx={{ width: '34%' }}>
                  {t('caseworker.management.email')}
                </TableCell>
                <TableCell scope="col" sx={{ overflowWrap: 'anywhere' }}>
                  {t('caseworker.management.superUser')}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedWorkers.map(
                ({ employeeNumber, name, email, isSuperUser }) => (
                  <TableRow key={employeeNumber}>
                    <TableCell component="th" scope="row">
                      {employeeNumber}
                    </TableCell>
                    <TableCell>{name}</TableCell>
                    <TableCell>{email}</TableCell>
                    <TableCell>
                      {isSuperUser
                        ? t('caseworker.management.yes')
                        : t('caseworker.management.no')}
                    </TableCell>
                  </TableRow>
                ),
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      {creating && (
        <CreateCaseWorkerForm onCancel={closeForm} onCreated={showCreated} />
      )}
    </Stack>
  );
}
