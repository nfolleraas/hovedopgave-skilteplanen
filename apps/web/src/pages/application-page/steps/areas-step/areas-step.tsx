import { Button } from '@mui/material';
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
import { getApiErrorCode } from '../../../../api/client.api.js';
import {
  type AreaEditAction,
  type AreaEditState,
  type AreaEntry,
  getActiveEntry,
  isDirty,
  isRoadEditable,
  nextManualKey,
} from '../../../../features/areas/area-edit-state.js';
import {
  canDeleteArea,
  canEditAreas,
  getAreaFieldSet,
  toAreaInput,
  validateArea,
} from '../../../../features/areas/area-validation.js';
import { usePendingFocus } from '../../../../hooks/use-pending-focus.js';
import type { Area, AreaApplication } from '../../../../types/area.types.js';
import { WizardFooter } from '../../components/wizard-footer.js';
import { areaCardIds } from './area-card-ids.js';
import { AreaList } from './area-list.js';
import { areaTitleFor, getMissingFieldsItems } from './area-step-state.js';
import { type AreasNotice, AreasStepHeader } from './areas-step-header.js';
import { DeleteAreaDialog } from './delete-area-dialog.js';
import { MissingFieldsSummary } from './missing-fields-summary.js';
import { UnsavedChangesDialog } from './unsaved-changes-dialog.js';
import { useLeaveGuard } from './use-leave-guard.js';

const addButtonId = 'areas-add-manual';

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

