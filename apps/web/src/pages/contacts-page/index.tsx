import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Link,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useReducer, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiError } from '../../api/client.js';
import {
  createContactPerson,
  deleteContactPerson,
  getApplicationContactPersons,
  updateContactPerson,
} from '../../api/contact-persons.api.js';
import {
  type ContactPersonEntry,
  contactPersonEditReducer,
  getActiveEntry,
  initialContactPersonEditState,
  isDirty,
  nextNewKey,
} from '../../features/contact-persons/contact-person-edit-state.js';
import { actorRoleLabelKeys } from '../../features/contact-persons/contact-person-labels.js';
import {
  canEditContactPersons,
  getContactPersonFieldSet,
  toContactPersonInput,
  validateContactPerson,
} from '../../features/contact-persons/contact-person-validation.js';
import type {
  ContactPerson,
  ContactPersonActor,
  ContactPersonApplication,
} from '../../types/contact-person.types.js';
import { focusById } from '../../utils/focus-by-id.js';
import { ContactCard, contactCardIds } from './components/contact-card.js';
import { DeleteContactDialog } from './components/delete-contact-dialog.js';
import { DevApplicationList } from './components/dev-application-list.js';
import { labelAboveSlots } from './components/form-slots.js';
import { UnsavedChangesDialog } from './components/unsaved-changes-dialog.js';

const addButtonId = 'contacts-add-new';
const actorSelectId = 'contacts-new-actor';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; messageKey: string }
  | {
      status: 'ready';
      application: ContactPersonApplication;
      actors: ContactPersonActor[];
    };

interface Notice {
  severity: 'success' | 'error';
  message: string;
}

/** Reads the case number from `/kontaktpersoner?sag=<caseNumber>`. */
function getCaseNumber(): string | null {
  return new URLSearchParams(window.location.search).get('sag');
}

