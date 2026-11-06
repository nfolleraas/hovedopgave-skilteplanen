import { Alert, Box, Button, Typography } from '@mui/material';
import {
  type Dispatch,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import {
  createArea,
  deleteArea,
  updateArea,
} from '../../../../api/areas.api.js';
import { ApiError } from '../../../../api/client.js';
import {
  type AreaEditAction,
  type AreaEditState,
  type AreaEntry,
  getActiveEntry,
  isDirty,
  isRoadEditable,
} from '../../../../features/areas/area-edit-state.js';
import { areaFieldLabelKeys } from '../../../../features/areas/area-labels.js';
import {
  type AreaFieldErrors,
  canDeleteArea,
  canEditAreas,
  emptyAreaFormValues,
  getAreaFieldSet,
  toAreaFormValues,
  toAreaInput,
  validateArea,
} from '../../../../features/areas/area-validation.js';
import type {
  Area,
  AreaApplication,
  AreaFormField,
} from '../../../../types/area.types.js';
import { WizardFooter } from '../../components/wizard-footer.js';
import { AreaCard } from './area-card.js';
import { DeleteAreaDialog } from './delete-area-dialog.js';
import {
  type MissingFieldsItem,
  MissingFieldsSummary,
} from './missing-fields-summary.js';
import { UnsavedChangesDialog } from './unsaved-changes-dialog.js';

interface Notice {
  severity: 'success' | 'error';
  message: string;
}

/** Runs before the step is left. Resolves false to stay on the step. */
export type LeaveGuard = () => Promise<boolean>;

interface AreasStepProps {
  application: AreaApplication;
  state: AreaEditState;
  dispatch: Dispatch<AreaEditAction>;
  /** Lets the page save the open area when another step is chosen. */
  leaveGuard: RefObject<LeaveGuard | null>;
  onBack: () => void;
  onNext: () => void;
}

export function AreasStep({
  application,
  state,
  dispatch,
  leaveGuard,
  onBack,
  onNext,
}: AreasStepProps) {
  const { t } = useTranslation();
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Area | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);

  const { type } = application;
  const fieldSet = getAreaFieldSet(type);
  const canEdit = canEditAreas(application.status);
  const active = getActiveEntry(state);
  const savedCount = state.entries.filter((entry) => entry.saved).length;

  function errorsFor(entry: AreaEntry): AreaFieldErrors {
    const values =
      entry.key === state.activeKey && state.draft
        ? state.draft
        : entry.saved
          ? toAreaFormValues(entry.saved)
          : emptyAreaFormValues;
    return validateArea(type, values, { includeRoad: isRoadEditable(entry) });
  }

  // Saved values decide whether a collapsed area is missing information.
  function savedErrorsFor(entry: AreaEntry): AreaFieldErrors {
    const values = entry.saved
      ? toAreaFormValues(entry.saved)
      : emptyAreaFormValues;
    return validateArea(type, values, { includeRoad: isRoadEditable(entry) });
  }

  function titleFor(entry: AreaEntry): string {
    const number = state.entries.indexOf(entry) + 1;
    const road =
      (entry.key === state.activeKey ? state.draft?.roadName : undefined) ||
      entry.saved?.roadName ||
      t('areas.newRoad');
    return t('areas.cardTitle', { number, road });
  }

  // Expand the first area that needs information when the step opens.
  // biome-ignore lint/correctness/useExhaustiveDependencies: only on open.
  useEffect(() => {
    if (state.activeKey || !canEdit) return;
    const first =
      state.entries.find(
        (entry) => Object.keys(savedErrorsFor(entry)).length > 0,
      ) ?? state.entries[0];
    if (first) dispatch({ type: 'open', key: first.key });
  }, []);

  useEffect(() => {
    if (showSummary) summaryRef.current?.focus();
  }, [showSummary]);

  async function save(): Promise<boolean> {
    if (!active || !state.draft || isSaving) return false;

    const includeRoad = isRoadEditable(active);
    const errors = validateArea(type, state.draft, { includeRoad });
    if (Object.keys(errors).length > 0) {
      dispatch({ type: 'showErrors' });
      focusFirstError(active.key, errors);
      return false;
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      const input = toAreaInput(type, state.draft, { includeRoad });
      const area = active.saved
        ? await updateArea(active.saved.uuid, input)
        : await createArea(application.caseNumber, input);
      dispatch({ type: 'saved', key: active.key, area });
      setNotice({
        severity: 'success',
        message: t('areas.saved', { area: titleFor(active) }),
      });
      return true;
    } catch (error) {
      // The draft stays in state, so the user's input is kept.
      setSaveError(
        error instanceof ApiError && error.code === 'APPLICATION_NOT_EDITABLE'
          ? t('areas.notEditable')
          : t('areas.saveError'),
      );
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  /**
   * Leaving the step saves the open area to the database, so going back
   * and forth shows what is stored. Invalid input keeps the user here.
   */
  async function saveIfDirty(): Promise<boolean> {
    if (!isDirty(state)) return true;
    const saved = await save();
    if (!saved) setShowSummary(true);
    return saved;
  }

  useEffect(() => {
    leaveGuard.current = saveIfDirty;
  });
  // biome-ignore lint/correctness/useExhaustiveDependencies: unmount only.
  useEffect(
    () => () => {
      leaveGuard.current = null;
    },
    [],
  );

  async function handleBack() {
    if (await saveIfDirty()) onBack();
  }

  function handleDelete(entry: AreaEntry) {
    setNotice(null);
    if (!entry.saved) {
      dispatch({ type: 'cancel' });
      return;
    }
    if (!canDeleteArea(savedCount)) {
      setNotice({ severity: 'error', message: t('areas.lastAreaError') });
      return;
    }
    setDeleteError(null);
    setDeleteTarget(entry.saved);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteArea(deleteTarget.uuid);
      dispatch({ type: 'removed', key: deleteTarget.uuid });
      setNotice({
        severity: 'success',
        message: t('areas.deleted', { road: deleteTarget.roadName }),
      });
      setDeleteTarget(null);
    } catch (error) {
      setDeleteError(
        error instanceof ApiError && error.code === 'LAST_AREA'
          ? t('areas.lastAreaError')
          : error instanceof ApiError &&
              error.code === 'APPLICATION_NOT_EDITABLE'
            ? t('areas.notEditable')
            : t('areas.deleteError'),
      );
    } finally {
      setIsDeleting(false);
    }
  }

  const summaryItems: MissingFieldsItem[] = state.entries
    .map((entry) => {
      const errors = errorsFor(entry);
      const isUnsaved =
        !entry.saved || (entry.key === state.activeKey && isDirty(state));
      return {
        key: entry.key,
        areaTitle: titleFor(entry),
        fieldLabels: (Object.keys(errors) as AreaFormField[]).map((field) =>
          t(areaFieldLabelKeys[field]),
        ),
        isUnsaved,
      };
    })
    .filter((item) => item.fieldLabels.length > 0 || item.isUnsaved);

  async function handleNext() {
    const savedKey = isDirty(state) ? state.activeKey : null;
    if (!(await saveIfDirty())) return;

    // The area saved above no longer blocks the step, even though this
    // render still shows its old state.
    const blocking = summaryItems.filter((item) => item.key !== savedKey);
    const savedSoFar =
      savedCount + (savedKey !== null && !active?.saved ? 1 : 0);

    if (blocking.length > 0 || savedSoFar === 0) {
      setShowSummary(true);
      summaryRef.current?.focus();
      // Show the field errors in the first area that blocks the step.
      const first = blocking[0];
      if (first && first.key !== state.activeKey) {
        dispatch({ type: 'open', key: first.key });
      }
      dispatch({ type: 'showErrors' });
      return;
    }
    setShowSummary(false);
    onNext();
  }

  const pendingEntry = state.entries.find(
    (entry) => entry.key === state.pendingKey,
  );

  return (
    <section aria-labelledby="step-title">
      <Typography component="h1" id="step-title" sx={{ mb: 2 }} variant="h5">
        {t('areas.title')}
      </Typography>
      {!canEdit && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t('areas.notEditable')}
        </Alert>
      )}

      <Box aria-live="polite" role="status">
        {notice && (
          <Alert
            onClose={() => setNotice(null)}
            severity={notice.severity}
            sx={{ mb: 2 }}
          >
            {notice.message}
          </Alert>
        )}
      </Box>

      <Box sx={{ display: 'grid', gap: 2 }}>
        {state.entries.map((entry, index) => {
          const isExpanded = entry.key === state.activeKey;
          return (
            <AreaCard
              areaKey={entry.key}
              canEditApplication={canEdit}
              draft={isExpanded ? state.draft : null}
              errors={isExpanded && state.showErrors ? errorsFor(entry) : {}}
              fieldSet={fieldSet}
              isExpanded={isExpanded}
              isMissingFields={Object.keys(savedErrorsFor(entry)).length > 0}
              isSaving={isSaving}
              key={entry.key}
              number={index + 1}
              onCancel={() => {
                setSaveError(null);
                dispatch({ type: 'cancel' });
              }}
              onChange={(field, value) =>
                dispatch({ type: 'change', field, value })
              }
              onDelete={() => handleDelete(entry)}
              onEdit={() => {
                setSaveError(null);
                dispatch({ type: 'open', key: entry.key });
              }}
              onSave={() => void save()}
              roadEditable={isRoadEditable(entry)}
              roadName={
                isExpanded && isRoadEditable(entry)
                  ? (state.draft?.roadName ?? '')
                  : (entry.saved?.roadName ?? '')
              }
              roadOwnership={entry.saved?.roadOwnership ?? ''}
              saveError={isExpanded ? saveError : null}
            />
          );
        })}
      </Box>

      {canEdit && (
        <Button
          disabled={isDirty(state)}
          onClick={() => {
            setSaveError(null);
            dispatch({ type: 'addManual' });
          }}
          sx={{ mt: 2 }}
          variant="outlined"
        >
          {t('areas.addManually')}
        </Button>
      )}

      {showSummary && (summaryItems.length > 0 || savedCount === 0) && (
        <MissingFieldsSummary
          hasNoAreas={savedCount === 0}
          items={summaryItems}
          ref={summaryRef}
        />
      )}

      <WizardFooter
        busy={isSaving}
        onBack={() => void handleBack()}
        onNext={() => void handleNext()}
      />

      <DeleteAreaDialog
        area={deleteTarget}
        error={deleteError}
        isDeleting={isDeleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
      />
      <UnsavedChangesDialog
        areaTitle={active ? titleFor(active) : ''}
        onCancel={() => dispatch({ type: 'cancelPending' })}
        onDiscard={() => {
          setSaveError(null);
          dispatch({ type: 'discardAndOpenPending' });
        }}
        onSave={async () => {
          const saved = await save();
          if (!saved) dispatch({ type: 'cancelPending' });
        }}
        open={pendingEntry !== undefined}
      />
    </section>
  );
}

function focusFirstError(areaKey: string, errors: AreaFieldErrors): void {
  const [field] = Object.keys(errors);
  if (field) {
    document.getElementById(`area-${areaKey}-${field}`)?.focus();
  }
}
