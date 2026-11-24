import { Alert, Box, Paper, Typography } from '@mui/material';
import { isAxiosError } from 'axios';
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
  deleteContactPerson,
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
  canDeleteContactPerson,
  canEditContactPersons,
  getContactPersonFieldSet,
  toContactPersonInput,
  validateContactPerson,
} from '../../../../features/contact-persons/contact-person-validation.js';
import type { WizardApplication } from '../../../../types/application.types.js';
import type {
  ContactPerson,
  ContactPersonActor,
  ContactPersonFormField,
} from '../../../../types/contact-person.types.js';
import { focusById } from '../../../../utils/focus-by-id.js';
import { WizardFooter } from '../../components/wizard-footer.js';
import type { LeaveGuard } from '../step-props.js';
import { contactFieldId } from './contact-form.js';
import { ContactList, contactListIds } from './contact-list.js';
import { ContactPanel, contactPanelIds } from './contact-panel.js';
import { DeleteContactDialog } from './delete-contact-dialog.js';
import { UnsavedChangesDialog } from './unsaved-changes-dialog.js';

interface Notice {
  severity: 'success' | 'error';
  message: string;
}

interface ContactsStepProps {
  application: WizardApplication;
  /** The actors on the application. A contact person belongs to one. */
  actors: ContactPersonActor[];
  state: ContactPersonEditState;
  dispatch: Dispatch<ContactPersonEditAction>;
  /** Lets the page save the open form when another step is chosen. */
  leaveGuard: RefObject<LeaveGuard | null>;
  onBack: () => void;
  onNext: () => void;
}

/** The status and error code (such as `LAST_CONTACT_PERSON`) the API sent. */
function apiFailure(error: unknown): { status?: number; code?: string } {
  if (!isAxiosError<{ code?: string }>(error)) return {};
  return { status: error.response?.status, code: error.response?.data?.code };
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
  leaveGuard,
  onBack,
  onNext,
}: ContactsStepProps) {
  const { t } = useTranslation();
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ContactPerson | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [showMissing, setShowMissing] = useState(false);
  const missingRef = useRef<HTMLDivElement>(null);
  // Element to focus after the next render, e.g. when a button disappears.
  const [focusId, setFocusId] = useState<string | null>(null);

  const { type } = application;
  const fieldSet = getContactPersonFieldSet(type);
  const canEdit = canEditContactPersons(application.status);
  const active = getActiveEntry(state);
  const savedCount = state.entries.filter((entry) => entry.saved).length;
  const errors = state.draft ? validateContactPerson(type, state.draft) : {};
  const hasUnsavedChanges = isDirty(state);

  // Wait until the element exists and no dialog holds focus.
  useEffect(() => {
    if (!focusId || state.pendingKey !== null || deleteTarget) return;
    if (focusById(focusId)) setFocusId(null);
  });

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

  /** A specific message for each error the API can send (UC-031 F5). */
  function saveErrorMessage(error: unknown): string {
    if (!isAxiosError(error)) return t('contacts.saveError');
    const { status, code } = apiFailure(error);
    switch (code) {
      case 'APPLICATION_NOT_EDITABLE':
        return t('contacts.notEditable');
      case 'ACTOR_NOT_FOUND':
        return t('contacts.actorNotFound');
      case 'CONTACT_PERSON_DUPLICATE':
        return t('contacts.duplicate');
      // Deleted in another tab while this one had it open.
      case 'CONTACT_PERSON_NOT_FOUND':
        return t('contacts.notFound');
      case 'APPLICATION_NOT_FOUND':
        return t('applicationWizard.caseNotFound');
      // The form checks the same rules, so this only happens if the rules
      // differ between the web app and the API.
      case 'CONTACT_PERSON_INVALID':
      case 'CONTACT_PERSON_FIELDS_NOT_ALLOWED':
        return t('contacts.rejectedByServer');
      default:
        return status === 400
          ? t('contacts.rejectedByServer')
          : t('contacts.saveError');
    }
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
      setSaveError(saveErrorMessage(error));
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

  /** The application needs at least one contact person (UC-004 F7). */
  async function handleNext() {
    const savesNew = isDirty(state) && active !== undefined && !active.saved;
    if (!(await saveIfDirty())) return;
    if (savedCount + (savesNew ? 1 : 0) === 0) {
      setShowMissing(true);
      missingRef.current?.focus();
      return;
    }
    onNext();
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

  function handleDelete(entry: ContactPersonEntry) {
    if (!entry.saved) return;
    setNotice(null);
    if (!canDeleteContactPerson(savedCount)) {
      setNotice({ severity: 'error', message: t('contacts.lastContactError') });
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
      await deleteContactPerson(deleteTarget.uuid);
      focusAfterRemoving(deleteTarget.uuid);
      dispatch({ type: 'removed', key: deleteTarget.uuid });
      setNotice({
        severity: 'success',
        message: t('contacts.deleted', { name: deleteTarget.name }),
      });
      setDeleteTarget(null);
    } catch (error) {
      // Deleted in another tab: the result is the same, so show it as done.
      const { code } = apiFailure(error);
      if (code === 'CONTACT_PERSON_NOT_FOUND') {
        focusAfterRemoving(deleteTarget.uuid);
        dispatch({ type: 'removed', key: deleteTarget.uuid });
        setNotice({
          severity: 'success',
          message: t('contacts.alreadyDeleted', { name: deleteTarget.name }),
        });
        setDeleteTarget(null);
        return;
      }
      setDeleteError(
        code === 'LAST_CONTACT_PERSON'
          ? t('contacts.lastContactError')
          : code === 'APPLICATION_NOT_EDITABLE'
            ? t('contacts.notEditable')
            : // UC-032 F4: the contact person could not be deleted.
              t('contacts.deleteError'),
      );
    } finally {
      setIsDeleting(false);
    }
  }

  const pendingEntry = state.entries.find(
    (entry) => entry.key === state.pendingKey,
  );

  return (
    <section aria-labelledby="step-title">
      <Typography
        component="h1"
        id="step-title"
        sx={{ mb: 1 }}
        tabIndex={-1}
        variant="h5"
      >
        {t('applicationWizard.steps.contactInfo')}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        {t('contacts.intro')}
      </Typography>
      {!canEdit && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t('contacts.notEditable')}
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

      <WizardFooter
        busy={isSaving}
        onBack={() => void handleBack()}
        onNext={() => void handleNext()}
      />

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
    </section>
  );
}