export default function ContactsPage() {
  const { t } = useTranslation();
  const [caseNumber] = useState(getCaseNumber);
  const [load, setLoad] = useState<LoadState>({ status: 'loading' });
  const [state, dispatch] = useReducer(
    contactPersonEditReducer,
    initialContactPersonEditState,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ContactPerson | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  // The actor chosen for the next new contact person (UC-040 step 7).
  const [selectedActorId, setSelectedActorId] = useState('');
  // Element to focus after the next render, e.g. when a button disappears.
  const [focusId, setFocusId] = useState<string | null>(null);

  useEffect(() => {
    if (!caseNumber) return;

    let isCurrent = true;
    getApplicationContactPersons(caseNumber)
      .then(({ application, actors, contactPersons }) => {
        if (!isCurrent) return;
        dispatch({ type: 'loaded', contactPersons });
        setLoad({ status: 'ready', application, actors });
      })
      .catch((error: unknown) => {
        if (!isCurrent) return;
        setLoad({
          status: 'error',
          messageKey:
            error instanceof ApiError && error.status === 404
              ? 'contacts.caseNotFound'
              : 'contacts.loadError',
        });
      });

    return () => {
      isCurrent = false;
    };
  }, [caseNumber]);

  // Wait until the element exists and no dialog holds focus.
  useEffect(() => {
    if (!focusId || state.pendingKey !== null || deleteTarget) return;
    if (focusById(focusId)) setFocusId(null);
  });

  // Test-only: without a case number, list applications to choose from.
  if (!caseNumber) {
    return (
      <main>
        <Container sx={{ py: 4 }}>
          <DevApplicationList />
        </Container>
      </main>
    );
  }

  const active = getActiveEntry(state);

  function titleFor(entry: ContactPersonEntry): string {
    const number = state.entries.indexOf(entry) + 1;
    const name =
      (entry.key === state.activeKey ? state.draft?.name : undefined) ||
      entry.saved?.name ||
      t('contacts.newContact');
    return t('contacts.cardTitle', { number, name });
  }

  /** When a contact disappears, focus the next card or the add button. */
  function focusAfterRemoving(key: string) {
    const index = state.entries.findIndex((entry) => entry.key === key);
    const remaining = state.entries.filter((entry) => entry.key !== key);
    const next = remaining[Math.min(index, remaining.length - 1)];
    setFocusId(next ? contactCardIds.title(next.key) : addButtonId);
  }

  function saveErrorMessage(error: unknown): string {
    if (error instanceof ApiError) {
      if (error.code === 'APPLICATION_NOT_EDITABLE') {
        return t('contacts.notEditable');
      }
      if (error.code === 'ACTOR_NOT_FOUND') {
        return t('contacts.actorNotFound');
      }
    }
    return t('contacts.saveError');
  }

  async function save(application: ContactPersonApplication): Promise<boolean> {
    if (!active || !state.draft || isSaving) return false;

    const errors = validateContactPerson(application.type, state.draft);
    if (Object.keys(errors).length > 0) {
      dispatch({ type: 'showErrors' });
      const [field] = Object.keys(errors);
      if (field) setFocusId(`contact-${active.key}-${field}`);
      return false;
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      const input = toContactPersonInput(application.type, state.draft);
      const contactPerson = active.saved
        ? await updateContactPerson(active.saved.uuid, input)
        : await createContactPerson(
            application.caseNumber,
            active.actorId,
            input,
          );
      dispatch({ type: 'saved', key: active.key, contactPerson });
      // A new contact gets a new key, so its card is replaced.
      setFocusId(contactCardIds.title(contactPerson.uuid));
      setNotice({
        severity: 'success',
        message: t('contacts.saved', { contact: titleFor(active) }),
      });
      return true;
    } catch (error) {
      // The draft stays in state, so the user's input is kept (UC-033 F5).
      setSaveError(saveErrorMessage(error));
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  function handleDelete(entry: ContactPersonEntry) {
    setNotice(null);
    if (!entry.saved) {
      focusAfterRemoving(entry.key);
      dispatch({ type: 'cancel' });
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
      // UC-032 F1: the contact person could not be deleted.
      setDeleteError(
        error instanceof ApiError && error.code === 'APPLICATION_NOT_EDITABLE'
          ? t('contacts.notEditable')
          : t('contacts.deleteError'),
      );
    } finally {
      setIsDeleting(false);
    }
  }

  function renderContacts(
    application: ContactPersonApplication,
    actors: ContactPersonActor[],
  ) {
    const fieldSet = getContactPersonFieldSet(application.type);
    const canEdit = canEditContactPersons(application.status);
    const pendingEntry = state.entries.find(
      (entry) => entry.key === state.pendingKey,
    );
    const newActorId = actors.some((actor) => actor.uuid === selectedActorId)
      ? selectedActorId
      : (actors[0]?.uuid ?? '');

    function actorLabel(actorId: string): string {
      const actor = actors.find((candidate) => candidate.uuid === actorId);
      return actor
        ? t('contacts.actorLabel', {
            name: actor.name,
            role: t(actorRoleLabelKeys[actor.role]),
          })
        : '';
    }

    return (
      <>
        <Typography component="h1" id="contacts-title" variant="h5">
          {t('contacts.title')}
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }} variant="body2">
          {t('contacts.subtitle', { caseNumber: application.caseNumber })}
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

        <Box sx={{ display: 'grid', gap: 2 }}>
          {state.entries.map((entry, index) => {
            const isExpanded = entry.key === state.activeKey;
            return (
              <ContactCard
                actorLabel={actorLabel(entry.actorId)}
                canEditApplication={canEdit}
                contactKey={entry.key}
                draft={isExpanded ? state.draft : null}
                errors={
                  isExpanded && state.showErrors && state.draft
                    ? validateContactPerson(application.type, state.draft)
                    : {}
                }
                fieldSet={fieldSet}
                isExpanded={isExpanded}
                isSaving={isSaving}
                key={entry.key}
                number={index + 1}
                onCancel={() => {
                  setSaveError(null);
                  // A new, unsaved contact disappears when cancelled.
                  if (!entry.saved) focusAfterRemoving(entry.key);
                  dispatch({ type: 'cancel' });
                }}
                onChange={(field, value) =>
                  dispatch({ type: 'change', field, value })
                }
                onDelete={() => handleDelete(entry)}
                onEdit={() => {
                  setSaveError(null);
                  // The Edit button disappears once the card is expanded.
                  setFocusId(contactCardIds.title(entry.key));
                  dispatch({ type: 'open', key: entry.key });
                }}
                onSave={() => void save(application)}
                saved={entry.saved}
                saveError={isExpanded ? saveError : null}
              />
            );
          })}
        </Box>

        {state.entries.length === 0 && (
          <Typography sx={{ mt: 1 }} variant="body2">
            {t('contacts.none')}
          </Typography>
        )}

        {/* A contact person belongs to an actor on the application. */}
        {canEdit && actors.length === 0 && (
          <Typography id={addButtonId} sx={{ mt: 2 }} tabIndex={-1}>
            {t('contacts.noActors')}
          </Typography>
        )}
        {canEdit && actors.length > 0 && (
          <Box
            sx={{
              alignItems: 'end',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 2,
              mt: 2,
            }}
          >
            <TextField
              disabled={isDirty(state)}
              id={actorSelectId}
              label={t('contacts.actor')}
              onChange={(event) => setSelectedActorId(event.target.value)}
              select
              slotProps={labelAboveSlots}
              sx={{ minWidth: 260 }}
              value={newActorId}
            >
              {actors.map((actor) => (
                <MenuItem key={actor.uuid} value={actor.uuid}>
                  {actorLabel(actor.uuid)}
                </MenuItem>
              ))}
            </TextField>
            <Button
              disabled={isDirty(state)}
              id={addButtonId}
              onClick={() => {
                setSaveError(null);
                setNotice(null);
                setFocusId(contactCardIds.title(nextNewKey(state)));
                dispatch({ type: 'addNew', actorId: newActorId });
              }}
              variant="outlined"
            >
              {t('contacts.addContact')}
            </Button>
          </Box>
        )}

        <DeleteContactDialog
          actorLabel={deleteTarget ? actorLabel(deleteTarget.actorId) : ''}
          contactPerson={deleteTarget}
          error={deleteError}
          isDeleting={isDeleting}
          onCancel={() => {
            // UC-032 A1: cancelling keeps the contact person.
            if (deleteTarget) {
              setFocusId(contactCardIds.delete(deleteTarget.uuid));
            }
            setDeleteTarget(null);
          }}
          onConfirm={() => void confirmDelete()}
        />
        <UnsavedChangesDialog
          contactTitle={active ? titleFor(active) : ''}
          onCancel={() => {
            if (state.pendingKey) {
              setFocusId(contactCardIds.edit(state.pendingKey));
            }
            dispatch({ type: 'cancelPending' });
          }}
          onDiscard={() => {
            setSaveError(null);
            dispatch({ type: 'discardAndOpenPending' });
          }}
          onSave={async () => {
            const pendingKey = state.pendingKey;
            const saved = await save(application);
            if (saved && pendingKey) {
              setFocusId(contactCardIds.title(pendingKey));
            }
            if (!saved) dispatch({ type: 'cancelPending' });
          }}
          open={pendingEntry !== undefined}
        />
      </>
    );
  }

  return (
    <main>
      <Container sx={{ py: 4 }}>
        {load.status === 'loading' && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress aria-label={t('contacts.loading')} />
          </Box>
        )}
        {load.status === 'error' && (
          <Alert severity="error">{t(load.messageKey)}</Alert>
        )}
        {load.status === 'ready' &&
          renderContacts(load.application, load.actors)}
        {/* Test-only shortcut back to the list of applications. */}
        <Link href="/kontaktpersoner" sx={{ display: 'block', mt: 4 }}>
          {t('devApplications.backToList')}
        </Link>
      </Container>
    </main>
  );
}
