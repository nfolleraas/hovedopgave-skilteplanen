import { Alert, Box, Paper, Typography } from '@mui/material';
import {
  type Dispatch,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import {
  createContactPerson,
  updateContactPerson,
} from '../../../../api/contact-persons.api.js';
import {
  type ContactPersonEditAction,
  type ContactPersonEditState,
  type ContactPersonEntry,
  getActiveEntry,
  isDirty,
} from '../../../../features/contact-persons/contact-person-edit-state.js';
import {
  canEditContactPersons,
  getContactPersonFieldSet,
  toContactPersonInput,
  validateContactPerson,
} from '../../../../features/contact-persons/contact-person-validation.js';
import { usePendingFocus } from '../../../../hooks/use-pending-focus.js';
import type { WizardApplication } from '../../../../types/application.types.js';
import type {
  ContactPerson,
  ContactPersonActor,
  ContactPersonFormField,
} from '../../../../types/contact-person.types.js';
import { WizardFooter } from '../../components/wizard-footer.js';
import type { LeaveGuard } from '../step-props.js';
import { useLeaveGuard } from '../use-leave-guard.js';
import { ContactList } from './contact-list.js';
import { ContactPanel } from './contact-panel.js';
import { saveErrorMessage } from './contact-step-errors.js';
import {
  contactFieldId,
  contactListIds,
  contactPanelIds,
} from './contact-step-ids.js';
import { ContactsStepHeader } from './contacts-step-header.js';
import { DeleteContactDialog } from './delete-contact-dialog.js';
import { UnsavedChangesDialog } from './unsaved-changes-dialog.js';
import {
  type ContactNotice,
  useContactDeletion,
} from './use-contact-deletion.js';

interface ContactsStepProps {
  application: WizardApplication;
  /** The actors on the application. A contact person belongs to one. */
  actors: ContactPersonActor[];
  state: ContactPersonEditState;
  dispatch: Dispatch<ContactPersonEditAction>;
  /**
   * Shown inside another form, such as the road-permit form, which renders
   * the heading and the step navigation and checks the step itself.
   */
  embedded?: boolean;
  /** Lets the page save the open form when another step is chosen. */
  leaveGuard?: RefObject<LeaveGuard | null>;
  onBack?: () => void;
  onNext?: () => void;
}

/**
 * Contact persons on the application: create (UC-031), delete (UC-032) and
 * update (UC-033). The list is on the left and the form on the right.
 */
export function ContactsStep({
  application,
  actors,
  state,
  dispatch,
  embedded = false,
  leaveGuard,
  onBack,
  onNext,
}: ContactsStepProps) {
  const { t } = useTranslation();
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ContactPerson | null>(null);
  const [notice, setNotice] = useState<ContactNotice | null>(null);
  const [showMissing, setShowMissing] = useState(false);
  const missingRef = useRef<HTMLDivElement>(null);
  // Element to focus after the next render, e.g. when a button disappears.
  // It waits while a dialog holds focus.
  const setFocusId = usePendingFocus(
    state.pendingKey !== null || deleteTarget !== null,
  );

  const { type } = application;
  const fieldSet = getContactPersonFieldSet(type);
  const canEdit = canEditContactPersons(application.status);
  const active = getActiveEntry(state);
  const savedCount = state.entries.filter((entry) => entry.saved).length;
  const errors = state.draft ? validateContactPerson(type, state.draft) : {};
  const hasUnsavedChanges = isDirty(state);

  useEffect(() => {
    if (showMissing) missingRef.current?.focus();
  }, [showMissing]);

  // Warn before the tab is closed or reloaded with unsaved changes. Moving
  // between steps saves instead, through the leave guard below.
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [hasUnsavedChanges]);

  function nameOf(entry: ContactPersonEntry): string {
    return entry.saved?.name || t('contacts.newContact');
  }

  function actorName(actorId: string): string {
    return actors.find((actor) => actor.uuid === actorId)?.name ?? '';
  }

  /** When a contact person disappears, focus the next one or Add. */
  function focusAfterRemoving(key: string) {
    const saved = state.entries.filter((entry) => entry.saved);
    const index = saved.findIndex((entry) => entry.key === key);
    const remaining = saved.filter((entry) => entry.key !== key);
    const next = remaining[Math.min(index, remaining.length - 1)];
    setFocusId(next ? contactListIds.edit(next.key) : contactListIds.add);
  }

  /**
   * Saves the open form. Invalid input keeps the form open with the errors
   * shown and focus on the first invalid field (UC-031 F1–F4, UC-033
   * F1–F4). After saving, the form closes and focus moves to the contact
   * person's Edit button.
   */
  async function save(): Promise<boolean> {
    if (!active || !state.draft || isSaving) return false;

    const fieldErrors = validateContactPerson(type, state.draft);
    const [firstInvalid] = Object.keys(fieldErrors) as ContactPersonFormField[];
    if (firstInvalid) {
      dispatch({ type: 'showErrors' });
      setFocusId(contactFieldId(firstInvalid));
      return false;
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      const input = toContactPersonInput(type, state.draft);
      const contactPerson = active.saved
        ? await updateContactPerson(active.saved.uuid, input)
        : await createContactPerson(
            application.caseNumber,
            active.actorId,
            input,
          );
      dispatch({ type: 'saved', key: active.key, contactPerson });
      setFocusId(contactListIds.edit(contactPerson.uuid));
      setShowMissing(false);
      setNotice({
        severity: 'success',
        message: active.saved
          ? t('contacts.updated', { name: contactPerson.name })
          : t('contacts.created', { name: contactPerson.name }),
      });
      return true;
    } catch (error) {
      // The draft stays in state, so the user's input is kept (UC-033 F5).
      setSaveError(saveErrorMessage(t, error));
      setFocusId(contactPanelIds.title);
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  /**
   * Leaving the step saves the open form, so going back and forth shows
   * what is stored. Invalid input keeps the user on the step.
   */
  async function saveIfDirty(): Promise<boolean> {
    if (!isDirty(state)) return true;
    return await save();
  }

  useLeaveGuard(leaveGuard, saveIfDirty);

  async function handleBack() {
    if (await saveIfDirty()) onBack?.();
  }

  /** The application needs at least one contact person (UC-004 F7). */
  async function handleNext() {
    const savesNew = isDirty(state) && active !== undefined && !active.saved;
    if (!(await saveIfDirty())) return;
    if (savedCount + (savesNew ? 1 : 0) === 0) {
      setShowMissing(true);
      missingRef.current?.focus();
      return;
    }
    onNext?.();
  }

  function handleAdd() {
    const [firstActor] = actors;
    if (!firstActor) return;
    setSaveError(null);
    setNotice(null);
    setFocusId(contactPanelIds.title);
    dispatch({ type: 'addNew', actorId: firstActor.uuid });
  }

  function handleEdit(entry: ContactPersonEntry) {
    setSaveError(null);
    setNotice(null);
    // With unsaved changes, the reducer waits for the dialog instead.
    if (!isDirty(state)) setFocusId(contactPanelIds.title);
    dispatch({ type: 'open', key: entry.key });
  }

  function handleCancel() {
    if (!active) return;
    setSaveError(null);
    setFocusId(
      active.saved ? contactListIds.edit(active.key) : contactListIds.add,
    );
    dispatch({ type: 'cancel' });
  }

  const { isDeleting, deleteError, handleDelete, confirmDelete } =
    useContactDeletion({
      dispatch,
      savedCount,
      deleteTarget,
      setDeleteTarget,
      setNotice,
      focusAfterRemoving,
    });

  const pendingEntry = state.entries.find(
    (entry) => entry.key === state.pendingKey,
  );

  return (
    <Box
      aria-labelledby={embedded ? undefined : 'step-title'}
      component={embedded ? 'div' : 'section'}
    >
      <ContactsStepHeader
        canEdit={canEdit}
        embedded={embedded}
        notice={notice}
        onCloseNotice={() => setNotice(null)}
      />

      <Box
        sx={{
          alignItems: 'start',
          display: 'grid',
          gap: 2,
          gridTemplateColumns: {
            xs: 'minmax(0, 1fr)',
            lg: 'repeat(2, minmax(0, 1fr))',
          },
        }}
      >
        <ContactList
          activeKey={state.activeKey}
          actors={actors}
          addDisabled={hasUnsavedChanges || isSaving}
          canEdit={canEdit}
          entries={state.entries}
          onAdd={handleAdd}
          onDelete={handleDelete}
          onEdit={handleEdit}
        />
        {active && state.draft ? (
          <ContactPanel
            actorId={active.actorId}
            actors={actors}
            errors={errors}
            fieldSet={fieldSet}
            isNew={!active.saved}
            isSaving={isSaving}
            // A new form starts without "left field" errors.
            key={active.key}
            onActorChange={(actorId) => dispatch({ type: 'setActor', actorId })}
            onCancel={handleCancel}
            onChange={(field, value) =>
              dispatch({ type: 'change', field, value })
            }
            onSave={() => void save()}
            saveError={saveError}
            showAllErrors={state.showErrors}
            values={state.draft}
          />
        ) : (
          canEdit &&
          actors.length > 0 && (
            <Paper sx={{ backgroundColor: '#F5F5F5', p: 2 }} variant="outlined">
              <Typography color="text.secondary" variant="body2">
                {t('contacts.panelHint')}
              </Typography>
            </Paper>
          )
        )}
      </Box>

      {showMissing && savedCount === 0 && (
        <Alert ref={missingRef} severity="error" sx={{ mt: 3 }} tabIndex={-1}>
          {t('contacts.atLeastOne')}
        </Alert>
      )}

      {!embedded && (
        <WizardFooter
          busy={isSaving}
          onBack={() => void handleBack()}
          onNext={() => void handleNext()}
        />
      )}

      <DeleteContactDialog
        actorName={deleteTarget ? actorName(deleteTarget.actorId) : ''}
        contactPerson={deleteTarget}
        error={deleteError}
        isDeleting={isDeleting}
        onCancel={() => {
          // UC-032 A1: cancelling keeps the contact person.
          if (deleteTarget) {
            setFocusId(contactListIds.delete(deleteTarget.uuid));
          }
          setDeleteTarget(null);
        }}
        onConfirm={() => void confirmDelete()}
      />
      <UnsavedChangesDialog
        contactTitle={active ? nameOf(active) : ''}
        onCancel={() => {
          if (state.pendingKey) {
            setFocusId(contactListIds.edit(state.pendingKey));
          }
          dispatch({ type: 'cancelPending' });
        }}
        onDiscard={() => {
          setSaveError(null);
          setFocusId(contactPanelIds.title);
          dispatch({ type: 'discardAndOpenPending' });
        }}
        onSave={async () => {
          const saved = await save();
          // The reducer opens the waiting contact person after saving.
          if (saved) setFocusId(contactPanelIds.title);
          else dispatch({ type: 'cancelPending' });
        }}
        open={pendingEntry !== undefined}
      />
    </Box>
  );
}