/**
 * The areas step (UC-034–036): lists the areas of the application and lets
 * the user edit, save and delete them. Next is blocked while an area is
 * missing fields or has unsaved changes.
 * @param props - The application, edit state, leave guard and navigation
 * handlers
 * @returns The rendered step
 */
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
  const [notice, setNotice] = useState<AreasNotice | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);
  // Element to focus after the next render, e.g. when a button disappears.
  // It waits while a dialog holds focus.
  const setFocusId = usePendingFocus(
    state.pendingKey !== null || deleteTarget !== null,
  );

  const { type } = application;
  const fieldSet = getAreaFieldSet(type);
  const canEdit = canEditAreas(application.status);
  const active = getActiveEntry(state);
  const savedCount = state.entries.filter((entry) => entry.saved).length;
  const titleFor = (entry: AreaEntry) => areaTitleFor(t, state, entry);

  // Areas start collapsed. A form only opens through "Redigér" or
  // "Indtast vej manuelt", and it closes again after "Gem område",
  // "Annuller", or when the step is left.

  useEffect(() => {
    if (showSummary) summaryRef.current?.focus();
  }, [showSummary]);

  /** When an area disappears, focus the next area or the add button. */
  function focusAfterRemoving(key: string) {
    const index = state.entries.findIndex((entry) => entry.key === key);
    const remaining = state.entries.filter((entry) => entry.key !== key);
    const next = remaining[Math.min(index, remaining.length - 1)];
    setFocusId(next ? areaCardIds.title(next.key) : addButtonId);
  }

  /**
   * Saves the open area. With `manageFocus`, focus moves to the first
   * invalid field or, after saving, to the area's heading. Leaving the step
   * does not manage focus, because the summary or next step takes it.
   */
  async function save({ manageFocus = false } = {}): Promise<boolean> {
    if (!active || !state.draft || isSaving) return false;

    const includeRoad = isRoadEditable(active);
    const errors = validateArea(type, state.draft, { includeRoad });
    if (Object.keys(errors).length > 0) {
      dispatch({ type: 'showErrors' });
      const [field] = Object.keys(errors);
      if (manageFocus && field) setFocusId(`area-${active.key}-${field}`);
      return false;
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      const input = toAreaInput(type, state.draft, { includeRoad });
      // Only manual roads are created here; searched roads come from the
      // map step. The API keeps the source so it survives a page reload.
      const area = active.saved
        ? await updateArea(active.saved.uuid, input)
        : await createArea(application.caseNumber, {
            ...input,
            isManual: includeRoad,
          });
      dispatch({ type: 'saved', key: active.key, area });
      // The saved area collapses and a new area gets a new key, so focus
      // moves to the area's Edit button, where the user can continue.
      if (manageFocus) setFocusId(areaCardIds.edit(area.uuid));
      setNotice({
        severity: 'success',
        message: t('areas.saved', { area: titleFor(active) }),
      });
      return true;
    } catch (error) {
      // The draft stays in state, so the user's input is kept.
      setSaveError(
        getApiErrorCode(error) === 'APPLICATION_NOT_EDITABLE'
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

  useLeaveGuard(leaveGuard, saveIfDirty);

  async function handleBack() {
    if (await saveIfDirty()) onBack();
  }

  function handleDelete(entry: AreaEntry) {
    setNotice(null);
    if (!entry.saved) {
      focusAfterRemoving(entry.key);
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
      focusAfterRemoving(deleteTarget.uuid);
      dispatch({ type: 'removed', key: deleteTarget.uuid });
      setNotice({
        severity: 'success',
        message: t('areas.deleted', { road: deleteTarget.roadName }),
      });
      setDeleteTarget(null);
    } catch (error) {
      setDeleteError(
        getApiErrorCode(error) === 'LAST_AREA'
          ? t('areas.lastAreaError')
          : getApiErrorCode(error) === 'APPLICATION_NOT_EDITABLE'
            ? t('areas.notEditable')
            : t('areas.deleteError'),
      );
    } finally {
      setIsDeleting(false);
    }
  }

  const summaryItems = getMissingFieldsItems(t, type, state);

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
      <AreasStepHeader
        canEdit={canEdit}
        notice={notice}
        onCloseNotice={() => setNotice(null)}
      />

      <AreaList
        canEdit={canEdit}
        dispatch={dispatch}
        fieldSet={fieldSet}
        isSaving={isSaving}
        onCancel={(entry) => {
          setSaveError(null);
          // The area collapses, so focus returns to its Edit button. A new,
          // unsaved area disappears.
          if (entry.saved) setFocusId(areaCardIds.edit(entry.key));
          else focusAfterRemoving(entry.key);
          dispatch({ type: 'cancel' });
        }}
        onDelete={handleDelete}
        onEdit={(entry) => {
          setSaveError(null);
          // The Edit button disappears once the card is expanded.
          setFocusId(areaCardIds.title(entry.key));
          dispatch({ type: 'open', key: entry.key });
        }}
        onSave={() => void save({ manageFocus: true })}
        saveError={saveError}
        state={state}
        type={type}
      />

      {canEdit && (
        <Button
          disabled={isDirty(state)}
          id={addButtonId}
          onClick={() => {
            setSaveError(null);
            setFocusId(areaCardIds.title(nextManualKey(state)));
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
        onCancel={() => {
          if (deleteTarget) {
            setFocusId(areaCardIds.delete(deleteTarget.uuid));
          }
          setDeleteTarget(null);
        }}
        onConfirm={() => void confirmDelete()}
      />
      {/* Focus on the pending area's heading was requested by its Edit button. */}
      <UnsavedChangesDialog
        areaTitle={active ? titleFor(active) : ''}
        onCancel={() => {
          if (state.pendingKey) {
            setFocusId(areaCardIds.edit(state.pendingKey));
          }
          dispatch({ type: 'cancelPending' });
        }}
        onDiscard={() => {
          setSaveError(null);
          dispatch({ type: 'discardAndOpenPending' });
        }}
        onSave={async () => {
          const pendingKey = state.pendingKey;
          const saved = await save({ manageFocus: true });
          if (saved && pendingKey) {
            setFocusId(areaCardIds.title(pendingKey));
          }
          if (!saved) dispatch({ type: 'cancelPending' });
        }}
        open={pendingEntry !== undefined}
      />
    </section>
  );
}
